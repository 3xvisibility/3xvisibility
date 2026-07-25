import type { CmsConnector, ConnectorConfig, ConnectorResult, ContentItem, PagePayload } from "./types.ts";
import { buildSeoMetaRecord, extractSeoFieldsFromMeta } from "./seo-meta.ts";
import { adaptHtmlForWordPressTheme } from "./wordpress-theme-adapter.ts";
import { getThemeAssets, type ThemeAssets } from "./theme-assets.ts";
import { buildElementorMeta } from "./elementor-engine.ts";
import { readSiteContext, type SiteContext } from "./wp-site-context.ts";
import { htmlToGutenberg } from "./gutenberg-engine.ts";
import { importHtmlAssets } from "./asset-import.ts";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function stripImagesWithPlaceholderSrc(html: string): string {
  // Match a full <img ...> tag (including quoted attributes that may contain '>'
  // and optional self-closing '/>'). Use a tolerant attribute matcher so we
  // never leave orphan attribute fragments like `" alt="..." />` in the output.
  const IMG_TAG = /<img\b(?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*\s*\/?>/gi;
  return html.replace(IMG_TAG, (tag) => {
    // Drop the image only if its src/srcset/poster still contains an unresolved
    // {variable} placeholder OR is empty/missing. Otherwise keep it.
    const srcMatch = tag.match(/\b(?:src|srcset|poster)\s*=\s*("([^"]*)"|'([^']*)')/i);
    const srcVal = srcMatch ? (srcMatch[2] ?? srcMatch[3] ?? "") : "";
    if (!srcMatch) return ""; // no src at all → drop
    if (!srcVal.trim()) return ""; // empty src → drop
    if (/\{[^}]*\}/.test(srcVal)) return ""; // unresolved placeholder → drop
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
 * Pull the design CSS + JS out of the template HTML so it can also be shipped as
 * post meta (`_xxxv_template_css` / `_xxxv_template_js`). WordPress runs
 * `wp_kses_post()` on REST content for users without `unfiltered_html`, which
 * silently removes <style> and <script>; the connector plugin re-prints these
 * meta values on the live page, so the published output keeps the preview design.
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
    if (m[1] && m[1].trim()) cssParts.push(m[1].trim());
  }
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1] || "";
    if (/type\s*=\s*["'][^"']*(ld\+json|application\/json)/i.test(attrs)) continue;
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (m[2] && m[2].trim()) jsParts.push(m[2].trim());
  }

  // @import rules must come first inside a stylesheet.
  const imports = cssParts.filter((c) => c.startsWith("@import"));
  const rules = cssParts.filter((c) => !c.startsWith("@import"));
  return {
    css: [...new Set(imports), ...rules].join("\n").trim(),
    js: jsParts.join("\n;\n").trim(),
  };
}


/**
 * Read the bundled external asset URLs (data-xxxv-asset <link>/<script src>) out
 * of the published HTML so they can also travel as post meta. WordPress strips
 * these tags from REST content via `wp_kses_post()`; the connector plugin
 * re-enqueues them from meta on the live page.
 */
export function extractBundledAssetUrls(html: string): { cssUrl?: string; jsUrl?: string } {
  if (!html) return {};
  const css = html.match(/<link\b[^>]*data-xxxv-asset[^>]*>/i)?.[0];
  const js = html.match(/<script\b[^>]*data-xxxv-asset[^>]*>/i)?.[0];
  const url = (tag?: string, attr = "href") => {
    if (!tag) return undefined;
    const m = tag.match(new RegExp(attr + '\\s*=\\s*("([^"]*)"|\'([^\']*)\')', "i"));
    const v = m ? (m[2] ?? m[3] ?? "") : "";
    return v.trim() || undefined;
  };
  return { cssUrl: url(css, "href"), jsUrl: url(js, "src") };
}


function sanitizeWordPressContent(content?: string, keepDesign = true): string | undefined {
  if (typeof content !== "string") return content;
  if (keepDesign) content = preserveDesignAssets(content);

  let sanitized = content
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<meta\b[^>]*>/gi, "")
    // Keep bundled design assets (data-xxxv-asset) — they carry the page CSS.
    .replace(/<link\b[^>]*>/gi, (tag) => (/data-xxxv-asset/i.test(tag) ? tag : ""))
    // Keep template JS (it drives reveal/animation states); drop only JSON-LD
    // blocks, which the CMS owns.
    .replace(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");

  sanitized = stripImagesWithPlaceholderSrc(sanitized);

  // Mop up orphan attribute fragments left over from earlier mangled <img> tags,
  // e.g. `" alt="Foo" style="..." />` sitting alone in the markup.
  sanitized = sanitized
    .replace(/^\s*["']?\s*(?:alt|src|srcset|style|width|height|class|loading|decoding|sizes|title)\s*=\s*["'][^"']*["'][^<>]*\/?>/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return sanitized || undefined;
}

function formatSlugAsTitle(slug?: string): string {
  if (!slug) return "";

  return slugify(slug)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

  return `WordPress ${action} error [${response.status}]: ${errorText}`;
}

function isInvalidTemplateError(errorText: string): boolean {
  return errorText.includes('"code":"rest_invalid_param"')
    && errorText.includes('"template"');
}

const WORDPRESS_TIMEOUT_MS = 25_000;
const WORDPRESS_MAX_ATTEMPTS = 3;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524]);
const RETRYABLE_MARKER = "[retryable]";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function backoffDelayMs(attempt: number): number {
  // Exponential (1s, 2s, 4s…) capped at 8s with 30% jitter.
  const base = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
  const jitter = base * 0.3 * Math.random();
  return Math.round(base + jitter);
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

function isNetworkError(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err ?? "");
  return err instanceof TypeError
    || /network|fetch failed|ECONN|ENOTFOUND|EAI_AGAIN|socket hang up|reset/i.test(msg);
}

function makeRetryableError(message: string): Error {
  const e = new Error(`${RETRYABLE_MARKER} ${message}`);
  (e as any).retryable = true;
  return e;
}

async function wordpressFetch(url: string, init: RequestInit = {}, timeoutMs = WORDPRESS_TIMEOUT_MS): Promise<Response> {
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= WORDPRESS_MAX_ATTEMPTS; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: init.signal ?? ac.signal });
      if (!res.ok && RETRYABLE_STATUSES.has(res.status) && attempt < WORDPRESS_MAX_ATTEMPTS) {
        const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
        const delay = retryAfter ?? backoffDelayMs(attempt);
        console.warn(`[WP] retryable ${res.status} on attempt ${attempt}/${WORDPRESS_MAX_ATTEMPTS}, waiting ${delay}ms`);
        try { await res.body?.cancel(); } catch { /* ignore */ }
        clearTimeout(timer);
        await sleep(delay);
        continue;
      }
      return res;
    } catch (err: any) {
      lastErr = err;
      const isAbort = err?.name === "AbortError";
      const transient = isAbort || isNetworkError(err);
      if (!transient || attempt >= WORDPRESS_MAX_ATTEMPTS) {
        clearTimeout(timer);
        if (isAbort) {
          throw makeRetryableError(`WordPress request timed out after ${timeoutMs}ms (tried ${attempt}×). This is usually a temporary hosting/network hiccup — please retry.`);
        }
        if (transient) {
          throw makeRetryableError(`WordPress connection failed after ${attempt} attempts: ${err?.message || err}. Check that the site is reachable and retry.`);
        }
        throw err;
      }
      const delay = backoffDelayMs(attempt);
      console.warn(`[WP] transient error on attempt ${attempt}/${WORDPRESS_MAX_ATTEMPTS}: ${err?.message}, waiting ${delay}ms`);
      await sleep(delay);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error("WordPress request failed");
}


