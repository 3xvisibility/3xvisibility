/**
 * Page Generator Pro Connector (edge client)
 *
 * Routes publishing through the "Page Generator Pro Connector" WordPress plugin
 * (REST namespace `pgp/v1`) instead of the standard WP REST API. The plugin
 * saves native Elementor metadata via Elementor's document lifecycle, imports
 * template images into the Media Library, maps attachment IDs, regenerates CSS,
 * and clears caches server-side — so a published page behaves exactly like one
 * built and saved manually inside the Elementor editor.
 *
 *   SaaS edge fn  ->  PgpConnector  ->  /wp-json/pgp/v1/*  ->  Elementor / Gutenberg
 *
 * Auth: the shared key is sent in the `X-PGP-Key` header.
 */
import type {
  CmsConnector,
  ConnectorConfig,
  ConnectorResult,
  ContentItem,
  PagePayload,
} from "./types.ts";
import { WordPressConnector } from "./wordpress.ts";

interface PublishResponse {
  ok: boolean;
  post_id: number;
  url: string;
  status: string;
  elementor_data_valid?: boolean;
  elementor_data_hash?: string;
  elements?: number;
  editor_ready?: boolean;
  editable_widgets?: number;
  edit_mode?: string;
  editor_attempts?: number;
}

const CONNECTOR_TIMEOUT_MS = 25_000;
const CONNECTOR_PUBLISH_TIMEOUT_MS = 120_000;
const CONNECTOR_CSS_REFRESH_TIMEOUT_MS = 20_000;
export const REQUIRED_3XV_CONNECTOR_VERSION = "1.3.7";
export const TEMPLATE_LIBRARY_IMPORT_VERSION = "1.4.1";
const COMPRESSED_PAYLOAD_CONNECTOR_VERSION = "1.3.7";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function friendlyConnectorHttpError(method: string, path: string, status: number, rawBody: string): string {
  const text = stripHtml(rawBody || "");
  const lower = `${rawBody} ${text}`.toLowerCase();
  const serverLabel = lower.includes("litespeed") ? "LiteSpeed" : "WordPress";

  if (status === 503 || status === 504) {
    return (
      `3xVisibility WordPress Connector ${method} ${path} failed (${status}): ${serverLabel} temporarily stopped the publish request. ` +
      "This usually happens when the host is busy or PHP/REST limits are hit while saving Elementor. " +
      "I reduced exact-render payloads and made media syncing asynchronous; please retry publishing once. " +
      "If it still fails, increase PHP memory/time limits or ask the host to allow long wp-json requests."
    );
  }

  if (status === 413 || lower.includes("request entity too large") || lower.includes("payload too large")) {
    return (
      `3xVisibility WordPress Connector ${method} ${path} failed (${status}): the WordPress server rejected the Elementor payload as too large. ` +
      "Use the latest connector and retry; exact-render CSS is now sent only once to reduce request size."
    );
  }

  const detail = text ? text.slice(0, 700) : "no detail returned";
  return `3xVisibility WordPress Connector ${method} ${path} failed (${status}): ${detail}`;
}

interface ConnectorPingResponse {
  ok: boolean;
  plugin?: string;
  version?: string;
  elementor_active?: boolean;
  capabilities?: Record<string, boolean>;
}

function supportsCompressedPayloads(info: ConnectorPingResponse | null | undefined): boolean {
  if (!info?.version) return false;
  if (info.capabilities?.compressed_payloads === true) return true;
  return compareVersions(info.version, COMPRESSED_PAYLOAD_CONNECTOR_VERSION) >= 0;
}

