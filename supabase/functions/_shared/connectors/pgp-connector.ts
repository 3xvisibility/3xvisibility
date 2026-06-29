/**
 * Page Generator Pro Connector (edge client)
 *
 * Routes publishing through the "Page Generator Pro Connector" WordPress plugin
 * (REST namespace `pgp/v1`) instead of the standard WP REST API. The plugin
 * saves native Elementor metadata, regenerates the per-page Elementor CSS, and
 * clears caches server-side — so a published page behaves exactly like one
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

interface MediaResponse {
  ok: boolean;
  id: number;
  url: string;
  duplicate?: boolean;
}

interface PublishResponse {
  ok: boolean;
  post_id: number;
  url: string;
  status: string;
}

const CONNECTOR_TIMEOUT_MS = 25_000;

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
  private mediaCache = new Map<string, string | null>();

  constructor(config: ConnectorConfig) {
    this.baseUrl = config.base_url.replace(/\/+$/, "");
    this.apiKey = config.connector_api_key || config.api_key || "";
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
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private async call<T>(path: string, method: string, body?: unknown): Promise<T> {
    const res = await fetchWithTimeout(`${this.restBase}${path}`, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PGP Connector ${method} ${path} failed (${res.status}): ${text}`);
    }
    return (await res.json()) as T;
  }

  async testConnection(): Promise<boolean> {
    try {
      const data = await this.call<{ ok: boolean }>("/ping", "GET");
      return Boolean(data?.ok);
    } catch {
      return false;
    }
  }

  /** Upload a remote image into the WP Media Library via the plugin (deduped). */
  private async uploadMedia(sourceUrl: string): Promise<string | null> {
    if (this.mediaCache.has(sourceUrl)) return this.mediaCache.get(sourceUrl)!;
    try {
      const filename = sourceUrl.split("/").pop()?.split("?")[0] || `image-${Date.now()}.jpg`;
      const data = await this.call<MediaResponse>("/media", "POST", {
        url: sourceUrl,
        filename,
      });
      const url = data?.ok ? data.url : null;
      this.mediaCache.set(sourceUrl, url);
      return url;
    } catch {
      this.mediaCache.set(sourceUrl, null);
      return null;
    }
  }

  /**
   * Upload every external image referenced inside the Elementor JSON and swap the
   * URLs for site-hosted Media Library URLs so the published page never points at
   * a broken/foreign URL. Template-only image policy: we only move existing
   * template images, we never invent new ones.
   */
  private async importImages(elementorJson: string): Promise<string> {
    if (!elementorJson) return elementorJson;
    const urls = new Set<string>();
    const re = /https?:\/\/[^\s"'\\)]+?\.(?:png|jpe?g|gif|webp|svg|avif|ico|bmp)(?:\?[^\s"'\\)]*)?/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(elementorJson)) !== null) {
      const u = m[0];
      if (!u.includes(this.baseUrl)) urls.add(u);
    }
    let out = elementorJson;
    const startedAt = Date.now();
    // Upload EVERY template image to the WP Media Library so the published page
    // never points at a foreign/broken URL. The plugin downloads each image
    // server-side (fast) and one page is published per invocation, so the time
    // budget is generous. A soft cap + time guard prevents runaway loops.
    for (const u of [...urls].slice(0, 60)) {
      if (Date.now() - startedAt > 90_000) break;
      const local = await this.uploadMedia(u);
      if (local) {
        out = out.split(JSON.stringify(u).slice(1, -1)).join(JSON.stringify(local).slice(1, -1));
      }
    }
    return out;
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

    // Elementor: prefer the stored master JSON; images go to the Media Library.
    let elementorData = payload.elementor_data || "";
    let elementorCss = payload.elementor_css || "";
    if (elementorData) {
      elementorData = await this.importImages(elementorData);
    }
    if (elementorCss) {
      elementorCss = await this.importImages(elementorCss);
    }
    const res = await this.call<PublishResponse>("/publish/elementor", "POST", {
      title,
      slug,
      status,
      post_id: postId,
      elementor_data: elementorData,
      elementor_css: elementorCss,
      page_template: payload.page_template || "elementor_header_footer",
      meta,
    });
    return { external_id: String(res.post_id), url: res.url };
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
