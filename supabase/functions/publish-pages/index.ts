import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createConnector, createProductConnector, type WebsiteRecord } from "../_shared/connectors/factory.ts";
import type { PagePayload } from "../_shared/connectors/types.ts";
import { validateMapping, validateResolved } from "../_shared/shopify-mapping-validation.ts";
import { buildElementorFromCatalog } from "../_shared/connectors/elementor-catalog.ts";

/**
 * Resolve a stored Elementor catalog template for a generated page and overlay the
 * page's new content onto its editable fields. Chain:
 *   page.campaign_id → campaigns.template_id → templates.source_marketplace_id
 *     → elementor_templates.source_template_id → elementor_json
 * Returns a validated `_elementor_data` string, or null when no stored template
 * matches (caller falls back to HTML→Elementor conversion).
 */
const ELEMENTOR_SIMILARITY_TARGET = 98;
const MAX_REBUILD_ATTEMPTS = 4;

/** Trim a string to a fraction of its words (used by the rebuild loop). */
function shrinkText(text: string | undefined, keepFraction: number): string | undefined {
  if (!text) return text;
  const words = text.trim().split(/\s+/);
  if (words.length <= 1) return text;
  const keep = Math.max(1, Math.floor(words.length * keepFraction));
  return words.slice(0, keep).join(" ");
}

