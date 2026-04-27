import type { CmsConnector, ConnectorConfig, ConnectorPage, PagePayload } from "./types";

/**
 * WordPress REST API connector.
 *
 * Publishes pages via /wp-json/wp/v2/pages and maps SEO metadata
 * to Yoast SEO fields when available.
 */
function stripImagesWithPlaceholderSrc(html: string): string {
  const IMG_TAG = /<img\b(?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*\s*\/?>/gi;
  return html.replace(IMG_TAG, (tag) => {
    const srcMatch = tag.match(/\b(?:src|srcset|poster)\s*=\s*("([^"]*)"|'([^']*)')/i);
    const srcVal = srcMatch ? (srcMatch[2] ?? srcMatch[3] ?? "") : "";
    if (!srcMatch) return "";
    if (!srcVal.trim()) return "";
    if (/\{[^}]*\}/.test(srcVal)) return "";
    return tag;
  });
}

function sanitizeWordPressContent(content?: string): string | undefined {
  if (typeof content !== "string") return content;

  let sanitized = content
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

  sanitized = stripImagesWithPlaceholderSrc(sanitized);

  sanitized = sanitized
    .replace(/^\s*["']?\s*(?:alt|src|srcset|style|width|height|class|loading|decoding|sizes|title)\s*=\s*["'][^"']*["'][^<>]*\/?>/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return sanitized || undefined;
}

function formatSlugAsTitle(slug?: string): string {
  if (!slug) return "";

  return slug
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveWordPressTitle(payload: Partial<PagePayload>): string {
  const candidates = [
    payload.title,
    payload.seo_title,
    formatSlugAsTitle(payload.slug),
    "Generated Page",
  ];

  return candidates.find((value) => typeof value === "string" && value.trim().length > 0)!.trim();
}

function isSoftaculousBlockedResponse(text: string): boolean {
  return text.includes("Softaculous Webuzo") || text.includes("Default Website Page");
}

async function getWordPressError(response: Response, action: string): Promise<string> {
  const errorText = await response.text();

  if (isSoftaculousBlockedResponse(errorText)) {
    return `WordPress ${action} failed: your host blocked unsupported HTML in the page body.`;
  }

  return `WordPress ${action} failed (${response.status}): ${errorText}`;
}

export class WordPressConnector implements CmsConnector {
  readonly type = "wordpress";
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(config: ConnectorConfig) {
    this.baseUrl = config.base_url.replace(/\/+$/, "");
    const credentials = btoa(`${config.username}:${config.password}`);
    this.headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    };
  }

  async createPage(payload: PagePayload): Promise<ConnectorPage> {
    const body = this.mapPayload(payload, true);
    const res = await fetch(`${this.baseUrl}/wp-json/wp/v2/pages`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(await getWordPressError(res, "publish"));
    }
    const data = await res.json();
    return {
      external_id: String(data.id),
      url: data.link,
      title: data.title?.rendered ?? resolveWordPressTitle(payload),
      status: data.status,
    };
  }

  async updatePage(externalId: string, payload: Partial<PagePayload>): Promise<ConnectorPage> {
    const body = this.mapPayload(payload, false);
    const res = await fetch(`${this.baseUrl}/wp-json/wp/v2/pages/${externalId}`, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(await getWordPressError(res, "update"));
    }
    const data = await res.json();
    return {
      external_id: String(data.id),
      url: data.link,
      title: data.title?.rendered ?? resolveWordPressTitle(payload),
      status: data.status,
    };
  }

  async getPage(externalId: string): Promise<ConnectorPage | null> {
    const res = await fetch(`${this.baseUrl}/wp-json/wp/v2/pages/${externalId}`, {
      headers: this.headers,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`WordPress getPage failed (${res.status})`);
    const data = await res.json();
    return {
      external_id: String(data.id),
      url: data.link,
      title: data.title?.rendered ?? "",
      status: data.status,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/wp-json/wp/v2/users/me?context=edit`, {
        headers: this.headers,
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private mapPayload(payload: Partial<PagePayload>, isCreate: boolean): Record<string, unknown> {
    const body: Record<string, unknown> = {};

    if (isCreate || payload.title || payload.seo_title) {
      body.title = resolveWordPressTitle(payload);
    }

    if (isCreate || typeof payload.content === "string") {
      body.content = sanitizeWordPressContent(payload.content) || "<p></p>";
    }

    if (isCreate || payload.slug) {
      body.slug = payload.slug;
    }

    if (isCreate || payload.status) {
      body.status = payload.status;
    }

    if (payload.excerpt) body.excerpt = payload.excerpt;

    const meta: Record<string, unknown> = {};
    if (payload.seo_title) meta._yoast_wpseo_title = payload.seo_title;
    if (payload.seo_description) meta._yoast_wpseo_metadesc = payload.seo_description;
    if (payload.canonical_url) meta._yoast_wpseo_canonical = payload.canonical_url;
    if (Object.keys(meta).length > 0) body.meta = meta;

    if (payload.custom_fields) {
      body.meta = { ...(body.meta as Record<string, unknown>), ...payload.custom_fields };
    }

    return body;
  }
}