function compareVersions(a = "0.0.0", b = "0.0.0"): number {
  const pa = a.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const pb = b.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = CONNECTOR_TIMEOUT_MS): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`3xVisibility WordPress Connector request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function gzipBase64(input: string): Promise<string | null> {
  if (!input || typeof CompressionStream === "undefined") return null;
  const stream = new Blob([new TextEncoder().encode(input)])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export class PgpConnector implements CmsConnector {
  readonly type = "wordpress";
  private baseUrl: string;
  private apiKey: string;
  private restBase: string;
  private preflightInfo: ConnectorPingResponse | null = null;
  private standardFallback?: WordPressConnector;
  // Basic-auth header for the (optional) listing fallback over standard WP REST.
  private basicAuth?: string;

  constructor(config: ConnectorConfig) {
    this.baseUrl = config.base_url.replace(/\/+$/, "");
    this.apiKey = (config.connector_api_key || "").trim();
    this.restBase = `${this.baseUrl}/wp-json/pgp/v1`;
    if (config.access_token || (config.username && config.password)) {
      this.standardFallback = new WordPressConnector(config);
    }
    if (config.username && config.password) {
      this.basicAuth = "Basic " + btoa(`${config.username}:${config.password}`);
    }
  }

  private standardFallbackPreflight(reason: string): ConnectorPingResponse {
    const data: ConnectorPingResponse = {
      ok: true,
      plugin: "standard-wordpress-rest",
      version: "0.0.0",
      elementor_active: false,
      capabilities: { standard_rest_fallback: true },
    };
    console.warn(`[3xVisibility Connector] ${reason}; using standard WordPress REST compatibility mode.`);
    this.preflightInfo = data;
    return data;
  }

  private shouldUseStandardFallback(info: ConnectorPingResponse | null | undefined, payload: Partial<PagePayload>): boolean {
    // Native-retry pass: never drop to the direct-publish REST fallback.
    if (payload.force_native) return false;
    if (!this.standardFallback || !payload.content) return false;
    if (!info) return true;
    if (info.capabilities?.standard_rest_fallback === true) return true;
    if (info.elementor_active === false) return true;
    return compareVersions(info.version || "0.0.0", REQUIRED_3XV_CONNECTOR_VERSION) < 0;
  }

  private async publishViaStandardFallback(payload: Partial<PagePayload>, postId?: number): Promise<ConnectorResult> {
    if (!this.standardFallback || !payload.content) {
      throw new Error("WordPress standard REST fallback is unavailable: Application Password or JWT credentials are missing.");
    }
    const fallbackPayload = { ...payload, wordpress_fallback_html: true } as Partial<PagePayload>;
    delete fallbackPayload.elementor_data;
    delete fallbackPayload.elementor_css;
    delete fallbackPayload.elementor_mode;
    if (postId) return this.standardFallback.updatePage(String(postId), fallbackPayload);
    return this.standardFallback.createPage(fallbackPayload as PagePayload);
  }

  private headers(): Record<string, string> {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-PGP-Key": this.apiKey,
      "X-3XV-Key": this.apiKey,
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private async call<T>(path: string, method: string, body?: unknown, timeoutMs = CONNECTOR_TIMEOUT_MS, retryTransient = false): Promise<T> {
    const url = new URL(`${this.restBase}${path}`);
    // Some WordPress hosts/security plugins strip custom auth headers before
    // PHP sees them. Keep the headers, but also send the connector key as a
    // request parameter so the companion plugin can authenticate reliably.
    url.searchParams.set("connector_key", this.apiKey);
    const requestBody = body && typeof body === "object"
      ? { ...(body as Record<string, unknown>), connector_key: this.apiKey }
      : body;
    let res: Response | null = null;
    let lastText = "";
    const maxAttempts = retryTransient ? 2 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      res = await fetchWithTimeout(url.toString(), {
        method,
        headers: this.headers(),
        body: requestBody !== undefined ? JSON.stringify(requestBody) : undefined,
      }, timeoutMs);
      if (res.ok) {
        return (await res.json()) as T;
      }
      lastText = await res.text();
      const transient = res.status === 502 || res.status === 503 || res.status === 504 || res.status === 429;
      if (!retryTransient || !transient || attempt >= maxAttempts) break;
      await sleep(1_500 * attempt);
    }
    if (!res || !res.ok) {
      if (!res) {
        throw new Error(`3xVisibility WordPress Connector ${method} ${path} failed: no response from WordPress.`);
      }
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        throw this.connectorSetupError(path, res.status, lastText);
      }
      throw new Error(friendlyConnectorHttpError(method, path, res.status, lastText));
    }
    return (await res.json()) as T;
  }

  private connectorSetupError(path: string, status: number, detail: string): Error {
    if (status === 401 || status === 403) {
      return new Error(
        "3xVisibility Connector pre-flight failed: invalid or missing Connector API Key. " +
        "Copy the key from WordPress → Settings → 3xVisibility WordPress Connector and save it in this website connection.",
      );
    }
    if (status === 404) {
      return new Error(
        "3xVisibility Connector pre-flight failed: plugin endpoint was not found. " +
        "Install and activate the 3xVisibility WordPress Connector plugin, then retry publishing.",
      );
    }
    return new Error(`3xVisibility Connector pre-flight failed on ${path} (${status}): ${detail || "no detail returned"}`);
  }

  async preflight(): Promise<ConnectorPingResponse> {
    if (!this.apiKey) {
      throw new Error(
        "3xVisibility Connector pre-flight failed: Connector API Key is missing. " +
        "Install the connector plugin and paste its API key into the website settings before publishing.",
      );
    }

    const path = "/ping";
    const url = new URL(`${this.restBase}${path}`);
    url.searchParams.set("connector_key", this.apiKey);
    const res = await fetchWithTimeout(url.toString(), { method: "GET", headers: this.headers() });
    if (!res.ok) {
      if (this.standardFallback && (res.status === 401 || res.status === 403 || res.status === 404)) {
        return this.standardFallbackPreflight(`plugin pre-flight returned ${res.status}`);
      }
      throw this.connectorSetupError(path, res.status, await res.text());
    }

    const data = (await res.json()) as ConnectorPingResponse;
    if (!data?.ok) {
      if (this.standardFallback) return this.standardFallbackPreflight("plugin did not return a healthy response");
      throw new Error("3xVisibility Connector pre-flight failed: plugin did not return a healthy response.");
    }

    const installedVersion = data.version || "0.0.0";
    if (compareVersions(installedVersion, REQUIRED_3XV_CONNECTOR_VERSION) < 0) {
      console.warn(
        `[3xVisibility Connector] plugin ${installedVersion} is older than ${REQUIRED_3XV_CONNECTOR_VERSION}; ` +
        "publishing will use compatibility mode instead of blocking.",
      );
    }

    if (data.elementor_active === false) {
      if (this.standardFallback) return this.standardFallbackPreflight("Elementor is not active");
      throw new Error("3xVisibility Connector pre-flight failed: Elementor is not active on this WordPress site.");
    }

    this.preflightInfo = data;
    return data;
  }

  async testConnection(): Promise<boolean> {
    const data = await this.preflight();
    return Boolean(data?.ok);
  }

  private buildMeta(payload: Partial<PagePayload>): Record<string, string> {
    const meta: Record<string, string> = {};
    if (payload.seo_title) meta._yoast_wpseo_title = payload.seo_title;
    if (payload.seo_description) meta._yoast_wpseo_metadesc = payload.seo_description;
    if (payload.canonical_url) meta._yoast_wpseo_canonical = payload.canonical_url;
    return meta;
  }

  private async publish(
    payload: Partial<PagePayload>,
    postId?: number,
  ): Promise<ConnectorResult> {
    const requested = payload.publish_format;
    const format = payload.wordpress_fallback_html || requested === "html"
      ? "html"
      : requested === "gutenberg"
        ? "gutenberg"
        : "elementor";
    const status = payload.status === "draft" ? "draft" : "publish";
    const title = payload.title || payload.seo_title || "Generated Page";
    const slug = payload.slug;
    const meta = this.buildMeta(payload);

    // Real code (HTML/CSS): publish the generated markup verbatim so the live
    // page matches the preview 1:1. Prefer the standard WordPress REST path
    // (full HTML body, no kses block filtering); when only the plugin key is
    // available, ship the HTML inside a core/html block.
    if (format === "html") {
      if (this.standardFallback && payload.content) {
        return this.publishViaStandardFallback(payload, postId);
      }
      const res = await this.call<PublishResponse>("/publish/gutenberg", "POST", {
        title,
        slug,
        status,
        post_id: postId,
        content: `<!-- wp:html -->\n${payload.content || ""}\n<!-- /wp:html -->`,
        meta,
      });
      return { external_id: String(res.post_id), url: res.url };
    }

    if (format === "gutenberg") {
      const res = await this.call<PublishResponse>("/publish/gutenberg", "POST", {
        title,
        slug,
        status,
        post_id: postId,
        content: payload.content || "",
        meta,
      });
      return { external_id: String(res.post_id), url: res.url };
    }


    // Elementor: send the stored master JSON. Exact-render pages can contain a
    // full HTML/CSS document, so compress large payload fields before sending to
    // WordPress; shared LiteSpeed hosts often reject oversized wp-json bodies as
    // 503 before PHP/plugin code can run.
    const elementorData = payload.elementor_data || "";
    const elementorCss = payload.elementor_css || "";
    const exactRender = payload.elementor_mode === "exact";
    const connectorInfo = this.preflightInfo ?? await this.preflight().catch(() => null);
    if (this.shouldUseStandardFallback(connectorInfo, payload)) {
      return this.publishViaStandardFallback(payload, postId);
    }
    const canCompressPayloads = supportsCompressedPayloads(connectorInfo);
    const body: Record<string, unknown> = {
      title,
      slug,
      status,
      post_id: postId,
      exact_render: exactRender,
      // Publish through the Elementor Library: the connector plugin first stores
      // the JSON as a native saved template, then re-imports it into the page so
      // every element becomes a fully-native, editable widget (1:1 design).
      save_as_template: true,
      // Automatic native-retry: tell the plugin to re-import only the widgets
      // that failed the prior editor-readiness check via the library pipeline.
      reimport_failed_widgets: payload.reimport_failed_widgets === true,
      page_template: payload.page_template || "elementor_header_footer",
      meta,
    };
    // Forward the template global palette / fonts so the connector can sync them
    // into the active Elementor kit (Site Settings globals).
    if (Array.isArray(payload.global_colors) && payload.global_colors.length > 0) {
      body.global_colors = payload.global_colors;
    }
    if (Array.isArray(payload.global_typography) && payload.global_typography.length > 0) {
      body.global_typography = payload.global_typography;
    }
    const compressedData = canCompressPayloads && typeof elementorData === "string" && (exactRender || elementorData.length > 150_000)
      ? await gzipBase64(elementorData).catch(() => null)
      : null;
    if (compressedData && compressedData.length < elementorData.length) {
      body.elementor_data_gzip = compressedData;
      body.elementor_data_encoding = "gzip+base64";
    } else {
      body.elementor_data = elementorData;
    }
    const compressedCss = canCompressPayloads && typeof elementorCss === "string" && elementorCss.length > 100_000
      ? await gzipBase64(elementorCss).catch(() => null)
      : null;
    if (compressedCss && compressedCss.length < elementorCss.length) {
      body.elementor_css_gzip = compressedCss;
      body.elementor_css_encoding = "gzip+base64";
    } else {
      body.elementor_css = elementorCss;
    }

    const res = await this.call<PublishResponse>("/publish/elementor", "POST", body, CONNECTOR_PUBLISH_TIMEOUT_MS, Boolean(postId));
    if (res.elementor_data_valid === false) {
      throw new Error("3xVisibility Connector publish failed: WordPress saved the page, but _elementor_data did not load back correctly.");
    }
    // Post-publish editor readiness: the page must open in "Edit with Elementor"
    // mode and contain editable widgets, otherwise publishing is not a success.
    if (res.editor_ready === false) {
      throw new Error("3xVisibility Connector publish failed: the page did not open in \"Edit with Elementor\" mode after publishing.");
    }
    if (typeof res.editable_widgets === "number" && res.editable_widgets < 1) {
      throw new Error("3xVisibility Connector publish failed: the published page has no editable Elementor widgets.");
    }
    // The connector plugin already regenerates CSS + purges page caches inside
    // /publish/elementor before returning. Do not run a second blocking refresh
    // here; on slower WordPress hosts that extra REST call was pushing publishes
    // past the edge timeout even after the page had saved successfully.
    return {
      external_id: String(res.post_id),
      url: res.url,
      editor_readiness: {
        status: "passed",
        reason: null,
        attempts: typeof res.editor_attempts === "number" ? res.editor_attempts : 1,
        editable_widgets: typeof res.editable_widgets === "number" ? res.editable_widgets : null,
        edit_mode: res.edit_mode ?? null,
        checked_at: new Date().toISOString(),
      },
    };
  }

  /**
   * Force Elementor to regenerate the per-page (and global) CSS for a published
   * page and purge runtime caches. Best-effort: a failure here never breaks the
   * publish, since the publish endpoint already regenerates CSS once.
   */
  private async forceCssRefresh(postId?: number): Promise<boolean> {
    if (!postId) return false;
    try {
      const res = await this.call<{ ok?: boolean }>("/regenerate-css", "POST", {
        post_id: postId,
      }, CONNECTOR_CSS_REFRESH_TIMEOUT_MS);
      return Boolean(res?.ok);
    } catch {
      return false;
    }
  }

  async createPage(payload: PagePayload): Promise<ConnectorResult> {
    return this.publish(payload);
  }

  async updatePage(externalId: string, payload: Partial<PagePayload>): Promise<ConnectorResult> {
    return this.publish(payload, Number(externalId) || undefined);
  }

  /**
   * Re-run the post-publish "Edit with Elementor" readiness check against an
   * already-published post, WITHOUT republishing. Used by the on-demand
   * "Re-check Elementor readiness" action in the Generated Pages view.
   */
  async recheckEditorReadiness(externalId: string): Promise<NonNullable<ConnectorResult["editor_readiness"]>> {
    const postId = Number(externalId) || undefined;
    if (!postId) {
      return {
        status: "unknown",
        reason: "This page has no WordPress post id to verify.",
        attempts: null,
        editable_widgets: null,
        edit_mode: null,
        checked_at: new Date().toISOString(),
      };
    }
    const res = await this.call<{
      ok?: boolean;
      editor_ready?: boolean;
      editable_widgets?: number;
      edit_mode?: string;
      reason?: string | null;
    }>("/validate-editor", "POST", { post_id: postId }, CONNECTOR_CSS_REFRESH_TIMEOUT_MS);
    const passed = res.editor_ready === true && (typeof res.editable_widgets !== "number" || res.editable_widgets >= 1);
    return {
      status: passed ? "passed" : "failed",
      reason: passed ? null : (res.reason || "The page did not pass the Edit with Elementor readiness check."),
      attempts: 1,
      editable_widgets: typeof res.editable_widgets === "number" ? res.editable_widgets : null,
      edit_mode: res.edit_mode ?? null,
      checked_at: new Date().toISOString(),
    };
  }

  /** Listing is not part of the plugin surface; fall back to standard WP REST. */
  async listContent(contentType: "pages" | "products"): Promise<ContentItem[]> {
    if (contentType !== "pages" || !this.basicAuth) return [];
    try {
      const res = await fetchWithTimeout(
        `${this.baseUrl}/wp-json/wp/v2/pages?per_page=100&context=edit&status=publish,draft`,
        { headers: { Accept: "application/json", Authorization: this.basicAuth } },
      );
      if (!res.ok) return [];
      const rows = (await res.json()) as Array<Record<string, unknown>>;
      return rows.map((p) => ({
        id: String(p.id),
        title: (p.title as { rendered?: string })?.rendered ?? "",
        slug: String(p.slug ?? ""),
        url: String(p.link ?? ""),
        type: "page" as const,
        status: String(p.status ?? ""),
        content: (p.content as { rendered?: string })?.rendered ?? "",
        excerpt: (p.excerpt as { rendered?: string })?.rendered ?? "",
        modified: String(p.modified ?? ""),
      }));
    } catch {
      return [];
    }
  }


  /* ----------------------------------------------------------------- */
  /* AI Action endpoints: menus / themes / page templates              */
  /* ----------------------------------------------------------------- */

  async listMenus(): Promise<{
    menus: Array<{ id: number; name: string; slug: string; count: number }>;
    locations: Array<{ slug: string; label: string; assigned_id: number }>;
  }> {
    const res = await this.call<{ menus?: any[]; locations?: any[] }>("/site-actions/menus", "GET");
    return { menus: res.menus ?? [], locations: res.locations ?? [] };
  }

  async assignMenu(location: string, menuId: number): Promise<{ location: string; menu_id: number }> {
    const res = await this.call<{ location: string; menu_id: number }>(
      "/site-actions/assign-menu",
      "POST",
      { location, menu_id: menuId },
    );
    return res;
  }

  async listThemes(): Promise<{
    active: string;
    themes: Array<{ stylesheet: string; name: string; version: string; is_block: boolean; active: boolean }>;
  }> {
    const res = await this.call<{ active?: string; themes?: any[] }>("/site-actions/themes", "GET");
    return { active: res.active ?? "", themes: res.themes ?? [] };
  }

  async activateTheme(stylesheet: string): Promise<{ active: string }> {
    return await this.call<{ active: string }>("/site-actions/activate-theme", "POST", { stylesheet });
  }

  async listPageTemplates(): Promise<{ templates: Array<{ slug: string; name: string }> }> {
    const res = await this.call<{ templates?: any[] }>("/site-actions/page-templates", "GET");
    return { templates: res.templates ?? [] };
  }

  async setPageTemplate(postId: number, template: string): Promise<{ post_id: number; template: string }> {
    return await this.call<{ post_id: number; template: string }>(
      "/site-actions/set-page-template",
      "POST",
      { post_id: postId, template },
    );
  }

  /**
   * Re-apply the template global colors + typography into the site's active
   * Elementor kit (Site Settings > Global Colors / Global Fonts) WITHOUT
   * republishing any page. `global_colors` / `global_typography` are the
   * aggregated palette/fonts to install as global tokens.
   */
  async applyGlobals(input: {
    global_colors?: Array<{ id?: string; title?: string; value: string }>;
    global_typography?: Array<{ id?: string; title?: string; family: string; weight?: string }>;
    regenerate_css?: boolean;
  }): Promise<{ ok: boolean; colors: number; fonts: number }> {
    const res = await this.call<{ ok?: boolean; colors?: number; fonts?: number }>(
      "/site-actions/apply-globals",
      "POST",
      {
        global_colors: input.global_colors ?? [],
        global_typography: input.global_typography ?? [],
        regenerate_css: input.regenerate_css !== false,
      },
    );
    return { ok: Boolean(res.ok), colors: res.colors ?? 0, fonts: res.fonts ?? 0 };
  }
}

