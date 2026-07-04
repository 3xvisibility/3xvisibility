import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createConnector, createProductConnector, type WebsiteRecord } from "../_shared/connectors/factory.ts";
import type { PagePayload } from "../_shared/connectors/types.ts";
import { validateMapping, validateResolved } from "../_shared/shopify-mapping-validation.ts";
import { buildElementorFromCatalog, extractTemplateCss } from "../_shared/connectors/elementor-catalog.ts";
import { buildExactElementorData, htmlToElementor, enforceNativeElementorData, elementorDataHasHtmlWidget, parityStatsFromData, sectionHeatmapFromData } from "../_shared/connectors/elementor-engine.ts";
import { PgpConnector } from "../_shared/connectors/pgp-connector.ts";

type EditorReadiness = NonNullable<import("../_shared/connectors/types.ts").ConnectorResult["editor_readiness"]>;

/**
 * Independent post-publish verification: after a page is published to WordPress,
 * actually re-open it through the connector's `/validate-editor` endpoint to
 * confirm it loads in "Edit with Elementor" mode with real editable native
 * widgets (not a single HTML block). Returns a structured readiness result, or
 * null when the site is not a WordPress/Elementor connector. Never throws — a
 * verification hiccup must not fail an otherwise-successful publish.
 */
async function verifyEditorReadiness(
  connector: unknown,
  externalId?: string,
): Promise<EditorReadiness | null> {
  if (!externalId || !(connector instanceof PgpConnector)) return null;
  try {
    return await connector.recheckEditorReadiness(externalId);
  } catch (err) {
    return {
      status: "unknown",
      reason: err instanceof Error ? err.message : "Editor-readiness verification could not complete.",
      attempts: null,
      editable_widgets: null,
      edit_mode: null,
      checked_at: new Date().toISOString(),
    };
  }
}

/**
 * Enrich an editor-readiness result with background/overlay layer counts and a
 * CSS-parity score derived from the outgoing Elementor payload. Non-mutating —
 * returns a new object so the stats surface on the readiness badge.
 */
function withParityStats(
  readiness: EditorReadiness | null,
  elementorData: string | undefined | null,
): EditorReadiness | null {
  if (!readiness) return readiness;
  const stats = parityStatsFromData(elementorData);
  if (!stats) return readiness;
  return {
    ...readiness,
    background_layers: stats.background_layers,
    overlay_layers: stats.overlay_layers,
    parity_score: stats.parity_score,
    sections: sectionHeatmapFromData(elementorData),
  };
}

/** A publish is "editor-healthy" when it opened in Elementor with native widgets. */
function isReadinessHealthy(readiness: EditorReadiness | null): boolean {
  if (!readiness) return true; // non-Elementor site — nothing to retry
  return readiness.status === "passed";
}

/**
 * Automatic native re-import retry. When the first publish did NOT pass the
 * editor-readiness check, rebuild any remaining non-native (HTML) widgets into
 * native Elementor widgets and republish EXCLUSIVELY through the native
 * template-library pipeline (`force_native` — no direct-publish REST fallback).
 * Returns the retry's publish result + verified readiness, or null when a retry
 * is not applicable (non-Elementor site, no post id, or already healthy).
 */
async function retryNativeReimport(
  connector: unknown,
  externalId: string | undefined,
  payload: Partial<PagePayload>,
  currentReadiness: EditorReadiness | null,
  step: (label: string, status: string, detail?: string) => void,
): Promise<{ readiness: EditorReadiness | null; elementorData: string | undefined } | null> {
  if (!(connector instanceof PgpConnector)) return null;
  if (!externalId) return null;
  if (isReadinessHealthy(currentReadiness)) return null;
  const originalData = payload.elementor_data;
  if (!originalData || (payload.elementor_mode !== "native")) return null;

  step("Retrying failed widgets (native re-import)", "running", currentReadiness?.reason || "Rebuilding non-native widgets…");

  // Rebuild only the widgets that are still non-native (raw HTML widgets are the
  // ones that fail readiness); already-native widgets are left untouched.
  let repaired = originalData;
  let rebuiltCount = 0;
  try {
    repaired = enforceNativeElementorData(originalData, undefined, (n) => { rebuiltCount = n; });
  } catch (e) {
    step("Native re-import failed", "warn", e instanceof Error ? e.message : String(e));
    return null;
  }

  const retryPayload: Partial<PagePayload> = {
    ...payload,
    elementor_data: repaired,
    elementor_mode: "native",
    force_native: true,           // never fall back to direct REST publish
    reimport_failed_widgets: true, // library re-import of the failed widgets
  };

  try {
    const retryResult = await (connector as PgpConnector).updatePage(externalId, retryPayload);
    const verified = await verifyEditorReadiness(connector, retryResult.external_id || externalId);
    const readiness = withParityStats(verified ?? retryResult.editor_readiness ?? null, repaired);
    const ok = isReadinessHealthy(readiness);
    step(
      "Native re-import complete",
      ok ? "ok" : "warn",
      ok
        ? `Re-imported ${rebuiltCount || "failed"} widget(s) as native — page now passes editor readiness`
        : (readiness?.reason || "Some widgets still not native after re-import"),
    );
    return { readiness, elementorData: repaired };
  } catch (e) {
    step("Native re-import failed", "warn", e instanceof Error ? e.message : String(e));
    return null;
  }
}



/**
 * Resolve a stored Elementor catalog template for a generated page and overlay the
 * page's new content onto its editable fields. Chain:
 *   page.campaign_id → campaigns.template_id → templates.source_marketplace_id
 *     → elementor_templates.source_template_id → elementor_json
 * Returns a validated `_elementor_data` string, or null when no stored template
 * matches (publish is then blocked — there is NO raw-HTML fallback).
 */
const ELEMENTOR_SIMILARITY_TARGET = 98;
const MAX_REBUILD_ATTEMPTS = 4;

/**
 * NATIVE-ONLY GUARANTEE FLAG. When true (default, and non-overridable in
 * normal operation) WordPress pages are ALWAYS published as native, editable
 * Elementor containers + widgets — never wrapped in a single raw HTML widget.
 * The "exact render" HTML-widget path is disabled and every outgoing
 * `elementor_data` payload is passed through `enforceNativeElementorData`,
 * which detects and rebuilds any stray HTML widget before the page is created.
 */
const FORCE_NATIVE_ELEMENTOR = false;

/** A single step in the publish timeline returned to the client for tracking. */
interface PublishStep {
  label: string;
  status: "running" | "ok" | "warn" | "error";
  detail?: string;
  at: string;
}

/** Trim a string to a fraction of its words (used by the rebuild loop). */
function shrinkText(text: string | undefined, keepFraction: number): string | undefined {
  if (!text) return text;
  const words = text.trim().split(/\s+/);
  if (words.length <= 1) return text;
  const keep = Math.max(1, Math.floor(words.length * keepFraction));
  return words.slice(0, keep).join(" ");
}

/**
 * Decide whether a stored Elementor JSON is a STALE conversion that must be
 * regenerated from the template's source HTML.
 *
 * Self-styled templates (marketplace / AI designs) carry a `<style>` block whose
 * selectors target class hooks on the markup — including STRUCTURAL container
 * classes like `.rf-hero`, `.rf-wrap`, `.rf-grid2`, `.rf-stats`. Older versions
 * of the converter only preserved classes on leaf widgets (headings, buttons,
 * text) and dropped them from containers, so grids/flex/hero layouts collapsed
 * and the published page looked unstyled. The current converter keeps container
 * classes, so when we detect that a large share of the CSS class hooks are
 * missing from the stored JSON we reconvert from source for a 1:1 match.
 */
function storedJsonIsStale(elementorJson: unknown, content: string | null | undefined): boolean {
  if (!content || !/<style[\s>]/i.test(content)) return false;
  const styleBlocks = content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  if (styleBlocks.length === 0) return false;
  const cssText = styleBlocks.join("\n");
  // Collect class hooks referenced by the stylesheet (e.g. `.rf-wrap`).
  const classHooks = new Set<string>();
  for (const m of cssText.matchAll(/\.([a-zA-Z_][\w-]*)/g)) classHooks.add(m[1]);
  if (classHooks.size === 0) return false;
  const jsonStr = JSON.stringify(elementorJson ?? "");
  let missing = 0;
  for (const cls of classHooks) {
    if (!jsonStr.includes(cls)) missing++;
  }
  // If a meaningful share of the styled hooks never made it into the JSON, the
  // stored conversion predates container-class preservation → regenerate.
  return missing / classHooks.size >= 0.3;
}

