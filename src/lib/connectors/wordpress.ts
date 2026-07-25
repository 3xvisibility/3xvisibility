import type { CmsConnector, ConnectorConfig, ConnectorPage, PagePayload } from "./types";
import { adaptHtmlForWordPressTheme } from "./wordpress-theme-adapter";
import { buildElementorMeta } from "./elementor-engine";

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


/**
 * v1 is HTML/CSS-only: the published page must keep the exact CSS + JS the
 * preview used. WordPress post_content cannot be relied on to keep <link
 * rel="stylesheet"> tags, so external stylesheets are folded into an
 * `@import` block inside a real <style> tag (which survives), and scripts are
 * preserved instead of stripped.
 */
function preserveDesignAssets(html: string): string {
  if (!html) return html;
  const imports: string[] = [];
  let out = html.replace(/<link\b[^>]*>/gi, (tag) => {
    // Bundled page assets (data-xxxv-asset) stay as real <link> tags — the
    // connector plugin whitelists them, so they load the exact preview CSS.
    if (/data-xxxv-asset/i.test(tag)) return tag;
    const isSheet = /rel\s*=\s*["']?stylesheet/i.test(tag);
    const href = tag.match(/href\s*=\s*("([^"]*)"|'([^']*)')/i);
    const url = href ? (href[2] ?? href[3] ?? "") : "";
    if (isSheet && url && !/\{[^}]*\}/.test(url)) {
      imports.push(`@import url("${url.replace(/"/g, "%22")}");`);
    }
    return "";
  });
  if (imports.length > 0) {
    out = `<style>\n${[...new Set(imports)].join("\n")}\n</style>\n${out}`;
  }
  return out;
}


/**
 * Extract the design CSS + inline JS from template HTML so it can be shipped as
 * post meta (`_xxxv_template_css` / `_xxxv_template_js`) alongside the body.
 */
export function extractDesignAssets(html: string): { css: string; js: string } {
  if (!html) return { css: "", js: "" };
  const cssParts: string[] = [];
  const jsParts: string[] = [];

  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) continue;
    const href = tag.match(/href\s*=\s*("([^"]*)"|'([^']*)')/i);
    const url = href ? (href[2] ?? href[3] ?? "") : "";
    if (url && !/\{[^}]*\}/.test(url)) cssParts.push(`@import url("${url.replace(/"/g, "%22")}");`);
  }
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    if (m[1]?.trim()) cssParts.push(m[1].trim());
  }
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1] || "";
    if (/type\s*=\s*["'][^"']*(ld\+json|application\/json)/i.test(attrs)) continue;
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (m[2]?.trim()) jsParts.push(m[2].trim());
  }

  const imports = cssParts.filter((c) => c.startsWith("@import"));
  const rules = cssParts.filter((c) => !c.startsWith("@import"));
  return {
    css: [...new Set(imports), ...rules].join("\n").trim(),
    js: jsParts.join("\n;\n").trim(),
  };
}



function sanitizeWordPressContent(content?: string, keepDesign = true): string | undefined {
  if (typeof content !== "string") return content;
  if (keepDesign) content = preserveDesignAssets(content);

  let sanitized = content
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    // Keep template JS (it drives reveal/animation states); drop only JSON-LD
    // blocks, which the CMS owns.
    .replace(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");

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
      const themed = adaptHtmlForWordPressTheme(payload.content || "", payload.product_data ? "product" : "page");
      const safeContent = sanitizeWordPressContent(themed) || "<p></p>";
      body.content = safeContent;
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
    // Ship template CSS/JS as meta as well: WordPress strips <style>/<script>
    // from REST content for users without `unfiltered_html`, and the connector
    // plugin re-prints these meta values so live output matches the preview.
    if (typeof body.content === "string") {
      const design = extractDesignAssets(body.content);
      if (design.css) meta._xxxv_template_css = design.css;
      if (design.js) meta._xxxv_template_js = design.js;
    }
    if (Object.keys(meta).length > 0) body.meta = meta;

    // WordPress Template Compatibility Engine: convert HTML into a native,
    // editable Elementor layout (pages only — Shopify keeps plain HTML).
    if (!payload.preserve_design && !payload.product_data && typeof payload.content === "string" && payload.content) {
      body.meta = { ...(body.meta as Record<string, unknown>), ...buildElementorMeta(payload.content) };
    }

    if (payload.custom_fields) {
      body.meta = { ...(body.meta as Record<string, unknown>), ...payload.custom_fields };
    }

    return body;
  }
}
