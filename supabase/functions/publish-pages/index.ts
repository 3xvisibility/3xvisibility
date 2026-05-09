import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createConnector, createProductConnector, type WebsiteRecord } from "../_shared/connectors/factory.ts";
import type { PagePayload } from "../_shared/connectors/types.ts";
import { validateMapping, validateResolved } from "../_shared/shopify-mapping-validation.ts";

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

/**
 * Wrap published content so it breaks out of the host theme's narrow content
 * column (Shopify Pages, WordPress page templates, etc.) and renders edge-to-edge,
 * matching the source design. Also resets host theme typography/spacing inside
 * the wrapper so generated sections control their own styles.
 */
function wrapForFullBleed(content: string, websiteType: string): string {
  // Avoid double-wrapping if content already starts with a full-bleed wrapper
  if (/class\s*=\s*["'][^"']*pgp-fullbleed/i.test(content)) return content;

  const wrapperCss = `
<style id="pgp-fullbleed-css">
  .pgp-fullbleed{
    position:relative;
    width:100vw;
    left:50%;
    right:50%;
    margin-left:-50vw;
    margin-right:-50vw;
    max-width:100vw;
    box-sizing:border-box;
  }
  .pgp-fullbleed *{box-sizing:border-box;}
  .pgp-fullbleed img{max-width:100%;height:auto;display:block;}
  .pgp-fullbleed h1,.pgp-fullbleed h2,.pgp-fullbleed h3,.pgp-fullbleed h4,.pgp-fullbleed h5,.pgp-fullbleed h6,
  .pgp-fullbleed p,.pgp-fullbleed ul,.pgp-fullbleed ol,.pgp-fullbleed li{margin:0;padding:0;}
  .pgp-fullbleed a{text-decoration:none;color:inherit;}
  /* Shopify/Dawn/Horizon: neutralise default page-width container around our content */
  .shopify-section .page-width:has(.pgp-fullbleed),
  .shopify-section .page-width .pgp-fullbleed{max-width:100vw!important;padding:0!important;}
</style>`.trim();

  return `${wrapperCss}\n<div class="pgp-fullbleed">${content}</div>`;
}


/**
 * Convert HTML content into an Elementor JSON structure (text editor widget).
 * This ensures the page renders correctly in Elementor's visual builder.
 */
function buildElementorData(htmlContent: string): string {
  const elementorStructure = [
    {
      id: generateElementorId(),
      elType: "section",
      settings: {
        structure: "10",
        padding: { unit: "px", top: "0", right: "0", bottom: "0", left: "0", isLinked: false },
      },
      elements: [
        {
          id: generateElementorId(),
          elType: "column",
          settings: { _column_size: 100, _inline_size: null },
          elements: [
            {
              id: generateElementorId(),
              elType: "widget",
              widgetType: "text-editor",
              settings: {
                editor: htmlContent,
              },
              elements: [],
            },
          ],
        },
      ],
    },
  ];
  return JSON.stringify(elementorStructure);
}

function generateElementorId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 7; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Check if a WordPress site uses Elementor by looking at existing pages' meta.
 */
async function detectElementor(
  supabase: any,
  websiteId: string,
  websiteType: string,
  connector: any
): Promise<{ usesElementor: boolean; pageTemplate?: string }> {
  if (websiteType !== "wordpress") return { usesElementor: false };

  try {
    if (typeof connector.listContent === "function") {
      const pages = await connector.listContent("pages");

      // Tally page_template usage across published pages so we mirror whatever
      // theme/builder template the site already uses (Elementor, Divi, default, etc.).
      const templateCounts = new Map<string, number>();
      let elementorPagesCount = 0;
      let elementorPreferredTemplate: string | undefined;

      for (const p of pages) {
        const tmpl = (p.page_template && String(p.page_template).trim()) || "default";
        templateCounts.set(tmpl, (templateCounts.get(tmpl) || 0) + 1);
        if (p.elementor_data || p.elementor_edit_mode) {
          elementorPagesCount++;
          if (!elementorPreferredTemplate && p.page_template) {
            elementorPreferredTemplate = p.page_template;
          }
        }
      }

      // Pick the most-frequently-used template across the site.
      let mostCommonTemplate: string | undefined;
      let maxCount = 0;
      for (const [tmpl, count] of templateCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          mostCommonTemplate = tmpl === "default" ? undefined : tmpl;
        }
      }

      if (elementorPagesCount > 0) {
        return {
          usesElementor: true,
          // Prefer the template used by other Elementor pages on the site;
          // fall back to the site-wide most-common template (matches the active theme/builder).
          pageTemplate: elementorPreferredTemplate || mostCommonTemplate,
        };
      }

      // Non-Elementor site: still mirror the site's dominant template so the new
      // page inherits the same theme layout as existing pages.
      if (mostCommonTemplate) {
        return { usesElementor: false, pageTemplate: mostCommonTemplate };
      }
    }
  } catch (err) {
    console.log("[PUBLISH] Template detection failed, using standard publish:", err);
  }
  return { usesElementor: false };
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
  elementorMeta?: { elementor_data?: string; elementor_edit_mode?: string; page_template?: string },
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

  // Forward the detected/explicit page_template so non-Elementor sites also
  // inherit the active theme's preferred template (e.g. Divi, Astra, default).
  // Skipped when preserving the live design — we don't want to retemplate the page.
  if (pageTemplate && !preserveDesign) {
    payload.page_template = pageTemplate;
  }

  if (elementorMeta?.elementor_data && !preserveDesign) {
    payload.elementor_meta = {
      elementor_data: elementorMeta.elementor_data,
      elementor_edit_mode: elementorMeta.elementor_edit_mode || "builder",
      page_template: elementorMeta.page_template,
    };
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

// Max pages to publish in a single invocation before self-chaining
const PUBLISH_BATCH_SIZE = 10;
// Small delay (ms) between individual page publishes to reduce DB I/O pressure
const INTER_PUBLISH_DELAY_MS = 200;
// Edge function soft timeout — leave headroom for the self-chain call
const PUBLISH_TIMEOUT_MS = 110_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    // Default behavior: when republishing an existing CMS page, preserve its
    // design (Elementor layout, theme blocks, builder structure) and only push
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
      const results: { title: string; status: string; external_url?: string; error?: string }[] = [];
      const workspaceId = website.workspace_id || body.workspace_id || null;
      const campaignId = body.campaign_id || null;

      // Auto-detect Elementor on first direct publish
      const elementorInfo = await detectElementor(supabase, website_id, website.type, connector);
      if (elementorInfo.usesElementor) {
        console.log("[PUBLISH] Detected Elementor on site, will publish with Elementor format");
      }

      for (const dp of directPages) {
        try {
          let cleanedContent = stripHeadTagsForCms(dp.content);
          if (website.type === "shopify" && pubType !== "product") {
            cleanedContent = wrapForFullBleed(cleanedContent, website.type);
          }
          // Republish of an already-published page → preserve existing on-site design.
          const isRepublish = !!dp.external_id;
          const preserveDesign = isRepublish && !allowOverwriteDesign;

          // If page already has Elementor data, use it; otherwise auto-generate if site uses Elementor.
          // Skipped entirely on design-preserving republishes.
          let elementorMeta = (!preserveDesign && dp.elementor_data)
            ? { elementor_data: dp.elementor_data, elementor_edit_mode: dp.elementor_edit_mode, page_template: dp.page_template }
            : undefined;

          if (!preserveDesign && !elementorMeta && elementorInfo.usesElementor) {
            elementorMeta = {
              elementor_data: buildElementorData(cleanedContent),
              elementor_edit_mode: "builder",
              page_template: elementorInfo.pageTemplate,
            };
          }

          const payload = buildPayload(
            { title: dp.title, content: cleanedContent, slug: dp.slug, seo_title: dp.seo_title, seo_description: dp.seo_description },
            pubType,
            elementorMeta,
            undefined,
            // Mirror the site's preferred template when no Elementor data is present.
            (!preserveDesign && !elementorMeta) ? elementorInfo.pageTemplate : undefined,
            preserveDesign,
          );

          // If an external_id is provided, update the existing page; otherwise create new
          const result = dp.external_id
            ? await connector.updatePage(dp.external_id, payload)
            : await connector.createPage(payload);

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
            });
          } catch (insertErr) {
            console.error("Failed to save to generated_pages:", insertErr);
          }

          results.push({ title: dp.title, status: "published", external_url: result.url });

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
          results.push({ title: dp.title, status: "failed", error: err instanceof Error ? err.message : "Unknown error" });
        }
      }

      const published = results.filter((r) => r.status === "published").length;
      const failed = results.filter((r) => r.status === "failed").length;
      return new Response(
        JSON.stringify({ success: true, published, failed, results }),
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

    const { data: pages, error: pagesError } = await supabase
      .from("generated_pages")
      .select("*, websites(id, url, type, credentials)")
      .in("id", currentBatchIds)
      .eq("user_id", user.id);

    if (pagesError || !pages) {
      return new Response(JSON.stringify({ error: "Failed to fetch pages" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { id: string; status: string; external_url?: string; error?: string }[] = [];

    // Cache Elementor detection per website to avoid redundant checks
    const elementorCache = new Map<string, { usesElementor: boolean; pageTemplate?: string }>();

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
              overwrite_design: allowOverwriteDesign, _prior_results: [...priorResults, ...results],
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

      try {
        const resolvedPublishType = inferPublishType(page, pubType);
        const connector = resolvedPublishType === "product"
          ? await createProductConnector(page.websites as WebsiteRecord)
          : await createConnector(page.websites as WebsiteRecord);
        const cleanedContent = stripHeadTagsForCms(page.content);
        // Republish of an already-published CMS page → preserve existing on-site
        // design (Elementor layout, theme blocks, builder structure). Only
        // metadata (title, slug, SEO meta, canonical) flows through.
        const isRepublish = !!page.external_id;
        const preserveDesign = isRepublish && !allowOverwriteDesign;

        let elementorMeta: { elementor_data: string; elementor_edit_mode: string; page_template?: string } | undefined;
        if (resolvedPublishType === "page" && !preserveDesign) {
          // Auto-detect Elementor for pages only (cached) — first publish only.
          const wsKey = page.website_id || "default";
          if (!elementorCache.has(wsKey)) {
            const detected = await detectElementor(supabase, wsKey, (page.websites as any).type, connector);
            elementorCache.set(wsKey, detected);
          }
          const elementorInfo = elementorCache.get(wsKey)!;

          if (elementorInfo.usesElementor) {
            elementorMeta = {
              elementor_data: buildElementorData(cleanedContent),
              elementor_edit_mode: "builder",
              page_template: elementorInfo.pageTemplate,
            };
          }
        }

        // Resolve Shopify field mapping (campaign override → website default)
        let shopifyExtraData: Record<string, unknown> | undefined;
        if (resolvedPublishType === "product" && (page.websites as { type?: string }).type === "shopify") {
          try {
            const wsId = page.website_id;
            let mapRow: { field_map?: Record<string, string>; variant_map?: Record<string, string>; metafields?: { namespace: string; key: string; type: string; value: string }[] } | null = null;
            if (page.campaign_id) {
              const { data } = await supabase.from("shopify_field_mappings" as never).select("field_map,variant_map,metafields").eq("website_id", wsId).eq("campaign_id", page.campaign_id).maybeSingle();
              mapRow = (data as typeof mapRow) || null;
            }
            if (!mapRow && wsId) {
              const { data } = await supabase.from("shopify_field_mappings" as never).select("field_map,variant_map,metafields").eq("website_id", wsId).is("campaign_id", null).maybeSingle();
              mapRow = (data as typeof mapRow) || null;
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
                results.push({ id: page.id, status: "failed", error: msg });
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
                results.push({ id: page.id, status: "failed", error: msg });
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
                results.push({ id: page.id, status: "failed", error: msg });
                continue;
              }
              if (fm.title) page.title = resolvedTitle;
              if (fm.seo_title) page.seo_title = interp(fm.seo_title) || page.seo_title;
              if (fm.seo_description) page.seo_description = interp(fm.seo_description) || page.seo_description;
            }
          } catch (e) {
            console.warn("[publish-pages] shopify mapping resolve failed", e);
          }
        }

        const payload = buildPayload(
          { title: page.title, content: cleanedContent, slug: page.slug, seo_title: page.seo_title, seo_description: page.seo_description, seo_keywords: page.seo_keywords, canonical_url: page.canonical_url },
          resolvedPublishType,
          elementorMeta,
          resolvedPublishType === "product" ? (shopifyExtraData || {}) : undefined,
          (resolvedPublishType === "page" && !elementorMeta && !preserveDesign)
            ? elementorCache.get(page.website_id || "default")?.pageTemplate
            : undefined,
          preserveDesign,
        );

        // If page was previously published (has external_id), update instead of creating
        const result = page.external_id
          ? await connector.updatePage(page.external_id, payload)
          : await connector.createPage(payload);

        await supabase.from("generated_pages").update({
          status: "published",
          external_id: result.external_id,
          external_url: result.url,
          error_message: null,
        }).eq("id", page.id);

        results.push({ id: page.id, status: "published", external_url: result.url });

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
        await supabase.from("generated_pages").update({ status: "failed", error_message: errorMsg }).eq("id", page.id);
        results.push({ id: page.id, status: "failed", error: errorMsg });
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
          overwrite_design: allowOverwriteDesign, _prior_results: [...priorResults, ...results],
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
});