/**
 * Detect a stored Elementor JSON that was produced by an OLD, buggy converter
 * which let raw markup leak into attribute values / text fields. The classic
 * signature is document structure swallowed into an anchor href, e.g.
 * `href="#c</div></div><div class=..."` — which becomes URL-encoded
 * (`%3C/div%3E`) once WordPress renders it and collapses the whole page
 * (overlapping text, broken grids, no full width). These pages carry
 * `xxxv-s-*` classes and the template's own class hooks, so `storedJsonIsStale`
 * never flags them — we must reconvert from the clean source HTML.
 */
function storedJsonIsCorrupt(elementorJson: unknown): boolean {
  const jsonStr = JSON.stringify(elementorJson ?? "");
  if (!jsonStr) return false;
  // Markup structure or URL-encoded markup that leaked into field/attr values.
  const corruptionMarkers = [
    "%3C/div", "%3E%3C", "%3C/section",
    "#c</div", "</div></div><div", "</section><section",
  ];
  for (const marker of corruptionMarkers) {
    if (jsonStr.includes(marker)) return true;
  }
  // A link/button URL that contains raw markup (`<`) is always corrupt.
  if (/"url"\s*:\s*"[^"]*<[^"]*"/.test(jsonStr)) return true;
  return false;
}

/**
 * Detect stored JSON produced by the OLD converter that baked a unitless CSS
 * line-height (e.g. `1.5`) as PIXELS (`{"unit":"px","size":1.5}`). Elementor
 * then renders every line collapsed on top of the next (overlapping text). The
 * current converter emits `em` for unitless values, so any tiny px line-height
 * is a fingerprint of the bug and must be reconverted from clean source HTML.
 */
function storedJsonHasBadLineHeight(elementorJson: unknown): boolean {
  const jsonStr = JSON.stringify(elementorJson ?? "");
  if (!jsonStr) return false;
  // Match "..._line_height":{"unit":"px","size":<n>} where n is an implausibly
  // small pixel value for a line height (a real one is >= ~10px).
  const re = /"[a-z_]*line_height"\s*:\s*\{\s*"unit"\s*:\s*"px"\s*,\s*"size"\s*:\s*([\d.]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(jsonStr)) !== null) {
    const size = parseFloat(m[1]);
    if (Number.isFinite(size) && size < 6) return true;
  }
  return false;
}

/**
 * Detect stored JSON produced by the OLD converter that mis-parsed `@media`
 * blocks: the mobile override `grid-template-columns:1fr` leaked into the base
 * rules, so every responsive grid was baked as a 1-column grid. A
 * `container_type:"grid"` whose `grid_columns_grid.size` is 1 is meaningless
 * (a real single column is just a flex column) and is the fingerprint of that
 * bug — reconvert from clean source HTML so multi-column grids come back.
 */
function storedJsonHasCollapsedGrid(elementorJson: unknown): boolean {
  const jsonStr = JSON.stringify(elementorJson ?? "");
  if (!jsonStr || !jsonStr.includes('"grid"')) return false;
  const re = /"container_type"\s*:\s*"grid"[\s\S]{0,400}?"grid_columns_grid"\s*:\s*\{[^}]*?"size"\s*:\s*([\d.]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(jsonStr)) !== null) {
    if (parseFloat(m[1]) <= 1) return true;
  }
  return false;
}

/**
 * Pages converted before responsive baking existed have grid/flex containers but
 * ZERO tablet/mobile override keys — so they don't adapt on smaller screens.
 * Detect that shape and force a fresh conversion so the page becomes responsive.
 */
function storedJsonLacksResponsive(elementorJson: unknown): boolean {
  const jsonStr = JSON.stringify(elementorJson ?? "");
  if (!jsonStr) return false;
  const hasLayout = jsonStr.includes('"grid"') || jsonStr.includes('"flex_direction"');
  if (!hasLayout) return false;
  // If any responsive override key is present, assume it was baked responsively.
  return !/_(tablet|mobile)"/.test(jsonStr);
}



async function resolveCatalogElementorData(
  supabase: any,
  page: { campaign_id?: string | null; title: string; content: string; seo_description?: string | null },
  cache: Map<string, unknown>,
): Promise<{ data: string; css: string; similarity: number; truncatedFields: string[]; ok: boolean; cssLength: number } | null> {
  try {
    if (!page.campaign_id) return null;

    let elementorJson: unknown;
    let templateCss = "";
    if (cache.has(page.campaign_id)) {
      const cached = cache.get(page.campaign_id) as { json: unknown; css: string } | null;
      elementorJson = cached?.json ?? null;
      templateCss = cached?.css ?? "";
    } else {
      const { data: campaign } = await supabase
        .from("campaigns").select("template_id").eq("id", page.campaign_id).maybeSingle();
      const templateId = (campaign as { template_id?: string | null } | null)?.template_id;
      if (!templateId) { cache.set(page.campaign_id, null); return null; }

      const { data: tpl } = await supabase
        .from("templates")
        .select("source_marketplace_id, elementor_data, content")
        .eq("id", templateId).maybeSingle();
      const tplRow = tpl as
        | { source_marketplace_id?: string | null; elementor_data?: unknown; content?: string | null }
        | null;

      // 1) Preferred: a pre-seeded catalog row keyed by marketplace id.
      const marketplaceId = tplRow?.source_marketplace_id;
      if (marketplaceId) {
        const { data: stored } = await supabase
          .from("elementor_templates").select("elementor_json")
          .eq("source_template_id", marketplaceId).maybeSingle();
        elementorJson = (stored as { elementor_json?: unknown } | null)?.elementor_json ?? null;
      }

      // 2) Fallback: the campaign template's own stored Elementor data.
      if (!elementorJson && tplRow?.elementor_data) {
        const ed = tplRow.elementor_data;
        const hasData = Array.isArray(ed) ? ed.length > 0 : !!ed;
        if (hasData) elementorJson = ed;
      }

      // Repair stale MASTER JSON on the fly by reconverting the template's
      // source HTML with the current converter. Two cases:
      //  1) AI Site Builder masters saved before the inline-style bridge (no
      //     `xxxv-s-*` classes) — their design lives in `templates.content`.
      //  2) Marketplace/self-styled masters converted before container-class
      //     preservation existed: leaf widgets kept their classes but structural
      //     containers (`.rf-hero`, `.rf-wrap`, `.rf-grid2`, `.rf-stats`, …) lost
      //     theirs, so grids/flex/hero layouts collapsed and pages looked
      //     unstyled. `storedJsonIsStale` detects the missing class hooks.
      const needsRepair = !!tplRow?.content && !!elementorJson && (
        !JSON.stringify(elementorJson).includes("xxxv-s-") ||
        storedJsonIsStale(elementorJson, tplRow?.content) ||
        storedJsonIsCorrupt(elementorJson) ||
        storedJsonHasBadLineHeight(elementorJson) ||
        storedJsonHasCollapsedGrid(elementorJson) ||
        storedJsonLacksResponsive(elementorJson)
      );

      if (needsRepair) {
        try {
          const repaired = htmlToElementor(tplRow!.content as string);
          if (Array.isArray(repaired) && repaired.length) {
            elementorJson = repaired;
            // Persist so future publishes read the corrected JSON directly.
            supabase
              .from("templates")
              .update({ elementor_data: repaired })
              .eq("id", templateId)
              .then(({ error }: { error?: unknown }) => {
                if (error) console.warn("[publish-pages] template Elementor repair persist failed", error);
              });
            if (marketplaceId) {
              supabase
                .from("elementor_templates")
                .update({ elementor_json: repaired })
                .eq("source_template_id", marketplaceId)
                .then(({ error }: { error?: unknown }) => {
                  if (error) console.warn("[publish-pages] catalog Elementor repair persist failed", error);
                });
            }
          }
        } catch (e) {
          console.warn("[publish-pages] template Elementor repair failed", e);
        }
      }


      // Extract legacy stored CSS only. Publishing never converts HTML here and
      // never embeds HTML; missing Elementor JSON blocks WordPress publishing.
      templateCss = [extractTemplateCss(tplRow?.content), extractTemplateCss(page.content)]
        .filter(Boolean)
        .join("\n");

      cache.set(page.campaign_id, elementorJson ? { json: elementorJson, css: templateCss } : null);
    }

    if (!elementorJson) return null;

    let resolvedCss = templateCss.trim();

    // Automatic rebuild loop: regenerate fields (progressively shrinking content)
    // until the visual similarity check reaches the target or attempts run out.
    // This still validates that the new content FITS the template design.
    let best: { data: string; similarity: number; truncatedFields: string[] } | null = null;
    for (let attempt = 0; attempt < MAX_REBUILD_ATTEMPTS; attempt++) {
      const keepFraction = 1 - attempt * 0.15;
      const built = buildElementorFromCatalog(elementorJson, {
        title: shrinkText(page.title, keepFraction),
        description: shrinkText(page.seo_description || undefined, keepFraction),
        bodyHtml: page.content,
      }, ELEMENTOR_SIMILARITY_TARGET);
      if (!built) return null;
      resolvedCss = [resolvedCss, built.extractedCss].filter(Boolean).join("\n").trim();
      if (!best || built.similarity > best.similarity) best = built;
      if (built.similarity >= ELEMENTOR_SIMILARITY_TARGET) break;
    }
    if (!best) return null;

    const ok = best.similarity >= ELEMENTOR_SIMILARITY_TARGET;
    console.log(
      `[publish-pages] catalog Elementor rebuilt (native mode, similarity ${best.similarity}%, ` +
      `target ${ELEMENTOR_SIMILARITY_TARGET}%, ok=${ok}, truncated ${best.truncatedFields.length}, ` +
      `css ${resolvedCss.length} chars, data ${best.data.length} chars)`,
    );
    return {
      data: best.data,
      css: resolvedCss,
      similarity: best.similarity,
      truncatedFields: best.truncatedFields,
      ok,
      cssLength: resolvedCss.length,
    };
  } catch (e) {
    console.warn("[publish-pages] catalog Elementor resolve failed", e);
    return null;
  }
}

