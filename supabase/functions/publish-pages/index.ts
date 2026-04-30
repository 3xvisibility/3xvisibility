import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createConnector, createProductConnector, type WebsiteRecord } from "../_shared/connectors/factory.ts";
import type { PagePayload } from "../_shared/connectors/types.ts";

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
    payload.product_data = {
      price: ed.price != null ? String(ed.price) : undefined,
      sku: ed.sku ? String(ed.sku) : undefined,
      handle: ed.handle ? String(ed.handle) : undefined,
      body_html: ed.body_html ? String(ed.body_html) : undefined,
      vendor: ed.vendor ? String(ed.vendor) : undefined,
      product_type: ed.product_type ? String(ed.product_type) : undefined,
      tags: (ed.tags as string | string[] | undefined) || undefined,
      product_status: (ed.product_status as "active" | "draft" | "archived" | undefined) || undefined,
      variant: (ed.variant as PagePayload["product_data"]!["variant"]) || undefined,
      metafields: (ed.metafields as PagePayload["product_data"]!["metafields"]) || undefined,
      images: (ed.images as { src: string; alt?: string }[] | undefined)
        || (ed.image ? [{ src: String(ed.image) }] : undefined),
    };
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
        .select("url, type, credentials, workspace_id")
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
          const cleanedContent = stripHeadTagsForCms(dp.content);
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
    // ═══════════════════════════════════════════════════════════
    if (!page_ids || !Array.isArray(page_ids) || page_ids.length === 0) {
      return new Response(JSON.stringify({ error: "page_ids array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pages, error: pagesError } = await supabase
      .from("generated_pages")
      .select("*, websites(url, type, credentials)")
      .in("id", page_ids)
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

    for (const page of pages) {
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
            .select("url, type, credentials")
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

        const payload = buildPayload(
          { title: page.title, content: cleanedContent, slug: page.slug, seo_title: page.seo_title, seo_description: page.seo_description, seo_keywords: page.seo_keywords, canonical_url: page.canonical_url },
          resolvedPublishType,
          elementorMeta,
          resolvedPublishType === "product" ? {} : undefined,
          // For non-Elementor sites on first publish, still forward the detected site template.
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

    const published = results.filter((r) => r.status === "published").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return new Response(
      JSON.stringify({ success: true, published, failed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