async function resolveCatalogElementorData(
  supabase: ReturnType<typeof createClient>,
  page: { campaign_id?: string | null; title: string; content: string; seo_description?: string | null },
  cache: Map<string, unknown>,
): Promise<{ data: string; similarity: number; truncatedFields: string[]; ok: boolean } | null> {
  try {
    if (!page.campaign_id) return null;

    let elementorJson: unknown;
    if (cache.has(page.campaign_id)) {
      elementorJson = cache.get(page.campaign_id);
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
        .from("elementor_templates").select("elementor_json")
        .eq("source_template_id", marketplaceId).maybeSingle();
      elementorJson = (stored as { elementor_json?: unknown } | null)?.elementor_json ?? null;
      cache.set(page.campaign_id, elementorJson);
    }

    if (!elementorJson) return null;

    // Automatic rebuild loop: regenerate fields (progressively shrinking content)
    // until the visual similarity check reaches the target or attempts run out.
    let best: { data: string; similarity: number; truncatedFields: string[] } | null = null;
    for (let attempt = 0; attempt < MAX_REBUILD_ATTEMPTS; attempt++) {
      const keepFraction = 1 - attempt * 0.15;
      const built = buildElementorFromCatalog(elementorJson, {
        title: shrinkText(page.title, keepFraction),
        description: shrinkText(page.seo_description || undefined, keepFraction),
        bodyHtml: page.content,
      }, ELEMENTOR_SIMILARITY_TARGET);
      if (!built) return null;
      if (!best || built.similarity > best.similarity) best = built;
      if (built.similarity >= ELEMENTOR_SIMILARITY_TARGET) break;
    }
    if (!best) return null;

    const ok = best.similarity >= ELEMENTOR_SIMILARITY_TARGET;
    console.log(
      `[publish-pages] catalog Elementor rebuilt (similarity ${best.similarity}%, ` +
      `target ${ELEMENTOR_SIMILARITY_TARGET}%, ok=${ok}, truncated ${best.truncatedFields.length})`,
    );
    return { ...best, ok };
  } catch (e) {
    console.warn("[publish-pages] catalog Elementor resolve failed", e);
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

/**
 * Detect the WordPress site's most-common page template so new pages inherit the
 * active theme's preferred layout.
 */
async function detectPageTemplate(
  supabase: any,
  websiteId: string,
  websiteType: string,
  connector: any
): Promise<{ pageTemplate?: string }> {
  if (websiteType !== "wordpress") return {};

  try {
    if (typeof connector.listContent === "function") {
      const pages = await connector.listContent("pages");
      const templateCounts = new Map<string, number>();
      for (const p of pages) {
        const tmpl = (p.page_template && String(p.page_template).trim()) || "default";
        templateCounts.set(tmpl, (templateCounts.get(tmpl) || 0) + 1);
      }
      let mostCommonTemplate: string | undefined;
      let maxCount = 0;
      for (const [tmpl, count] of templateCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          mostCommonTemplate = tmpl === "default" ? undefined : tmpl;
        }
      }
      if (mostCommonTemplate) return { pageTemplate: mostCommonTemplate };
    }
  } catch (err) {
    console.log("[PUBLISH] Template detection failed, using standard publish:", err);
  }
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
      const results: { title: string; status: string; external_url?: string; error?: string }[] = [];
      const workspaceId = website.workspace_id || body.workspace_id || null;
      const campaignId = body.campaign_id || null;

      // Detect the site's preferred page template on first direct publish
      const templateInfo = await detectPageTemplate(supabase, website_id, website.type, connector);

      for (const dp of directPages) {
        try {
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

    const results: { id: string; status: string; external_url?: string; error?: string; elementor_source?: "catalog" | "html-fallback"; elementor_similarity?: number }[] = [];

    // Cache page-template detection per website to avoid redundant checks
    const templateCache = new Map<string, { pageTemplate?: string }>();
    const elementorCatalogCache = new Map<string, unknown>();

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
              overwrite_design: allowOverwriteDesign, _prior_results: [...priorResults, ...results], as_admin: body.as_admin,
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
          resolvedPublishType === "product" ? (shopifyExtraData || {}) : undefined,
          (resolvedPublishType === "page" && !preserveDesign)
            ? templateCache.get(page.website_id || "default")?.pageTemplate
            : undefined,
          preserveDesign,
        );

        // WordPress page publishes: ALWAYS use the stored Elementor catalog
        // template (editable JSON with new content applied + validated). There is
        // NO raw-HTML fallback — if no matching template is seeded, or the rebuild
        // loop cannot reach the visual-similarity target, the page fails with a
        // clear report so the design integrity is never compromised.
        let elementorSource: "catalog" | undefined;
        let elementorSimilarity: number | undefined;
        if (
          resolvedPublishType === "page" && !preserveDesign &&
          (page.websites as { type?: string })?.type === "wordpress"
        ) {
          const catalog = await resolveCatalogElementorData(supabase, page, elementorCatalogCache);
          if (!catalog) {
            const msg =
              "Publish blocked: no stored Elementor template found for this campaign. " +
              "Seed the template via seed-elementor-templates before publishing to WordPress.";
            console.error("[publish-pages]", msg, { pageId: page.id });
            await supabase.from("generated_pages").update({ status: "failed", error_message: msg.slice(0, 1000) }).eq("id", page.id);
            results.push({ id: page.id, status: "failed", error: msg });
            continue;
          }
          if (!catalog.ok) {
            const msg =
              `Publish blocked: visual similarity ${catalog.similarity}% is below the ` +
              `${ELEMENTOR_SIMILARITY_TARGET}% threshold after ${MAX_REBUILD_ATTEMPTS} rebuild attempts. ` +
              `Content could not be fit into the template design.`;
            console.error("[publish-pages]", msg, { pageId: page.id });
            await supabase.from("generated_pages").update({ status: "failed", error_message: msg.slice(0, 1000) }).eq("id", page.id);
            results.push({ id: page.id, status: "failed", error: msg, elementor_similarity: catalog.similarity });
            continue;
          }
          payload.elementor_data = catalog.data;
          elementorSource = "catalog";
          elementorSimilarity = catalog.similarity;
        }



        // Apply Shopify template suffix overrides (campaign or request body)
        const pageSuffixes = {
          ...(await getCampaignShopifySuffixes(page.campaign_id)),
          ...directShopifySuffixes,
        };
        applyShopifySuffix(payload, (page.websites as { type?: string })?.type, pageSuffixes, resolvedPublishType);

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

        results.push({ id: page.id, status: "published", external_url: result.url, elementor_source: elementorSource, elementor_similarity: elementorSimilarity });

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
          overwrite_design: allowOverwriteDesign, _prior_results: [...priorResults, ...results], as_admin: body.as_admin,
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