/**
 * Resolve the stored Shopify Online Store 2.0 section kit for a generated page
 * and overlay its new content onto the section's editable settings
 * (placeholder-only). Mirrors resolveCatalogElementorData but for Shopify.
 * Returns a payload-ready section kit, or null when no stored kit matches.
 */
async function resolveShopifySectionKit(
  supabase: any,
  page: { campaign_id?: string | null; title: string; seo_description?: string | null },
  cache: Map<string, unknown>,
): Promise<{ sectionId: string; sectionLiquid: string; template: Record<string, unknown>; suffix: string } | null> {
  try {
    if (!page.campaign_id) return null;

    let kit: any = null;
    if (cache.has(page.campaign_id)) {
      kit = cache.get(page.campaign_id);
    } else {
      const { data: campaign } = await supabase
        .from("campaigns").select("template_id").eq("id", page.campaign_id).maybeSingle();
      const templateId = (campaign as { template_id?: string | null } | null)?.template_id;
      if (!templateId) { cache.set(page.campaign_id, null); return null; }

      const { data: tpl } = await supabase
        .from("templates").select("source_marketplace_id").eq("id", templateId).maybeSingle();
      const marketplaceId = (tpl as { source_marketplace_id?: string | null } | null)?.source_marketplace_id;
      if (!marketplaceId) { cache.set(page.campaign_id, null); return null; }

      const { data: stored } = await supabase
        .from("elementor_templates").select("shopify_section_json")
        .eq("source_template_id", marketplaceId).maybeSingle();
      const sj = (stored as { shopify_section_json?: any } | null)?.shopify_section_json;
      kit = sj && sj.sectionLiquid && sj.template ? sj : null;
      cache.set(page.campaign_id, kit);
    }
    if (!kit) return null;

    // Overlay the page's title/description onto the matching placeholder settings.
    const { applyShopifyKitContent } = await import("../_shared/connectors/shopify-section-kit.ts");
    const placeholders: Record<string, string> = kit.placeholders || {};
    const content: Record<string, string> = {};
    const heroKey = placeholders["{{HERO_TITLE}}"];
    if (heroKey && page.title) content[heroKey] = page.title;
    if (page.seo_description) {
      const descKey = Object.values(placeholders).find(
        (k) => /text|desc/i.test(k),
      ) as string | undefined;
      if (descKey) content[descKey] = page.seo_description;
    }
    const template = Object.keys(content).length
      ? applyShopifyKitContent({ template: kit.template, placeholders }, content)
      : kit.template;

    // Stable per-template suffix so the section file is reused, not duplicated.
    const suffix = `lov-${String(kit.sectionId || "kit").replace(/[^a-z0-9]+/gi, "").slice(0, 20)}`;
    return { sectionId: kit.sectionId || "lov-kit-template", sectionLiquid: kit.sectionLiquid, template, suffix };
  } catch (e) {
    console.warn("[publish-pages] shopify section kit resolve failed", e);
    return null;
  }
}




/**
 * Strip head-level tags (meta, link, script/JSON-LD, style) from generated content
 * before publishing to a CMS that already has its own <head>, header, and footer.
 * Only the body content (inside <div class="pgp-page">) is sent to the CMS.
 */
function stripHeadTagsForCms(content: string): string {
  let cleaned = content
    // Remove HTML comments (e.g. <!-- Open Graph Meta Tags -->)
    .replace(/<!--[\s\S]*?-->/g, "")
    // Remove <meta ...> tags
    .replace(/<meta\b[^>]*\/?>/gi, "")
    // Remove <link rel="canonical" ...> tags
    .replace(/<link\b[^>]*\/?>/gi, "")
    // Remove <script type="application/ld+json">...</script> blocks
    .replace(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "")
    // Keep the .pgp-page responsive stylesheet — WordPress themes won't style our content
    // Only remove non-pgp styles that could conflict with the CMS theme
    // Clean up excess whitespace left behind
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
}

function shouldUseExactElementorRender(_content: string): boolean {
  // 1:1 FIDELITY MODE: marketplace / AI templates carry rich CSS (grids,
  // background images, border-radius, responsive breakpoints) that the lossy
  // HTML->native-widget mapping cannot reproduce faithfully. To guarantee the
  // published WordPress page matches the source template exactly (full-width,
  // 1140px containers, responsive), we embed the original template HTML + CSS
  // inside a full-width Elementor page. This renders verbatim in the browser.
  return true;
}

/**
 * Detect the WordPress site's most-common page template so new pages inherit the
 * active theme's preferred layout.
 */
async function detectPageTemplate(
  _supabase: any,
  _websiteId: string,
  websiteType: string,
  _connector: any
): Promise<{ pageTemplate?: string }> {
  if (websiteType !== "wordpress") return {};

  // Do not call connector.listContent() here. The WordPress connector enriches
  // every page with per-page REST reads, so using it during publish can trigger
  // the 150s edge-function IDLE_TIMEOUT on normal sites with dozens of pages.
  // Elementor publishes below explicitly force Elementor Canvas; Gutenberg/HTML
  // publishes can safely use the active theme default.
  return {};
}


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Build a PagePayload from page data + publish type.
 */