export class WordPressConnector implements CmsConnector {
  readonly type = "wordpress";
  private baseUrl: string;
  private headers: HeadersInit;
  private authString: string;

  constructor(config: ConnectorConfig) {
    this.baseUrl = config.base_url.replace(/\/+$/, "");




    // Support both Application Password (Basic) and JWT auth
    if (config.access_token) {
      this.authString = "";
      this.headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.access_token}`,
      };
    } else {
      this.authString = btoa(`${config.username}:${config.password}`);
      this.headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${this.authString}`,
      };
    }
  }

  private assetsPromise?: Promise<ThemeAssets>;
  /** Lazily fetch + cache the site's theme assets (fonts/styles) once per connector. */
  private themeAssets(): Promise<ThemeAssets> {
    if (!this.assetsPromise) this.assetsPromise = getThemeAssets(this.baseUrl);
    return this.assetsPromise;
  }

  private siteContextPromise?: Promise<SiteContext | undefined>;
  /**
   * Lazily read + cache the connected WordPress site's context (active theme,
   * Elementor globals/colors/fonts, container width, breakpoints) once per
   * connector so native Elementor output maps to the live site's design tokens.
   * Best-effort: returns undefined if the site blocks introspection.
   */
  private siteContext(): Promise<SiteContext | undefined> {
    if (!this.siteContextPromise) {
      this.siteContextPromise = readSiteContext(this.baseUrl, this.headers as Record<string, string>)
        .catch(() => undefined);
    }
    return this.siteContextPromise;
  }

  /** Cache of source URL -> uploaded Media Library URL to avoid re-uploading. */
  private mediaCache = new Map<string, string | null>();

  /**
   * Download a remote asset and upload it into the WordPress Media Library.
   * Returns the new Media Library URL, or null on failure (caller keeps original).
   */
  private async uploadMediaFromUrl(sourceUrl: string): Promise<string | null> {
    if (this.mediaCache.has(sourceUrl)) return this.mediaCache.get(sourceUrl)!;
    try {
      let res = await wordpressFetch(sourceUrl, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "Accept": "image/avif,image/webp,image/*,*/*;q=0.8" } }, 12_000);
      if (!res.ok) {
        this.mediaCache.set(sourceUrl, null);
        return null;
      }
      const contentType = res.headers.get("content-type") || "application/octet-stream";
      if (!/^image\/|^font\/|svg|octet-stream/i.test(contentType)) {
        this.mediaCache.set(sourceUrl, null);
        return null;
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      let filename = sourceUrl.split("/").pop()?.split("?")[0] || "asset";
      if (!/\.[a-z0-9]+$/i.test(filename)) {
        const ext = contentType.includes("svg") ? "svg" : (contentType.split("/")[1] || "bin");
        filename = `${filename}.${ext}`;
      }

      const uploadHeaders: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      };
      if (this.authString) uploadHeaders.Authorization = `Basic ${this.authString}`;
      else {
        const auth = (this.headers as Record<string, string>).Authorization;
        if (auth) uploadHeaders.Authorization = auth;
      }

      const mediaRes = await wordpressFetch(`${this.baseUrl}/wp-json/wp/v2/media`, {
        method: "POST",
        headers: uploadHeaders,
        body: bytes,
      }, WORDPRESS_TIMEOUT_MS);
      if (!mediaRes.ok) {
        this.mediaCache.set(sourceUrl, null);
        return null;
      }
      const data = await mediaRes.json();
      const newUrl: string | null = data.source_url || data.guid?.rendered || null;
      this.mediaCache.set(sourceUrl, newUrl);
      return newUrl;
    } catch {
      this.mediaCache.set(sourceUrl, null);
      return null;
    }
  }

  /**
   * Upload every image referenced inside a stored Elementor `_elementor_data`
   * JSON string into the WordPress Media Library and rewrite the URLs to the
   * uploaded copies. Template-only: images that fail to upload are left as-is
   * (never replaced with AI/stock); no images are ever generated or inserted.
   */
  private async importElementorImages(elementorData: string): Promise<string> {
    if (!elementorData) return elementorData;
    const URL_RE = /https?:\/\/[^\s"'\\)]+?\.(?:png|jpe?g|gif|webp|avif|svg|ico|bmp)(?:\?[^\s"'\\)]*)?/gi;
    const startedAt = Date.now();
    const urls = [...new Set(elementorData.match(URL_RE) ?? [])].slice(0, 3);
    if (urls.length === 0) return elementorData;
    let result = elementorData;
    for (const original of urls) {
      if (Date.now() - startedAt > 35_000) break;
      try {
        const uploaded = await this.uploadMediaFromUrl(original);
        if (uploaded && uploaded !== original) {
          result = result.split(original).join(uploaded);
        }
      } catch {
        // Best effort: keep the original template URL on failure.
      }
    }
    return result;
  }

  /**
   * Best-effort: register the design in the WordPress Elementor Template Library
   * (the `elementor_library` post type) as a reusable "page" template, so it can
   * be re-imported like a ready-made plugin template. Failure is non-fatal — the
   * page itself still carries the same `_elementor_data` and renders correctly.
   * Returns the created library template id, or null when unavailable.
   */
  private async importElementorLibraryTemplate(title: string, elementorData: string): Promise<string | null> {
    try {
      const res = await wordpressFetch(`${this.baseUrl}/wp-json/wp/v2/elementor_library`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          title: title || "Imported Template",
          status: "publish",
          meta: {
            _elementor_edit_mode: "builder",
            _elementor_template_type: "page",
            _elementor_version: "3.21.0",
            _elementor_data: elementorData,
          },
        }),
      }, WORDPRESS_TIMEOUT_MS);
      if (!res.ok) {
        await res.text();
        return null;
      }
      const data = await res.json();
      return data?.id ? String(data.id) : null;
    } catch {
      return null;
    }
  }







  private async executePageRequest(
    url: string,
    method: "POST" | "PUT",
    body: Record<string, unknown>,
    action: "publish" | "update"
  ) {
    let response = await wordpressFetch(url, {
      method,
      headers: this.headers,
      body: JSON.stringify(body),
    }, WORDPRESS_TIMEOUT_MS);

    if (!response.ok) {
      const errorText = await response.text();

      if ("template" in body && isInvalidTemplateError(errorText)) {
        const retryBody = { ...body };
        delete retryBody.template;

        response = await wordpressFetch(url, {
          method,
          headers: this.headers,
          body: JSON.stringify(retryBody),
        }, WORDPRESS_TIMEOUT_MS);

        if (!response.ok) {
          throw new Error(await getWordPressError(response, action));
        }

        return response.json();
      }

      if (isSoftaculousBlockedResponse(errorText)) {
        throw new Error(`WordPress ${action} failed: your host blocked unsupported HTML in the page body.`);
      }

      // Retries have been exhausted upstream — surface a retryable marker so
      // the UI can offer a Retry button with a friendly message.
      if (RETRYABLE_STATUSES.has(response.status)) {
        throw makeRetryableError(`WordPress ${action} temporarily unavailable [${response.status}] after ${WORDPRESS_MAX_ATTEMPTS} attempts. The site is likely rate-limiting or overloaded — please retry in a moment.`);
      }

      throw new Error(`WordPress ${action} error [${response.status}]: ${errorText}`);

    }

    return response.json();
  }

  async createPage(payload: PagePayload): Promise<ConnectorResult> {
    const assets = await this.themeAssets();
    // Asset Import System: download every referenced image/background/CSS asset
    // into the WP Media Library and rewrite URLs before publishing.
    if (!payload.product_data && payload.content) {
      payload = {
        ...payload,
        content: await importHtmlAssets(payload.content, (u) => this.uploadMediaFromUrl(u), this.baseUrl),
      };
    }
    const adapted = sanitizeWordPressContent(adaptHtmlForWordPressTheme(payload.content || "", payload.product_data ? "product" : "page", assets)) || "<p></p>";
    const body: Record<string, unknown> = {
      title: resolveWordPressTitle(payload),
      content: adapted,
      slug: slugify(payload.slug || payload.title),
      status: payload.status === "publish" ? "publish" : "draft",
    };

    if (payload.excerpt) body.excerpt = payload.excerpt;

    const meta: Record<string, unknown> = buildSeoMetaRecord(payload);

    // Resolve the WordPress page_template:
    //  1. payload.page_template (auto-detected from site's existing pages)
    //  2. Otherwise leave unset → WordPress uses the active theme default.
    const resolvedTemplate = payload.page_template || undefined;

    if (resolvedTemplate) {
      meta._wp_page_template = resolvedTemplate;
    }


    // Publish format: "gutenberg" emits native block-editor content (no Elementor
    // meta / canvas), otherwise the default Elementor flow runs.
    let format = payload.wordpress_fallback_html ? "html" : (payload.publish_format || "elementor");
    if (format === "elementor" && !payload.product_data && payload.content) {
      // The standard REST connector cannot reliably save Elementor through the
      // document lifecycle. Without the companion plugin, publish stable rendered
      // HTML/CSS instead of fragile Elementor meta writes.
      format = "html";
    }

    // WordPress Template Compatibility Engine: build a native, editable Elementor
    // page from the HTML template (pages only, not Shopify-style products).
    let elementorApplied = false;
    if (!payload.product_data && format === "html") {
      // Permanent no-plugin compatibility path: publish the exact resolved
      // template HTML/CSS into the page body. This does not require the connector
      // plugin and avoids brittle direct `_elementor_data` REST writes. It is not
      // Elementor-editable, but live rendering remains stable and full-width.
      body.content = adapted;
      // Ship CSS/JS as meta too — WordPress may strip <style>/<script> from the
      // body, and the connector plugin re-prints these on the live page.
      const design = extractDesignAssets(adapted);
      if (design.css) meta._xxxv_template_css = design.css;
      if (design.js) meta._xxxv_template_js = design.js;
      // Bundled external asset URLs (preferred): the plugin enqueues real
      // <link>/<script src> tags so nothing depends on inline markup surviving.
      const bundled = extractBundledAssetUrls(adapted);
      if (bundled.cssUrl) meta._xxxv_template_css_url = bundled.cssUrl;
      if (bundled.jsUrl) meta._xxxv_template_js_url = bundled.jsUrl;
    } else if (!payload.product_data && format === "gutenberg") {
      // Gutenberg path: wrap the asset-imported template HTML in block markup so
      // images render from the WP Media Library and the design matches 1:1.
      body.content = htmlToGutenberg(payload.content || "") || adapted;
    } else if (!payload.product_data && (payload.content || payload.elementor_data)) {
      // Catalog path: when a pre-built Elementor tree is supplied (stored template
      // with editable content already applied), publish it verbatim. Otherwise convert the
      // HTML template into native Elementor Containers + Widgets.
      const elementorData = payload.elementor_data
        ? await this.importElementorImages(payload.elementor_data)
        : undefined;
      // When a stored Elementor catalog JSON exists, its CSS is already baked into
      // the widget settings, so publish it verbatim. Otherwise build NATIVE
      // Elementor Containers + Widgets from the template HTML, baking its CSS
      // into each widget's settings (mapped to the live site's global color/font
      // tokens) — fully editable, no HTML widget, no external CSS dependency.
      const siteCtx = elementorData ? undefined : await this.siteContext();
      Object.assign(meta, buildElementorMeta(payload.content || "", { embedCss: false, prebuiltData: elementorData, siteContext: siteCtx }));
      // Step 1: import the design into the WP Elementor Template Library first
      // (like a ready-made plugin template), so the same Elementor JSON is
      // registered/reusable on the site before the page itself is created.
      if (elementorData) {
        await this.importElementorLibraryTemplate(resolveWordPressTitle(payload), elementorData);
      }
      // NOTE: do NOT send `_elementor_css`. Elementor registers it with an
      // `object` REST schema, so a string value triggers `rest_invalid_type`
      // (HTTP 400). A newly created page has no cached CSS file, so Elementor
      // regenerates settings-based CSS automatically on first render.
      elementorApplied = true;
    }

    if (payload.custom_fields) Object.assign(meta, payload.custom_fields);
    if (Object.keys(meta).length > 0) body.meta = meta;

    // Force the Elementor "Full Width" template (elementor_header_footer): the
    // page keeps the active theme's global header/footer + site settings while
    // the Elementor content stretches to full width — matching the old/existing
    // WordPress pages' global layout. (elementor_canvas would strip header/footer.)
    if (payload.wordpress_fallback_html) body.template = "elementor_header_footer";
    else if (resolvedTemplate) body.template = resolvedTemplate;
    else if (elementorApplied) body.template = "elementor_header_footer";

    const data = await this.executePageRequest(
      `${this.baseUrl}/wp-json/wp/v2/pages`,
      "POST",
      body,
      "publish"
    );

    return {
      external_id: String(data.id),
      url: data.link || `${this.baseUrl}/${body.slug}`,
    };
  }

  async updatePage(externalId: string, payload: Partial<PagePayload>): Promise<ConnectorResult> {
    const body: Record<string, unknown> = {};
    const resourcePath = payload.product_data ? "product" : "pages";
    const preserveDesign = payload.preserve_design === true;

    // Design-preservation / pure-SEO updates must NEVER rename the live page.
    // Only an explicit `title` triggers a rename; the SEO title alone is pushed
    // into the SEO plugin meta (below), not the post title, when preserving design.
    if (payload.title) body.title = resolveWordPressTitle(payload);
    else if (!preserveDesign && payload.seo_title) body.title = resolveWordPressTitle(payload);

    // DESIGN-PRESERVATION MODE: when republishing an existing CMS page (e.g. after
    // an AI SEO rewrite), do NOT overwrite the live body content, Elementor data,
    // or page template. Only metadata fields are sent to WordPress so the page
    // looks exactly the same — better SEO/title text only.
    if (!preserveDesign) {
      if (typeof payload.content === "string") {
        if (!payload.product_data) {
          payload = {
            ...payload,
            content: await importHtmlAssets(payload.content, (u) => this.uploadMediaFromUrl(u), this.baseUrl),
          };
        }
        body.content = sanitizeWordPressContent(adaptHtmlForWordPressTheme(payload.content as string, payload.product_data ? "product" : "page", await this.themeAssets())) || "<p></p>";
      }
    }

    if (payload.slug) body.slug = slugify(payload.slug);
    if (payload.status) body.status = payload.status === "publish" ? "publish" : "draft";
    if (payload.excerpt) body.excerpt = payload.excerpt;

    const meta: Record<string, unknown> = buildSeoMetaRecord(payload);

    const resolvedTemplate = preserveDesign
      ? undefined
      : (payload.page_template || undefined);

    if (!preserveDesign && resolvedTemplate) {
      meta._wp_page_template = resolvedTemplate;
    }

    // Rebuild the native Elementor layout when the body content is being updated
    // (skipped in design-preservation mode and for products).
    let format = payload.wordpress_fallback_html ? "html" : (payload.publish_format || "elementor");
    if (format === "elementor" && !payload.product_data && payload.content) {
      format = "html";
    }
    let elementorApplied = false;
    if (!preserveDesign && !payload.product_data && format === "html" && typeof payload.content === "string") {
      body.content = sanitizeWordPressContent(adaptHtmlForWordPressTheme(payload.content, "page", await this.themeAssets())) || "<p></p>";
      // Ship CSS/JS as meta too — WordPress may strip <style>/<script> from the
      // body, and the connector plugin re-prints these on the live page.
      const design = extractDesignAssets(body.content as string);
      if (design.css) meta._xxxv_template_css = design.css;
      if (design.js) meta._xxxv_template_js = design.js;
      const bundled = extractBundledAssetUrls(body.content as string);
      if (bundled.cssUrl) meta._xxxv_template_css_url = bundled.cssUrl;
      if (bundled.jsUrl) meta._xxxv_template_js_url = bundled.jsUrl;
      // The live page may previously have been built with Elementor. Elementor's
      // frontend renders from `_elementor_data` and ignores `post_content` when
      // `_elementor_edit_mode = builder`. Clear those meta values so the newly
      // pushed HTML body actually shows on the published page.
      meta._elementor_edit_mode = "";
      meta._elementor_data = "";
    } else if (!preserveDesign && !payload.product_data && format === "gutenberg" && typeof payload.content === "string") {
      body.content = htmlToGutenberg(payload.content) || (body.content as string);
      meta._elementor_edit_mode = "";
      meta._elementor_data = "";
    } else if (!preserveDesign && !payload.product_data && (typeof payload.content === "string" || payload.elementor_data)) {
      const elementorData = payload.elementor_data
        ? await this.importElementorImages(payload.elementor_data)
        : undefined;
      // Build NATIVE Elementor widgets with the template CSS baked into each
      // widget's settings (mapped to the site's global tokens), so the page is
      // fully editable and renders 1:1 with no HTML widget / external CSS.
      const siteCtx = elementorData ? undefined : await this.siteContext();
      Object.assign(meta, buildElementorMeta((payload.content as string) || "", { embedCss: false, prebuiltData: elementorData, siteContext: siteCtx }));
      // `_elementor_css` omitted on purpose (object REST schema → rest_invalid_type);
      // Elementor regenerates the CSS automatically when the page is re-rendered.
      elementorApplied = true;
    }

    if (payload.custom_fields) Object.assign(meta, payload.custom_fields);
    if (Object.keys(meta).length > 0) body.meta = meta;
    if (!preserveDesign && payload.wordpress_fallback_html) body.template = "elementor_header_footer";
    else if (!preserveDesign && resolvedTemplate) body.template = resolvedTemplate;
    else if (!preserveDesign && elementorApplied) body.template = "elementor_header_footer";

    const data = await this.executePageRequest(
      `${this.baseUrl}/wp-json/wp/v2/${resourcePath}/${externalId}`,
      "PUT",
      body,
      "update"
    );

    return { external_id: String(data.id), url: data.link || `${this.baseUrl}/${data.slug}` };
  }

  async testConnection(): Promise<boolean> {
    let res: Response;
    try {
      res = await wordpressFetch(`${this.baseUrl}/wp-json/wp/v2/users/me?context=edit`, {
        headers: this.headers,
      }, 12_000);
    } catch (e) {
      throw new Error(`Could not reach WordPress at ${this.baseUrl} — ${(e as Error).message}. Check the site URL is correct and reachable.`);
    }
    if (res.ok) return true;

    let detail = "";
    try {
      const body = await res.json();
      detail = body?.message || JSON.stringify(body);
    } catch {
      detail = (await res.text().catch(() => "")).slice(0, 300);
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(`WordPress authentication failed [${res.status}] — verify the username and Application Password are correct. ${detail}`);
    }
    if (res.status === 404) {
      throw new Error(`WordPress REST API not found [404] at ${this.baseUrl}/wp-json — ensure the REST API is enabled and the URL has no trailing path. ${detail}`);
    }
    throw new Error(`WordPress connection failed [${res.status}]: ${detail || "no detail returned by provider"}`);
  }


  async listContent(contentType: "pages" | "products"): Promise<ContentItem[]> {
    const items: ContentItem[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const url = `${this.baseUrl}/wp-json/wp/v2/${contentType === "products" ? "product" : "pages"}?per_page=${perPage}&page=${page}&_embed&context=edit`;
      const response = await wordpressFetch(url, { headers: this.headers }, 15_000);

      if (!response.ok) {
        if (contentType === "products") { await response.text(); return items; }
        const err = await response.text();
        throw new Error(`WordPress API error [${response.status}]: ${err}`);
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) break;

      for (const item of data) {
        const meta = item.meta || {};
        const seoFields = extractSeoFieldsFromMeta(meta);
        items.push({
          id: String(item.id),
          title: item.title?.rendered || item.title?.raw || item.name || "",
          slug: item.slug || "",
          url: item.link || `${this.baseUrl}/${item.slug}`,
          type: contentType === "products" ? "product" : "page",
          status: item.status || "publish",
          content: item.content?.rendered || item.content?.raw || item.description || "",
          excerpt: item.excerpt?.rendered || item.excerpt?.raw || item.short_description || "",
          modified: item.modified || item.date_modified || "",
          seo_title: seoFields.seo_title,
          seo_description: seoFields.seo_description,
          seo_keywords: seoFields.seo_keywords,
          canonical_url: seoFields.canonical_url,
          page_template: item.template || meta._wp_page_template || undefined,
          raw_meta: meta,
        });
      }

      const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "1");
      if (page >= totalPages) break;
      page++;
    }

    for (const item of items) {
      if (item.type === "page") {
        try {
          const singleResp = await wordpressFetch(
            `${this.baseUrl}/wp-json/wp/v2/pages/${item.id}?context=edit`,
            { headers: this.headers },
            15_000,
          );
          if (singleResp.ok) {
            const singleData = await singleResp.json();
            const meta = singleData.meta || {};
            const mergedMeta = { ...item.raw_meta, ...meta };
            if (singleData.template) item.page_template = singleData.template;
            if (singleData.content?.raw) {
              mergedMeta._raw_content = singleData.content.raw;
            }
            item.raw_meta = mergedMeta;

            const seoFields = extractSeoFieldsFromMeta(mergedMeta);
            item.seo_title = seoFields.seo_title;
            item.seo_description = seoFields.seo_description;
            item.seo_keywords = seoFields.seo_keywords;
            item.canonical_url = seoFields.canonical_url;
          } else {
            await singleResp.text();
          }
        } catch { /* skip */ }
      }
    }

    return items;
  }
}
