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
}

const CONNECTOR_TIMEOUT_MS = 25_000;
const CONNECTOR_PUBLISH_TIMEOUT_MS = 70_000;
const CONNECTOR_CSS_REFRESH_TIMEOUT_MS = 20_000;
export const REQUIRED_3XV_CONNECTOR_VERSION = "1.1.8";

interface ConnectorPingResponse {
  ok: boolean;
  plugin?: string;
  version?: string;
  elementor_active?: boolean;
  capabilities?: Record<string, boolean>;
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

export class PgpConnector implements CmsConnector {
  readonly type = "wordpress";
  private baseUrl: string;
  private apiKey: string;
  private restBase: string;
  // Basic-auth header for the (optional) listing fallback over standard WP REST.
  private basicAuth?: string;

  constructor(config: ConnectorConfig) {
    this.baseUrl = config.base_url.replace(/\/+$/, "");
    this.apiKey = (config.connector_api_key || "").trim();
    this.restBase = `${this.baseUrl}/wp-json/pgp/v1`;
    if (config.username && config.password) {
      this.basicAuth = "Basic " + btoa(`${config.username}:${config.password}`);
    }
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

  private async call<T>(path: string, method: string, body?: unknown, timeoutMs = CONNECTOR_TIMEOUT_MS): Promise<T> {
    const url = new URL(`${this.restBase}${path}`);
    // Some WordPress hosts/security plugins strip custom auth headers before
    // PHP sees them. Keep the headers, but also send the connector key as a
    // request parameter so the companion plugin can authenticate reliably.
    url.searchParams.set("connector_key", this.apiKey);
    const requestBody = body && typeof body === "object"
      ? { ...(body as Record<string, unknown>), connector_key: this.apiKey }
      : body;
    const res = await fetchWithTimeout(url.toString(), {
      method,
      headers: this.headers(),
      body: requestBody !== undefined ? JSON.stringify(requestBody) : undefined,
    }, timeoutMs);
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        throw this.connectorSetupError(path, res.status, text);
      }
      throw new Error(`PGP Connector ${method} ${path} failed (${res.status}): ${text}`);
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
      throw this.connectorSetupError(path, res.status, await res.text());
    }

    const data = (await res.json()) as ConnectorPingResponse;
    if (!data?.ok) {
      throw new Error("3xVisibility Connector pre-flight failed: plugin did not return a healthy response.");
    }

    const installedVersion = data.version || "0.0.0";
    if (compareVersions(installedVersion, REQUIRED_3XV_CONNECTOR_VERSION) < 0) {
      throw new Error(
        `3xVisibility Connector pre-flight failed: plugin version ${installedVersion} is active, ` +
        `but version ${REQUIRED_3XV_CONNECTOR_VERSION}+ is required. Update/reinstall the connector plugin, then retry publishing.`,
      );
    }

    if (data.elementor_active === false) {
      throw new Error("3xVisibility Connector pre-flight failed: Elementor is not active on this WordPress site.");
    }

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
    const format = payload.publish_format === "gutenberg" ? "gutenberg" : "elementor";
    const status = payload.status === "draft" ? "draft" : "publish";
    const title = payload.title || payload.seo_title || "Generated Page";
    const slug = payload.slug;
    const meta = this.buildMeta(payload);

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

    // Elementor: send the stored master JSON verbatim. The connector plugin owns
    // Media Library imports + attachment-id mapping inside the Elementor model.
    const elementorData = payload.elementor_data || "";
    const elementorCss = payload.elementor_css || "";
    const res = await this.call<PublishResponse>("/publish/elementor", "POST", {
      title,
      slug,
      status,
      post_id: postId,
      elementor_data: elementorData,
      elementor_css: elementorCss,
      page_template: payload.page_template || "elementor_header_footer",
      meta,
    }, CONNECTOR_PUBLISH_TIMEOUT_MS);
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
    // Force a fresh Elementor CSS rebuild + cache purge AFTER the page is saved,
    // so the live page picks up the new styling immediately (no stale CSS).
    await this.forceCssRefresh(res.post_id);
    return { external_id: String(res.post_id), url: res.url };
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
}