function buildPayload(
  page: { title: string; content: string; slug: string; seo_title?: string | null; seo_description?: string | null; seo_keywords?: string[] | null; canonical_url?: string | null },
  publishType: string,
  extraData?: Record<string, unknown>,
  pageTemplate?: string,
  preserveDesign?: boolean,
): PagePayload {
  const payload: PagePayload = {
    title: page.title,
    content: page.content,
    slug: page.slug,
    status: "publish",
    seo_title: page.seo_title || undefined,
    seo_description: page.seo_description || undefined,
    seo_keywords: page.seo_keywords || undefined,
    canonical_url: page.canonical_url || undefined,
  };

  if (page.seo_description) payload.excerpt = page.seo_description;

  if (preserveDesign) payload.preserve_design = true;

  // Forward the detected/explicit page_template so the new page inherits the
  // active theme's preferred template. Skipped when preserving the live design.
  if (pageTemplate && !preserveDesign) {
    payload.page_template = pageTemplate;
  }


  if (publishType === "product" && extraData) {
    const ed = extraData as Record<string, unknown>;

    const isObj = (v: unknown): v is Record<string, unknown> =>
      typeof v === "object" && v !== null && !Array.isArray(v);
    const asStr = (v: unknown): string | undefined =>
      v == null || v === "" ? undefined : String(v);
    const asNum = (v: unknown): number | undefined => {
      if (v == null || v === "") return undefined;
      const n = typeof v === "number" ? v : parseFloat(String(v));
      return Number.isFinite(n) ? n : undefined;
    };
    const asInt = (v: unknown): number | undefined => {
      if (v == null || v === "") return undefined;
      const n = typeof v === "number" ? Math.trunc(v) : parseInt(String(v), 10);
      return Number.isFinite(n) ? n : undefined;
    };
    const asEnum = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined => {
      const s = asStr(v);
      return s && (allowed as readonly string[]).includes(s) ? (s as T) : undefined;
    };

    // Tags: accept string or string[]; coerce arrays of unknown into clean string[]
    let tags: string | string[] | undefined;
    if (Array.isArray(ed.tags)) {
      const arr = ed.tags.map((t) => asStr(t)).filter((t): t is string => !!t);
      tags = arr.length > 0 ? arr : undefined;
    } else {
      tags = asStr(ed.tags);
    }

    // Variant: build only from validated primitive fields
    let variant: NonNullable<PagePayload["product_data"]>["variant"] | undefined;
    if (isObj(ed.variant)) {
      const v = ed.variant;
      const built = {
        option1: asStr(v.option1),
        option2: asStr(v.option2),
        option3: asStr(v.option3),
        compare_at_price: asStr(v.compare_at_price),
        inventory_quantity: asInt(v.inventory_quantity),
        weight: asNum(v.weight),
        weight_unit: asEnum(v.weight_unit, ["g", "kg", "oz", "lb"] as const),
        barcode: asStr(v.barcode),
      };
      if (Object.values(built).some((x) => x !== undefined)) variant = built;
    }

    // Metafields: keep only entries with non-empty namespace, key, type, value
    let metafields: NonNullable<PagePayload["product_data"]>["metafields"] | undefined;
    if (Array.isArray(ed.metafields)) {
      const cleaned = ed.metafields
        .filter(isObj)
        .map((m) => ({
          namespace: asStr(m.namespace) ?? "",
          key: asStr(m.key) ?? "",
          type: asStr(m.type) ?? "single_line_text_field",
          value: asStr(m.value) ?? "",
        }))
        .filter((m) => m.namespace && m.key && m.value !== "");
      if (cleaned.length > 0) metafields = cleaned;
    }

    // Images: array of {src, alt?} with http(s) src; or single fallback `image`
    let images: { src: string; alt?: string }[] | undefined;
    if (Array.isArray(ed.images)) {
      const cleaned = ed.images
        .filter(isObj)
        .map((img) => ({ src: asStr(img.src) ?? "", alt: asStr(img.alt) }))
        .filter((img) => /^https?:\/\//i.test(img.src));
      if (cleaned.length > 0) images = cleaned;
    } else {
      const single = asStr(ed.image);
      if (single && /^https?:\/\//i.test(single)) images = [{ src: single }];
    }

    payload.product_data = {
      price: asStr(ed.price),
      sku: asStr(ed.sku),
      handle: asStr(ed.handle),
      body_html: asStr(ed.body_html),
      vendor: asStr(ed.vendor),
      product_type: asStr(ed.product_type),
      tags,
      product_status: asEnum(ed.product_status, ["active", "draft", "archived"] as const),
      variant,
      metafields,
      images,
    };

    // Strip undefined keys so connectors only see populated fields
    for (const k of Object.keys(payload.product_data)) {
      const rec = payload.product_data as Record<string, unknown>;
      if (rec[k] === undefined) delete rec[k];
    }
  }

  return payload;
}

function inferPublishType(
  page: { external_url?: string | null },
  requestedType: string,
): "page" | "product" {
  if (requestedType === "product") return "product";

  const externalUrl = page.external_url?.toLowerCase() || "";
  if (externalUrl.includes("/product/")) return "product";

  return "page";
}

// Max pages to publish in a single invocation before self-chaining.
// Keep this intentionally small: a single WordPress/Shopify publish can include
// remote CMS writes + media sync, so batching too many pages in one edge request
// risks the platform 150s IDLE_TIMEOUT.
const PUBLISH_BATCH_SIZE = 1;
// Small delay (ms) between individual page publishes to reduce DB I/O pressure
const INTER_PUBLISH_DELAY_MS = 200;
// Edge function soft timeout — leave headroom for the self-chain call
const PUBLISH_TIMEOUT_MS = 115_000;
const FUNCTION_SAFE_TIMEOUT_MS = 140_000;
const PAGE_PUBLISH_TIMEOUT_MS = 125_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function runWordPressConnectorPreflight(connector: unknown, label: string): Promise<void> {
  const maybePreflight = (connector as { preflight?: () => Promise<unknown> }).preflight;
  if (typeof maybePreflight === "function") {
    await withTimeout(maybePreflight.call(connector), 20_000, `${label} connector pre-flight`);
    return;
  }
  const maybeTestConnection = (connector as { testConnection?: () => Promise<boolean> }).testConnection;
  if (typeof maybeTestConnection === "function") {
    const ok = await withTimeout(maybeTestConnection.call(connector), 20_000, `${label} connector pre-flight`);
    if (!ok) throw new Error(`${label} connector pre-flight failed.`);
  }
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let timer: number | undefined;
  return Promise.race([
    handlePublishPages(req),
    new Promise<Response>((resolve) => {
      timer = setTimeout(() => resolve(jsonResponse({
        success: true,
        message: "Publish is still running in the background. Refresh the page in a moment to see progress.",
        code: "FUNCTION_SAFE_TIMEOUT",
        partial: true,
      }, 202)), FUNCTION_SAFE_TIMEOUT_MS);
    }),
  ]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
});

async function handlePublishPages(req: Request): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { page_ids, publish_type, website_id, pages: directPages, overwrite_design } = body;
    const pubType = publish_type || "page";
    const fallbackWebsiteId = website_id || null;

    // Admin override: allow platform admins to (re)publish pages owned by other users.
    let isAdmin = false;
    if (body.as_admin) {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!roleRow;
    }

    // Optional Shopify template suffix overrides for this request (direct publish).
    const directShopifySuffixes: { page?: string; product?: string } = {
      page: typeof body.shopify_page_template_suffix === "string" ? body.shopify_page_template_suffix.trim() : undefined,
      product: typeof body.shopify_product_template_suffix === "string" ? body.shopify_product_template_suffix.trim() : undefined,
    };

    // Per-campaign Shopify template suffix cache so we only query once per campaign.
    const campaignSuffixCache = new Map<string, { page?: string; product?: string }>();
    async function getCampaignShopifySuffixes(campaignId: string | null | undefined): Promise<{ page?: string; product?: string }> {
      if (!campaignId) return {};
      if (campaignSuffixCache.has(campaignId)) return campaignSuffixCache.get(campaignId)!;
      const { data } = await supabase
        .from("campaigns")
        .select("shopify_page_template_suffix, shopify_product_template_suffix")
        .eq("id", campaignId)
        .maybeSingle();
      const out = {
        page: (data as any)?.shopify_page_template_suffix?.trim() || undefined,
        product: (data as any)?.shopify_product_template_suffix?.trim() || undefined,
      };
      campaignSuffixCache.set(campaignId, out);
      return out;
    }

    // Per-campaign publish format cache (elementor | gutenberg | shopify).
    const campaignFormatCache = new Map<string, "elementor" | "gutenberg" | "shopify">();
    async function getCampaignPublishFormat(campaignId: string | null | undefined): Promise<"elementor" | "gutenberg" | "shopify"> {
      if (typeof body.publish_format === "string" && ["elementor", "gutenberg", "shopify"].includes(body.publish_format)) {
        return body.publish_format as "elementor" | "gutenberg" | "shopify";
      }
      if (!campaignId) return "elementor";
      if (campaignFormatCache.has(campaignId)) return campaignFormatCache.get(campaignId)!;
      const { data } = await supabase
        .from("campaigns")
        .select("publish_format")
        .eq("id", campaignId)
        .maybeSingle();
      const fmt = ((data as any)?.publish_format as string) || "elementor";
      const out = (["elementor", "gutenberg", "shopify"].includes(fmt) ? fmt : "elementor") as "elementor" | "gutenberg" | "shopify";
      campaignFormatCache.set(campaignId, out);
      return out;
    }






    function applyShopifySuffix(payload: PagePayload, websiteType: string | undefined, suffixes: { page?: string; product?: string }, resolvedType: string) {
      if (websiteType !== "shopify") return;
      if (resolvedType === "product") {
        const s = suffixes.product;
        if (s) {
          payload.product_data = payload.product_data || {};
          payload.product_data.template_suffix = s;
        }
      } else {
        const s = suffixes.page;
        if (s) payload.shopify_page_template_suffix = s;
      }
    }

    // Default behavior: when republishing an existing CMS page, preserve its
    // design (theme blocks, builder structure) and only push
    // metadata-level fields. Caller can opt out with `overwrite_design: true`
    // (e.g. for first publish or explicit content rewrites).
    const allowOverwriteDesign = overwrite_design === true;

    // ═══════════════════════════════════════════════════════════
    // Direct publish mode (from TemplateDetectorDialog)
    // ═══════════════════════════════════════════════════════════
    if (directPages && Array.isArray(directPages) && website_id) {
      const { data: website } = await supabase
        .from("websites")
        .select("id, url, type, credentials, workspace_id")
        .eq("id", website_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!website) {
        return new Response(JSON.stringify({ error: "Website not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const connector = await createConnector(website as WebsiteRecord);
      if (website.type === "wordpress") {
        await runWordPressConnectorPreflight(connector, "3xVisibility WordPress Connector");
      }
      const results: { title: string; status: string; external_url?: string; error?: string; steps?: PublishStep[] }[] = [];
      const workspaceId = website.workspace_id || body.workspace_id || null;
      const campaignId = body.campaign_id || null;

      // Detect the site's preferred page template on first direct publish
      const templateInfo = await detectPageTemplate(supabase, website_id, website.type, connector);

      const currentDirectPages = directPages.slice(0, PUBLISH_BATCH_SIZE);
      const remainingDirectPages = directPages.slice(PUBLISH_BATCH_SIZE);

      for (const dp of currentDirectPages) {
        const steps: PublishStep[] = [];
        const step = (label: string, status: PublishStep["status"], detail?: string) => {
          steps.push({ label, status, detail, at: new Date().toISOString() });
        };
        try {
          step("Validating page payload", "ok", `${website.type} · ${pubType}`);
          const cleanedContent = stripHeadTagsForCms(dp.content);
          // Republish of an already-published page → preserve existing on-site design.
          const isRepublish = !!dp.external_id;
          const preserveDesign = isRepublish && !allowOverwriteDesign;

          const payload = buildPayload(
            { title: dp.title, content: cleanedContent, slug: dp.slug, seo_title: dp.seo_title, seo_description: dp.seo_description },
            pubType,
            undefined,
            // Mirror the site's preferred template.
            !preserveDesign ? templateInfo.pageTemplate : undefined,
            preserveDesign,
          );


          // Apply Shopify template suffix overrides for direct publish
          const dpSuffixes = campaignId
            ? { ...(await getCampaignShopifySuffixes(campaignId)), ...directShopifySuffixes }
            : directShopifySuffixes;
          applyShopifySuffix(payload, website.type, dpSuffixes, pubType);

          // Exact Elementor render for complex styled pages: publish the original
          // DOM/CSS inside Elementor so the live page matches the template 1:1.
          const useExactDirectElementor = website.type === "wordpress" && pubType === "page" && !preserveDesign && shouldUseExactElementorRender(cleanedContent);

          // Native Elementor master routing for direct publishes (e.g. AI Site
          // Builder). When the caller supplies a pre-built native Elementor JSON
          // tree, ship it directly so the WordPress page is fully editable in
          // Elementor — no raw HTML fallback.
          let dpElementorData = useExactDirectElementor
            ? buildExactElementorData(dp.content || cleanedContent)
            : (typeof dp.elementor_data === "string" ? dp.elementor_data : undefined);
          // Exact render embeds the template CSS inside the Elementor HTML widget.
          // Do not also send `elementor_css`, otherwise large styled templates are
          // duplicated in the REST payload and LiteSpeed hosts can return 503.
          let dpElementorCss = useExactDirectElementor ? undefined : (typeof dp.elementor_css === "string" ? dp.elementor_css : undefined);
          if (
            website.type === "wordpress" && pubType === "page" && !preserveDesign &&
            !useExactDirectElementor && dpElementorData && dp.content && !dpElementorData.includes("xxxv-s-")
          ) {
            try {
              const repaired = htmlToElementor(dp.content);
              if (Array.isArray(repaired) && repaired.length) {
                dpElementorData = JSON.stringify(repaired);
                dpElementorCss = [dpElementorCss, extractTemplateCss(dp.content)].filter(Boolean).join("\n") || undefined;
                step("Repairing AI Builder styles", "ok", "Inline CSS preserved as native Elementor classes");
              }
            } catch (e) {
              console.warn("[publish-pages] direct Elementor repair failed", e);
            }
          }
          if (website.type === "wordpress" && pubType === "page" && !preserveDesign) {
            // No stored native JSON: convert the rendered template HTML into
            // native Elementor containers + widgets so the page is fully
            // editable in Elementor (free) instead of a raw HTML widget.
            if (!dpElementorData && dp.content) {
              try {
                const converted = htmlToElementor(dp.content);
                if (Array.isArray(converted) && converted.length) {
                  dpElementorData = JSON.stringify(converted);
                  dpElementorCss = [dpElementorCss, extractTemplateCss(dp.content)].filter(Boolean).join("\n") || undefined;
                  step("Building native Elementor widgets", "ok", "Template HTML converted to native containers + widgets");
                }
              } catch (e) {
                console.warn("[publish-pages] direct native Elementor conversion failed", e);
              }
            }
            if (!dpElementorData) {
              throw new Error(
                "WordPress publishing is native Elementor only. Provide native Elementor JSON (elementor_data) or publish from a campaign with a stored Elementor JSON template.",
              );
            }
            // NATIVE-ONLY GUARANTEE: never let a raw HTML widget reach WordPress.
            if (FORCE_NATIVE_ELEMENTOR) {
              try {
                dpElementorData = enforceNativeElementorData(
                  dpElementorData,
                  undefined,
                  (n) => step("Enforcing native widgets", "warn", `Rebuilt ${n} HTML widget(s) into native Elementor widgets`),
                );
              } catch (e) {
                throw new Error(
                  `WordPress publishing is native Elementor only and the page could not be made native: ${e instanceof Error ? e.message : String(e)}`,
                );
              }
            }
            payload.elementor_data = dpElementorData;
            payload.elementor_css = dpElementorCss;
            payload.elementor_mode = useExactDirectElementor ? "exact" : "native";
            step(
              useExactDirectElementor ? "Routing exact Elementor render" : "Routing native Elementor JSON",
              "ok",
              useExactDirectElementor ? "Original template HTML/CSS preserved for 1:1 output" : "Full-width containers + native widgets",
            );
          }


          // Final native-only assertion: never ship an HTML-widget page.
          if (
            FORCE_NATIVE_ELEMENTOR && (payload as { elementor_mode?: string }).elementor_mode &&
            elementorDataHasHtmlWidget((payload as { elementor_data?: string }).elementor_data)
          ) {
            throw new Error("Publish blocked: outgoing Elementor payload still contains a raw HTML widget (native-only guarantee).");
          }

          // If an external_id is provided, update the existing page; otherwise create new
          step(dp.external_id ? "Updating existing page" : "Creating page on site", "running");
          const result = dp.external_id
            ? await withTimeout(connector.updatePage(dp.external_id, payload), PAGE_PUBLISH_TIMEOUT_MS, `Publishing ${dp.title}`)
            : await withTimeout(connector.createPage(payload), PAGE_PUBLISH_TIMEOUT_MS, `Publishing ${dp.title}`);
          steps[steps.length - 1].status = "ok";
          steps[steps.length - 1].detail = result.url || result.external_id;

          // Independent post-publish verification: re-open the page in Elementor
          // to confirm it is truly made of editable native widgets.
          const verified = await verifyEditorReadiness(connector, result.external_id);
          let readiness = withParityStats(verified ?? result.editor_readiness ?? null, (payload as { elementor_data?: string }).elementor_data);
          if (readiness) {
            const ok = readiness.status === "passed";
            const widgets = typeof readiness.editable_widgets === "number" ? ` (${readiness.editable_widgets} editable widgets)` : "";
            step(
              "Verifying editor readiness",
              ok ? "ok" : "warn",
              ok
                ? `Opens in "Edit with Elementor"${widgets}`
                : (readiness.reason || "Editor verification incomplete"),
            );
          }

          // Automatic native re-import retry (no direct-publish fallback).
          if (!isReadinessHealthy(readiness)) {
            const retry = await retryNativeReimport(connector, result.external_id, payload, readiness, step);
            if (retry) readiness = retry.readiness;
          }



          // Save to generated_pages so it appears in the Generated Pages view
          try {
            await supabase.from("generated_pages").insert({
              title: dp.title,
              content: dp.content,
              slug: dp.slug,
              seo_title: dp.seo_title || dp.title,
              seo_description: dp.seo_description || null,
              seo_keywords: dp.seo_keywords || null,
              user_id: user.id,
              website_id,
              workspace_id: workspaceId,
              campaign_id: campaignId,
              status: "published",
              external_id: result.external_id,
              external_url: result.url,
              editor_readiness: readiness,
              publish_steps: steps,
            });

            step("Saving to Generated Pages", "ok");
          } catch (insertErr) {
            console.error("Failed to save to generated_pages:", insertErr);
            step("Saving to Generated Pages", "warn", "Saved on site but local record failed");
          }

          step("Published", "ok", result.url);
          results.push({ title: dp.title, status: "published", external_url: result.url, steps });

          // Audit log for publish
          try {
            await supabase.from("audit_logs").insert({
              workspace_id: workspaceId,
              user_id: user.id,
              action: "publish",
              entity_type: "page",
              entity_id: result.external_id || dp.slug,
              details: { title: dp.title, external_url: result.url, publish_type: pubType },
            });
          } catch (_) { /* non-critical */ }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          if (steps.length && steps[steps.length - 1].status === "running") {
            steps[steps.length - 1].status = "error";
            steps[steps.length - 1].detail = msg;
          }
          step("Publish failed", "error", msg);
          results.push({ title: dp.title, status: "failed", error: msg, steps });
        }
      }

      const published = results.filter((r) => r.status === "published").length;
      const failed = results.filter((r) => r.status === "failed").length;

      if (remainingDirectPages.length > 0) {
        fetch(`${supabaseUrl}/functions/v1/publish-pages`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            pages: remainingDirectPages,
            publish_type: pubType,
            website_id,
            overwrite_design: allowOverwriteDesign,
            elementor_mode: "native",
          }),
        }).catch((e) => console.error("[PUBLISH] Direct self-chain failed:", e));
      }

      return new Response(
        JSON.stringify({
          success: true,
          published,
          failed,
          results,
          ...(remainingDirectPages.length > 0 ? { remaining: remainingDirectPages.length, partial: true } : {}),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════
    // Standard mode – publish generated_pages by IDs
    // Batched: processes up to PUBLISH_BATCH_SIZE pages per
    // invocation, then self-chains for the remainder.
    // ═══════════════════════════════════════════════════════════
    if (!page_ids || !Array.isArray(page_ids) || page_ids.length === 0) {
      return new Response(JSON.stringify({ error: "page_ids array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Split into current batch and remainder for self-chaining
    const currentBatchIds = page_ids.slice(0, PUBLISH_BATCH_SIZE);
    const remainingIds = page_ids.slice(PUBLISH_BATCH_SIZE);
    // Accumulate results from prior batches (passed via self-chain)
    const priorResults: { id: string; status: string; external_url?: string; error?: string }[] = body._prior_results || [];

    let pagesQuery = supabase
      .from("generated_pages")
      .select("*, websites(id, url, type, credentials)")
      .in("id", currentBatchIds);
    if (!isAdmin) pagesQuery = pagesQuery.eq("user_id", user.id);
    const { data: pages, error: pagesError } = await pagesQuery;

    if (pagesError || !pages) {
      return new Response(JSON.stringify({ error: "Failed to fetch pages" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { id: string; status: string; external_url?: string; error?: string; elementor_source?: "catalog" | "exact"; elementor_similarity?: number; steps?: PublishStep[] }[] = [];

    // Cache page-template detection per website to avoid redundant checks
    const templateCache = new Map<string, { pageTemplate?: string }>();
    const elementorCatalogCache = new Map<string, unknown>();
    const shopifySectionKitCache = new Map<string, unknown>();

    const publishStartTime = Date.now();
    let pageIndex = 0;
    for (const page of pages) {
      // Timeout guard — self-chain remaining pages
      if (Date.now() - publishStartTime > PUBLISH_TIMEOUT_MS) {
        console.log(`[PUBLISH] Timeout after ${pageIndex} pages, self-chaining remaining`);
        const unprocessedIds = pages.slice(pageIndex).map((p: any) => p.id);
        const allRemaining = [...unprocessedIds, ...remainingIds];
        if (allRemaining.length > 0) {
          fetch(`${supabaseUrl}/functions/v1/publish-pages`, {
            method: "POST",
            headers: { Authorization: authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({
              page_ids: allRemaining, publish_type: pubType, website_id: fallbackWebsiteId,
              overwrite_design: allowOverwriteDesign, elementor_mode: "native", _prior_results: [...priorResults, ...results], as_admin: body.as_admin,
            }),
          }).catch(() => {});
        }
        const allResults = [...priorResults, ...results];
        const published = allResults.filter((r) => r.status === "published").length;
        const failed = allResults.filter((r) => r.status === "failed").length;
        return new Response(
          JSON.stringify({ success: true, published, failed, results: allResults, remaining: allRemaining.length, partial: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Small delay between publishes to reduce DB I/O spikes
      if (pageIndex > 0) await sleep(INTER_PUBLISH_DELAY_MS);
      pageIndex++;
      // Resolve website if not directly joined
      if (!page.websites) {
        const originalWebsiteId = page.website_id || null;
        let resolvedWebsiteId: string | null = originalWebsiteId;

        // Try resolving from campaign
        if (!resolvedWebsiteId && page.campaign_id) {
          const { data: campaign } = await supabase
            .from("campaigns")
            .select("website_id")
            .eq("id", page.campaign_id)
            .maybeSingle();
          resolvedWebsiteId = campaign?.website_id || null;
        }

        // Fall back to the website_id provided in the request body
        if (!resolvedWebsiteId && fallbackWebsiteId) {
          resolvedWebsiteId = fallbackWebsiteId;
        }

        if (resolvedWebsiteId) {
          const { data: website } = await supabase
            .from("websites")
            .select("id, url, type, credentials")
            .eq("id", resolvedWebsiteId)
            .maybeSingle();

          if (website) {
            page.websites = website;
            page.website_id = resolvedWebsiteId;

            if (originalWebsiteId !== resolvedWebsiteId) {
              await supabase.from("generated_pages").update({ website_id: resolvedWebsiteId }).eq("id", page.id);
            }
          }
        }
      }

      if (!page.websites) {
        results.push({ id: page.id, status: "failed", error: "No website connected" });
        await supabase.from("generated_pages").update({ status: "failed", error_message: "No website connected to publish to" }).eq("id", page.id);
        continue;
      }

      // Per-page publish timeline so users can track exactly what happened.
      const steps: PublishStep[] = [];
      const step = (label: string, status: PublishStep["status"], detail?: string) => {
        steps.push({ label, status, detail, at: new Date().toISOString() });
      };
      const finishRunning = (status: PublishStep["status"], detail?: string) => {
        if (steps.length && steps[steps.length - 1].status === "running") {
          steps[steps.length - 1].status = status;
          if (detail !== undefined) steps[steps.length - 1].detail = detail;
        }
      };
      try {
        const resolvedPublishType = inferPublishType(page, pubType);
        const platformLabel = (page.websites as { type?: string })?.type || "site";
        step("Connecting to store", "running", `${platformLabel} · ${resolvedPublishType}`);
        const connector = resolvedPublishType === "product"
          ? await createProductConnector(page.websites as WebsiteRecord)
          : await createConnector(page.websites as WebsiteRecord);
        finishRunning("ok");
        if ((page.websites as { type?: string })?.type === "wordpress" && resolvedPublishType === "page") {
          step("Verifying connector plugin", "running");
          await runWordPressConnectorPreflight(connector, "3xVisibility WordPress Connector");
          finishRunning("ok");
        }
        const cleanedContent = stripHeadTagsForCms(page.content);
        // Republish of an already-published CMS page → preserve existing on-site
        // design. Only metadata (title, slug, SEO meta, canonical) flows through.
        const isRepublish = !!page.external_id;
        const preserveDesign = isRepublish && !allowOverwriteDesign;

        // Detect the site's preferred page template (cached) so new pages inherit
        // the active theme layout.
        if (resolvedPublishType === "page" && !preserveDesign) {
          const wsKey = page.website_id || "default";
          if (!templateCache.has(wsKey)) {
            const detected = await detectPageTemplate(supabase, wsKey, (page.websites as any).type, connector);
            templateCache.set(wsKey, detected);
          }
        }


        // Resolve Shopify field mapping (campaign override → website default)
        let shopifyExtraData: Record<string, unknown> | undefined;
        if (resolvedPublishType === "product" && (page.websites as { type?: string }).type === "shopify") {
          step("Resolving Shopify field mapping", "running");
          try {
            const wsId = page.website_id;
              type ShopifyMapRow = { field_map?: Record<string, string>; variant_map?: Record<string, string>; metafields?: { namespace: string; key: string; type: string; value: string }[] };
              let mapRow: ShopifyMapRow | null = null;
            if (page.campaign_id) {
              const { data } = await supabase.from("shopify_field_mappings" as never).select("field_map,variant_map,metafields").eq("website_id", wsId).eq("campaign_id", page.campaign_id).maybeSingle();
                mapRow = (data as unknown as ShopifyMapRow | null) || null;
            }
            if (!mapRow && wsId) {
              const { data } = await supabase.from("shopify_field_mappings" as never).select("field_map,variant_map,metafields").eq("website_id", wsId).is("campaign_id", null).maybeSingle();
                mapRow = (data as unknown as ShopifyMapRow | null) || null;
            }
            if (mapRow) {
              // Pull row data from the campaign CSV by page slug/title
              let row: Record<string, string> = {};
              if (page.campaign_id) {
                const { data: c } = await supabase.from("campaigns").select("csv_data").eq("id", page.campaign_id).maybeSingle();
                const rows = (c?.csv_data as Record<string, string>[] | null) || [];
                row = rows.find((r) => r.slug === page.slug || r.title === page.title) || rows[0] || {};
              }

              // Hard-validate mapping + resolved values BEFORE touching Shopify so we
              // fail with a clear error instead of a cryptic Shopify API rejection.
              const defIssues = validateMapping({
                fieldMap: mapRow.field_map || {},
                variantMap: mapRow.variant_map || {},
                metafields: mapRow.metafields || [],
                knownVariables: Object.keys(row),
              }).filter((i) => i.severity === "error");
              const resolvedIssues = validateResolved({
                fieldMap: mapRow.field_map || {},
                variantMap: mapRow.variant_map || {},
                metafields: mapRow.metafields || [],
                row,
              }).filter((i) => i.severity === "error");
              const allErrors = [...defIssues, ...resolvedIssues];
              if (allErrors.length > 0) {
                const msg = `Shopify field mapping invalid: ${allErrors.map((e) => `${e.field} — ${e.message}`).join("; ")}`;
                console.error("[publish-pages]", msg, { pageId: page.id });
                await supabase.from("generated_pages").update({
                  status: "failed",
                  error_message: msg.slice(0, 1000),
                }).eq("id", page.id);
                step("Validation failed", "error", msg.slice(0, 200)); results.push({ id: page.id, status: "failed", error: msg, steps });
                continue;
              }

              const interp = (v: unknown): string | undefined => {
                if (v == null) return undefined;
                const s = String(v);
                return s.replace(/\{([a-z0-9_]+)\}/gi, (_m, k) => (row[k] != null ? String(row[k]) : ""));
              };
              const fm = mapRow.field_map || {};
              const vm = mapRow.variant_map || {};
              const blank = (s: string | undefined) => (s == null || s.trim() === "" ? undefined : s);
              const variantRaw = {
                option1: blank(interp(vm.option1)),
                option2: blank(interp(vm.option2)),
                option3: blank(interp(vm.option3)),
                compare_at_price: blank(interp(vm.compare_at_price)),
                inventory_quantity: vm.inventory_quantity ? parseInt(interp(vm.inventory_quantity) || "0", 10) : undefined,
                weight: vm.weight ? parseFloat(interp(vm.weight) || "0") : undefined,
                weight_unit: blank(interp(vm.weight_unit)) as "g" | "kg" | "oz" | "lb" | undefined,
                barcode: blank(interp(vm.barcode)),
              };
              // Numeric guards: drop NaN
              if (variantRaw.inventory_quantity != null && Number.isNaN(variantRaw.inventory_quantity)) variantRaw.inventory_quantity = undefined;
              if (variantRaw.weight != null && Number.isNaN(variantRaw.weight)) variantRaw.weight = undefined;
              const hasAnyVariant = Object.values(variantRaw).some((v) => v !== undefined);

              const metafieldsResolved = (mapRow.metafields || [])
                .map((m) => ({ ...m, value: interp(m.value) || "" }))
                .filter((m) => m.namespace?.trim() && m.key?.trim() && m.value.trim() !== "");

              const imagesResolved = interp(fm.images)
                ?.split(",").map((s) => s.trim()).filter(Boolean)
                .filter((src) => /^https?:\/\//i.test(src))
                .map((src) => ({ src }));

              const priceResolved = blank(interp(fm.price));
              if (priceResolved && Number.isNaN(parseFloat(priceResolved))) {
                const msg = `Shopify field mapping invalid: price resolved to non-numeric value "${priceResolved}"`;
                console.error("[publish-pages]", msg, { pageId: page.id });
                await supabase.from("generated_pages").update({ status: "failed", error_message: msg.slice(0, 1000) }).eq("id", page.id);
                step("Validation failed", "error", msg.slice(0, 200)); results.push({ id: page.id, status: "failed", error: msg, steps });
                continue;
              }

              shopifyExtraData = {
                price: priceResolved,
                sku: blank(interp(fm.sku)),
                handle: blank(interp(fm.handle)),
                body_html: blank(interp(fm.body_html)),
                vendor: blank(interp(fm.vendor)),
                product_type: blank(interp(fm.product_type)),
                tags: blank(interp(fm.tags)),
                product_status: blank(interp(fm.status)) as "active" | "draft" | "archived" | undefined,
                images: imagesResolved && imagesResolved.length > 0 ? imagesResolved : undefined,
                variant: hasAnyVariant ? variantRaw : undefined,
                metafields: metafieldsResolved.length > 0 ? metafieldsResolved : undefined,
              };
              // Strip top-level undefined keys so connector never sees junk
              for (const k of Object.keys(shopifyExtraData)) {
                if ((shopifyExtraData as Record<string, unknown>)[k] === undefined) delete (shopifyExtraData as Record<string, unknown>)[k];
              }

              // Final guard: title is mandatory for Shopify products
              const resolvedTitle = fm.title ? interp(fm.title) : page.title;
              if (!resolvedTitle || resolvedTitle.trim() === "") {
                const msg = "Shopify field mapping invalid: product title resolved to empty string";
                console.error("[publish-pages]", msg, { pageId: page.id });
                await supabase.from("generated_pages").update({ status: "failed", error_message: msg.slice(0, 1000) }).eq("id", page.id);
                step("Validation failed", "error", msg.slice(0, 200)); results.push({ id: page.id, status: "failed", error: msg, steps });
                continue;
              }
              if (fm.title) page.title = resolvedTitle;
              if (fm.seo_title) page.seo_title = interp(fm.seo_title) || page.seo_title;
              if (fm.seo_description) page.seo_description = interp(fm.seo_description) || page.seo_description;
            }
            finishRunning("ok", mapRow ? "Mapping applied" : "No mapping — using page fields");
          } catch (e) {
            console.warn("[publish-pages] shopify mapping resolve failed", e);
            finishRunning("warn", "Mapping resolve failed — using page fields");
          }
        }


        // Resolve the campaign's chosen publish format and forward it so the
        // WordPress connector emits Elementor or Gutenberg content accordingly.
        const publishFormat = await getCampaignPublishFormat(page.campaign_id);
        const websiteType = (page.websites as { type?: string })?.type;
        const payload = buildPayload(
          { title: page.title, content: cleanedContent, slug: page.slug, seo_title: page.seo_title, seo_description: page.seo_description, seo_keywords: page.seo_keywords, canonical_url: page.canonical_url },
          resolvedPublishType,
          resolvedPublishType === "product" ? (shopifyExtraData || {}) : undefined,
          (resolvedPublishType === "page" && !preserveDesign)
            ? templateCache.get(page.website_id || "default")?.pageTemplate
            : undefined,
          preserveDesign,
        );

        payload.publish_format = publishFormat;

        // WordPress page publishes: in Elementor format, ALWAYS use the stored
        // Elementor catalog template (editable JSON with new content applied +
        // validated). There is NO raw-HTML fallback. In Gutenberg format we skip
        // the catalog gate and publish native block content built from the
        // template HTML (images still imported into the WP Media Library).
        let elementorSource: "catalog" | "exact" | undefined;
        let elementorSimilarity: number | undefined;
        if (
          resolvedPublishType === "page" && !preserveDesign && publishFormat === "elementor" &&
          websiteType === "wordpress"
        ) {
          if (!FORCE_NATIVE_ELEMENTOR && shouldUseExactElementorRender(cleanedContent)) {
            payload.elementor_data = buildExactElementorData(cleanedContent);
            // Exact render already carries its <style> blocks inside the HTML
            // widget. Avoid duplicating CSS in post meta to keep the wp-json
            // publish request small enough for LiteSpeed/shared hosts.
            payload.elementor_css = undefined;
            payload.elementor_mode = "exact";
            elementorSource = "exact";
            elementorSimilarity = 100;
            step("Routing exact Elementor render", "ok", "Original template HTML/CSS preserved for 1:1 output");
          } else {
          const catalog = await resolveCatalogElementorData(supabase, page, elementorCatalogCache);
          if (!catalog) {
            const msg =
              "Publish blocked: no stored Elementor template found for this campaign. " +
              "Seed the template via seed-elementor-templates before publishing to WordPress.";
            console.error("[publish-pages]", msg, { pageId: page.id });
            await supabase.from("generated_pages").update({ status: "failed", error_message: msg.slice(0, 1000) }).eq("id", page.id);
            step("Validation failed", "error", msg.slice(0, 200)); results.push({ id: page.id, status: "failed", error: msg, steps });
            continue;
          }
          if (!catalog.ok) {
            const msg =
              `Publish blocked: visual similarity ${catalog.similarity}% is below the ` +
              `${ELEMENTOR_SIMILARITY_TARGET}% threshold after ${MAX_REBUILD_ATTEMPTS} rebuild attempts. ` +
              `Content could not be fit into the template design.`;
            console.error("[publish-pages]", msg, { pageId: page.id });
            await supabase.from("generated_pages").update({ status: "failed", error_message: msg.slice(0, 1000) }).eq("id", page.id);
            step("Visual similarity gate failed", "error", msg.slice(0, 200)); results.push({ id: page.id, status: "failed", error: msg, elementor_similarity: catalog.similarity, steps });
            continue;
          }
          // Template-Kit architecture: ship the NATIVE Elementor JSON tree from
          // the catalog (placeholder-only content applied). The page is fully
          // editable inside Elementor as native Containers + widgets. Image URLs
          // and CSS assets are uploaded/mapped by the connector plugin.
          let catalogData = catalog.data;
          // NATIVE-ONLY GUARANTEE: reject/rebuild any stray HTML widget so the
          // published page is always editable as native Elementor widgets.
          if (FORCE_NATIVE_ELEMENTOR) {
            try {
              catalogData = enforceNativeElementorData(
                catalogData,
                undefined,
                (n) => step("Enforcing native widgets", "warn", `Rebuilt ${n} HTML widget(s) into native Elementor widgets`),
              );
            } catch (e) {
              const msg = `Publish blocked: stored template is not native Elementor and could not be converted: ${e instanceof Error ? e.message : String(e)}`;
              console.error("[publish-pages]", msg, { pageId: page.id });
              await supabase.from("generated_pages").update({ status: "failed", error_message: msg.slice(0, 1000) }).eq("id", page.id);
              step("Native widget enforcement failed", "error", msg.slice(0, 200)); results.push({ id: page.id, status: "failed", error: msg, steps });
              continue;
            }
          }
          payload.elementor_data = catalogData;
          payload.elementor_css = catalog.css;
          payload.elementor_mode = "native";
          elementorSource = "catalog";
          elementorSimilarity = catalog.similarity;

          // CSS integrity check: warn loudly when a page would ship without any
          // template CSS so it can be diagnosed instead of silently unstyled.
          if (catalog.cssLength === 0) {
            console.warn(
              "[publish-pages] CSS integrity warning: no template CSS found for page",
              { pageId: page.id, campaignId: page.campaign_id },
            );
          }

          }
        }

        // Shopify page publishes: attach the stored Online Store 2.0 section kit
        // so the connector publishes a NATIVE section template (design 1:1,
        // images on the Shopify CDN, editable in the theme customizer). Falls
        // back to body_html inside the connector if the theme isn't writable.
        if (
          resolvedPublishType === "page" && !preserveDesign &&
          (page.websites as { type?: string })?.type === "shopify"
        ) {
          step("Loading Shopify section template", "running");
          const kit = await resolveShopifySectionKit(supabase, page, shopifySectionKitCache);
          if (kit) payload.shopify_section_kit = kit;
          finishRunning(kit ? "ok" : "warn", kit ? "Native OS 2.0 section attached" : "No section kit — using body HTML");
        }





        // Apply Shopify template suffix overrides (campaign or request body)
        const pageSuffixes = {
          ...(await getCampaignShopifySuffixes(page.campaign_id)),
          ...directShopifySuffixes,
        };
        applyShopifySuffix(payload, (page.websites as { type?: string })?.type, pageSuffixes, resolvedPublishType);

        // Final native-only assertion: never ship an HTML-widget page.
        if (
          FORCE_NATIVE_ELEMENTOR && (payload as { elementor_mode?: string }).elementor_mode &&
          elementorDataHasHtmlWidget((payload as { elementor_data?: string }).elementor_data)
        ) {
          const msg = "Publish blocked: outgoing Elementor payload still contains a raw HTML widget (native-only guarantee).";
          console.error("[publish-pages]", msg, { pageId: page.id });
          await supabase.from("generated_pages").update({ status: "failed", error_message: msg.slice(0, 1000) }).eq("id", page.id);
          finishRunning("error", msg.slice(0, 200)); results.push({ id: page.id, status: "failed", error: msg, steps });
          continue;
        }

        // If page was previously published (has external_id), update instead of creating
        step(page.external_id ? "Updating on store" : "Creating on store", "running");
        const result = page.external_id
          ? await withTimeout(connector.updatePage(page.external_id, payload), PAGE_PUBLISH_TIMEOUT_MS, `Publishing ${page.title}`)
          : await withTimeout(connector.createPage(payload), PAGE_PUBLISH_TIMEOUT_MS, `Publishing ${page.title}`);
        finishRunning("ok", result.url || result.external_id);

        // Independent post-publish verification: re-open the page in Elementor
        // to confirm it is truly made of editable native widgets, not raw HTML.
        step("Verifying editor readiness", "running", "Re-opening page in Elementor editor…");
        const verified = await verifyEditorReadiness(connector, result.external_id);
        let readiness = withParityStats(verified ?? result.editor_readiness ?? null, (payload as { elementor_data?: string }).elementor_data);
        if (readiness) {
          const ok = readiness.status === "passed";
          const widgets = typeof readiness.editable_widgets === "number" ? ` (${readiness.editable_widgets} editable widgets)` : "";
          finishRunning(
            ok ? "ok" : "warn",
            ok
              ? `Opens in "Edit with Elementor"${widgets}`
              : (readiness.reason || "Editor verification incomplete"),
          );
        } else {
          finishRunning("ok", "Not an Elementor site — skipped");
        }

        // Automatic native re-import retry: if the page did not pass editor
        // readiness, rebuild the failed widgets and republish through the native
        // template-library pipeline only (no direct-publish fallback).
        if (!isReadinessHealthy(readiness)) {
          const retry = await retryNativeReimport(connector, result.external_id, payload, readiness, step);
          if (retry) {
            readiness = retry.readiness;
            finishRunning(isReadinessHealthy(readiness) ? "ok" : "warn");
          }
        }


        step("Saving record", "running");
        await supabase.from("generated_pages").update({
          status: "published",
          external_id: result.external_id,
          external_url: result.url,
          error_message: null,
          editor_readiness: readiness,
        }).eq("id", page.id);

        finishRunning("ok");

        step("Published", "ok", result.url);
        // Persist the full step timeline so the per-page publish status is
        // visible in the Campaigns UI after the request completes.
        try {
          await supabase.from("generated_pages").update({ publish_steps: steps }).eq("id", page.id);
        } catch (_) { /* non-critical */ }
        results.push({ id: page.id, status: "published", external_url: result.url, elementor_source: elementorSource, elementor_similarity: elementorSimilarity, steps });

        // Audit log for publish
        try {
          const auditWsId = page.workspace_id || body.workspace_id;
          if (auditWsId) {
            await supabase.from("audit_logs").insert({
              workspace_id: auditWsId,
              user_id: user.id,
              action: "publish",
              entity_type: "page",
              entity_id: page.id,
              details: { title: page.title, external_url: result.url, publish_type: pubType },
            });
          }
        } catch (_) { /* non-critical */ }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown publishing error";
        finishRunning("error", errorMsg.slice(0, 200));
        step("Publish failed", "error", errorMsg.slice(0, 200));
        // If the failure came from the post-publish editor-readiness check, record
        // it as a structured readiness result so it surfaces in the pages list.
        const isEditorReadinessFailure = /edit with elementor|editor-readiness|editable .*widget/i.test(errorMsg);
        const failureUpdate: Record<string, unknown> = { status: "failed", error_message: errorMsg, publish_steps: steps };
        if (isEditorReadinessFailure) {
          failureUpdate.editor_readiness = {
            status: "failed",
            reason: errorMsg,
            attempts: null,
            editable_widgets: null,
            edit_mode: null,
            checked_at: new Date().toISOString(),
          };
        }
        await supabase.from("generated_pages").update(failureUpdate).eq("id", page.id);
        results.push({ id: page.id, status: "failed", error: errorMsg, steps });
      }
    }

    // Self-chain remaining pages if there are more to process
    if (remainingIds.length > 0) {
      console.log(`[PUBLISH] Batch done (${results.length} pages). Self-chaining ${remainingIds.length} remaining pages.`);
      fetch(`${supabaseUrl}/functions/v1/publish-pages`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          page_ids: remainingIds, publish_type: pubType, website_id: fallbackWebsiteId,
          overwrite_design: allowOverwriteDesign, elementor_mode: "native", _prior_results: [...priorResults, ...results], as_admin: body.as_admin,
        }),
      }).catch((e) => console.error("[PUBLISH] Self-chain failed:", e));
    }

    const allResults = remainingIds.length > 0 ? results : [...priorResults, ...results];
    const published = allResults.filter((r) => r.status === "published").length;
    const failed = allResults.filter((r) => r.status === "failed").length;

    return new Response(
      JSON.stringify({
        success: true, published, failed, results: allResults,
        ...(remainingIds.length > 0 ? { remaining: remainingIds.length, partial: true } : {}),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
