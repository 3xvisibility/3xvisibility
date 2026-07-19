import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createConnector, createProductConnector, type WebsiteRecord } from "../_shared/connectors/factory.ts";
import { deductCreditsForRequest } from "../_shared/ai-service.ts";
import {
  analyzeSeoQuality,
  autoRepairContent,
  buildQualityRepairChecklist,
  derivePrimaryKeyword,
  ensurePrimaryKeywordFirst,
  needsQualityRepair,
  trimTextAtWordBoundary,
} from "../_shared/seo-quality.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};




// Metadata-only tweaks can use the cheap lite model; a full body rewrite
// requires the stronger flash model — the lite one tends to echo the input
// HTML back unchanged instead of actually rewriting every heading/paragraph,
// which is exactly what users are hitting when "only meta text changes".
const METADATA_MODEL = "google/gemini-2.5-flash-lite";
const CONTENT_REWRITE_MODEL = "google/gemini-2.5-flash";
const MAX_QUALITY_REPAIR_ATTEMPTS = 1;
// Stop the repair loop once we're approaching the 150s edge function idle timeout.
// Leaves headroom for CMS push + DB writes after the AI loop completes.
const FUNCTION_BUDGET_MS = 115_000;
const CMS_PUSH_TIMEOUT_MS = 25_000;
const REPAIR_LOOP_BUDGET_MS = 35_000;

function parseOptimizationResult(aiData: any): Record<string, any> {
  let result: Record<string, any> = {};
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

  if (toolCall?.function?.arguments) {
    try {
      result = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch {
      const raw = aiData.choices?.[0]?.message?.content || "";
      try {
        result = JSON.parse(raw.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, ""));
      } catch {
        result = {};
      }
    }
  }

  if (!result.seo_title && !result.seo_description && !result.seo_keywords && !result.content) {
    const raw = aiData.choices?.[0]?.message?.content || "";
    try {
      result = JSON.parse(raw.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, ""));
    } catch {
      result = {};
    }
  }

  return result;
}

// Hard per-call timeout so a slow AI response fails fast instead of hanging
// until the edge function's 150s idle timeout (which returns an opaque 504).
const AI_CALL_TIMEOUT_MS = 45_000;

function timeoutError(message: string, status = 504, details?: string) {
  const error = new Error(message) as Error & { status?: number; details?: string };
  error.status = status;
  error.details = details;
  return error;
}

function remainingBudgetMs(startedAt: number, reserveMs = 10_000) {
  return Math.max(0, FUNCTION_BUDGET_MS - (Date.now() - startedAt) - reserveMs);
}

function ensureBudget(startedAt: number, label: string, reserveMs = 10_000) {
  if (remainingBudgetMs(startedAt, reserveMs) <= 0) {
    throw timeoutError(`${label} timed out before the backend execution limit`, 504, `Exceeded ${FUNCTION_BUDGET_MS}ms safe function budget`);
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(timeoutError(message, 504, `Timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function requestOptimizationDraft(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  timeoutMs = AI_CALL_TIMEOUT_MS,
  model: string = METADATA_MODEL,
) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    signal: ac.signal,
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "seo_optimization_result",
            description: "Return SEO optimization results compatible with Yoast/RankMath high-score checks",
            parameters: {
              type: "object",
              properties: {
                seo_title: { type: "string", description: "SEO title 30-60 chars with keyword near the start" },
                seo_description: { type: "string", description: "Meta description 120-156 chars with keyword, benefit, CTA, and local cue" },
                seo_keywords: { type: "array", items: { type: "string" }, description: "5-8 keywords with the exact primary keyword first" },
                content: { type: "string", description: "HTML with identical structure, only text optimized for stronger SEO/SEA/GEO scores" },
              },
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "seo_optimization_result" } },
    }),
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw timeoutError("AI generation timed out", 504, `AI call exceeded ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const details = await response.text();
    const error = new Error("AI generation failed") as Error & { status?: number; details?: string };
    error.status = response.status;
    error.details = details;
    throw error;
  }

  return parseOptimizationResult(await response.json());
}

function normalizeOptimizationResult(
  rawResult: Record<string, any>,
  fallback: {
    title: string;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string[];
    slug: string;
    url?: string;
    content: string;
  },
  requestedFields: string[],
  includeContent: boolean,
) {
  const fallbackKeyword = derivePrimaryKeyword(fallback);
  let seoTitle = trimTextAtWordBoundary(String(rawResult.seo_title || fallback.seoTitle || fallback.title || "").trim(), 60);
  const seoDescription = trimTextAtWordBoundary(String(rawResult.seo_description || fallback.seoDescription || "").trim(), 156);

  // ── Deterministic SEO title polish: ensure uniqueness (separator) + action word for SEA score ──
  const ACTION_WORD_RE = /\b(buy|get|shop|order|book|reserve|request|contact|call|discover|subscribe|free|best|top|new|save|deal|premium|try|hire|find|learn)\b/i;
  const SEPARATOR_RE = /[|\-–·•:]/;
  const provisionalKeyword = (Array.isArray(rawResult.seo_keywords) && typeof rawResult.seo_keywords[0] === "string"
    ? rawResult.seo_keywords[0]
    : fallback.seoKeywords?.[0]) || fallbackKeyword || "Trusted Local Service";

  if (seoTitle) {
    // 1. Add separator + keyword tag if missing (and we have room)
    if (!SEPARATOR_RE.test(seoTitle)) {
      const tag = String(provisionalKeyword).trim().slice(0, 28);
      const candidate = `${seoTitle} | ${tag}`;
      seoTitle = candidate.length <= 60 ? candidate : trimTextAtWordBoundary(candidate, 60);
    }
    // 2. Prepend an action word if missing
    if (!ACTION_WORD_RE.test(seoTitle)) {
      const candidate = `Get ${seoTitle}`;
      seoTitle = candidate.length <= 60 ? candidate : trimTextAtWordBoundary(candidate, 60);
    }
    // 3. Final length safety (>= 30 chars target)
    if (seoTitle.length < 30) {
      const padded = `${seoTitle} — Trusted Local Service`;
      seoTitle = padded.length <= 60 ? padded : trimTextAtWordBoundary(padded, 60);
    }
  }
  const content = includeContent
    ? (typeof rawResult.content === "string" && rawResult.content.trim().length > 0 ? rawResult.content : fallback.content)
    : undefined;
  const primaryKeyword = derivePrimaryKeyword({
    ...fallback,
    seoTitle,
    seoDescription,
    seoKeywords: rawResult.seo_keywords ?? fallback.seoKeywords,
    content: content || fallback.content,
  }) || fallbackKeyword;

  return {
    ...(requestedFields.includes("seo_title") ? { seo_title: seoTitle } : {}),
    ...(requestedFields.includes("seo_description") ? { seo_description: seoDescription } : {}),
    ...(requestedFields.includes("seo_keywords") ? { seo_keywords: ensurePrimaryKeywordFirst(primaryKeyword, rawResult.seo_keywords ?? fallback.seoKeywords).slice(0, 8) } : {}),
    ...(includeContent ? { content } : {}),
  };
}

async function handleOptimizeSeoContent(req: Request, functionStartedAt = Date.now()): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      website_id,
      page_external_id,
      page_title,
      page_content,
      page_slug,
      page_url,
      page_type,
      workspace_id,
      optimize_fields,
      content_sections,
      language,
      instruction,
      manual_update,
      manual_title,
      manual_content,
      manual_excerpt,
      skip_push,
      seo_title,
      seo_description,
      seo_keywords,
      page_seo_title,
      page_seo_description,
      page_seo_keywords,
      update_template,
      overwrite_design,
      force_republish,
    } = body;
    const requestedSections: string[] = Array.isArray(content_sections)
      ? content_sections.filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
      : [];
    // Republishing an existing CMS page → preserve its on-site design (Elementor
    // layout, theme blocks, builder structure) by default. Caller can opt out
    // with `overwrite_design: true` (e.g. manual full-rewrite flows). When the
    // caller explicitly supplies `manual_content`, we treat it as an intentional
    // body update so the new content actually reaches the CMS.
    // `force_republish` is a stronger opt-out: it forces a raw HTML push and
    // clears Elementor edit-mode meta so the new content actually renders on
    // pages that were previously built with Elementor.
    const forceRepublish = force_republish === true;
    const allowOverwriteDesign = forceRepublish || overwrite_design === true || !!manual_content;
    const preserveDesign = !allowOverwriteDesign;

    if (!website_id) {
      return new Response(JSON.stringify({ error: "website_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Audit trail: log every Force republish so admins can trace who forced a
    // republish, when, to which page, and with what flags. Fire-and-forget —
    // failure here must never block the actual publish flow.
    if (forceRepublish) {
      (async () => {
        try {
          let wsId: string | null = workspace_id || null;
          if (!wsId) {
            const { data: ws } = await supabase
              .from("websites")
              .select("workspace_id")
              .eq("id", website_id)
              .maybeSingle();
            wsId = ws?.workspace_id ?? null;
          }
          if (!wsId) return;
          const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("cf-connecting-ip") ||
            null;
          await supabase.from("audit_logs").insert({
            workspace_id: wsId,
            user_id: user.id,
            action: "force_republish",
            entity_type: page_type === "product" ? "product" : "page",
            entity_id: page_external_id ? String(page_external_id) : null,
            ip_address: ip,
            details: {
              website_id,
              page_url: page_url || null,
              page_slug: page_slug || null,
              page_title: page_title || null,
              page_type: page_type || "page",
              flags: {
                force_republish: true,
                overwrite_design: overwrite_design === true,
                manual_update: manual_update === true,
                update_template: update_template === true,
                skip_push: skip_push === true,
                has_manual_content: !!manual_content,
              },
              optimize_fields: Array.isArray(optimize_fields) ? optimize_fields : null,
              language: language || null,
            },
          });
        } catch (logErr) {
          console.error("[AUDIT] force_republish log failed:", logErr);
        }
      })();
    }


    // ── Manual update mode: skip AI, just push edited content to CMS ──
    if (manual_update) {
      const { data: website } = await supabase
        .from("websites")
        .select("id, url, type, credentials, workspace_id")
        .eq("id", website_id)
        .maybeSingle();

      if (!website) {
        return new Response(JSON.stringify({ error: "Website not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let pushResult: { external_id?: string; url?: string } | null = null;
      let pushError: string | null = null;

      // Snapshot the previously stored known-good content before overwriting it,
      // so this page can be rolled back if the new content breaks the layout.
      if (page_external_id) {
        try {
          const { data: prior } = await supabase
            .from("generated_pages")
            .select("title, content, slug, seo_title, seo_description, seo_keywords")
            .eq("website_id", website_id)
            .eq("external_id", page_external_id)
            .eq("user_id", user.id)
            .maybeSingle();
          const snapTitle = prior?.title ?? page_title ?? null;
          const snapContent = prior?.content ?? page_content ?? null;
          if (snapContent || snapTitle) {
            await supabase.from("page_versions").insert({
              user_id: user.id,
              workspace_id: workspace_id || website?.workspace_id || null,
              website_id,
              external_id: page_external_id,
              page_type: page_type || "page",
              title: snapTitle,
              content: snapContent,
              slug: prior?.slug ?? page_slug ?? null,
              seo_title: prior?.seo_title ?? null,
              seo_description: prior?.seo_description ?? null,
              seo_keywords: prior?.seo_keywords ?? null,
              source: "pre_manual_update",
            });
            console.log("[MANUAL] Saved pre-update snapshot to page_versions");
          }
        } catch (snapErr) {
          console.error("[MANUAL] Failed to save snapshot:", snapErr);
        }
      }


      try {
        ensureBudget(functionStartedAt, "Manual CMS update", 35_000);
        const isProductContent = page_type === "product";
        const connector = isProductContent
          ? await createProductConnector(website as WebsiteRecord)
          : await createConnector(website as WebsiteRecord);
        const nextContent = manual_content || page_content;
        const updatePayload: Record<string, any> = {
          title: manual_title || page_title,
          slug: page_slug,
          content: nextContent,
          status: "publish",
        };
        if (isProductContent) updatePayload.product_data = { handle: page_slug || undefined };
        if (preserveDesign) updatePayload.preserve_design = true;
        if (forceRepublish) updatePayload.publish_format = "html";
        if (manual_excerpt) updatePayload.excerpt = manual_excerpt;
        if (seo_title) updatePayload.seo_title = seo_title;
        if (seo_description) updatePayload.seo_description = seo_description;
        if (seo_keywords?.length) updatePayload.seo_keywords = seo_keywords;
        pushResult = await withTimeout(
          connector.updatePage(page_external_id, updatePayload),
          Math.min(CMS_PUSH_TIMEOUT_MS, Math.max(8_000, remainingBudgetMs(functionStartedAt, 8_000))),
          "CMS update timed out. The connected site did not respond quickly enough; please retry or update metadata only.",
        );
        console.log(`[MANUAL] Updated existing ${isProductContent ? 'product' : 'page'} on CMS:`, pushResult);
      } catch (pushErr: any) {
        pushError = pushErr.message || "CMS update failed";
        console.error("[MANUAL] CMS push failed:", pushErr);
      }

      // Track in generated_pages — also look up linked campaign/template
      const wsId = workspace_id || website?.workspace_id || null;
      const { data: existingPage } = await supabase
        .from("generated_pages")
        .select("id, campaign_id")
        .eq("website_id", website_id)
        .eq("external_id", page_external_id || "")
        .eq("user_id", user.id)
        .maybeSingle();

      const pageRecord: Record<string, any> = {
        title: manual_title || page_title,
        content: manual_content || page_content,
        slug: page_slug || "",
        seo_title: seo_title || null,
        seo_description: seo_description || null,
        seo_keywords: seo_keywords?.length ? seo_keywords : null,
        user_id: user.id,
        website_id,
        workspace_id: wsId,
        status: pushResult ? "published" : "generated",
        external_id: page_external_id || (pushResult?.external_id || null),
        external_url: pushResult?.url || page_url || null,
      };

      if (existingPage) {
        await supabase.from("generated_pages").update(pageRecord).eq("id", existingPage.id);
      } else {
        await supabase.from("generated_pages").insert(pageRecord);
      }

      // ── Update linked template & campaign if requested ──
      let templateUpdated = false;
      let campaignUpdated = false;

      if (update_template && existingPage?.campaign_id) {
        try {
          // Get campaign with template
          const { data: campaign } = await supabase
            .from("campaigns")
            .select("id, template_id, csv_data")
            .eq("id", existingPage.campaign_id)
            .maybeSingle();

          if (campaign) {
            // Update template SEO patterns
            if (campaign.template_id && (seo_title || seo_description)) {
              const templateUpdate: Record<string, any> = { updated_at: new Date().toISOString() };

              if (seo_title) templateUpdate.seo_title_pattern = seo_title;
              if (seo_description) templateUpdate.seo_description_pattern = seo_description;

              // Also update template content if content was changed
              if (manual_content && manual_content !== page_content) {
                templateUpdate.content = manual_content;

                // Extract new variables from the updated content
                const varMatches = manual_content.match(/\{([a-z_][a-z0-9_]*)\}/gi) || [];
                const vars = [...new Set(varMatches.map((v: string) => v.slice(1, -1)))];
                if (vars.length > 0) {
                  templateUpdate.variables = vars;
                }
              }

              await supabase
                .from("templates")
                .update(templateUpdate)
                .eq("id", campaign.template_id);
              templateUpdated = true;
              console.log("[MANUAL] Updated template SEO patterns:", campaign.template_id);
            }

            // Update the campaign's CSV data row that matches this page's slug
            if (campaign.csv_data && Array.isArray(campaign.csv_data)) {
              const csvRows = campaign.csv_data as Record<string, any>[];
              const slug = page_slug || "";
              let rowUpdated = false;

              for (let i = 0; i < csvRows.length; i++) {
                const row = csvRows[i];
                // Match by slug-related fields
                const rowSlug = row.slug || row.url_slug || row.page_slug || "";
                const rowTitle = row.title || row.name || row.page_title || "";

                if (
                  (rowSlug && slug.includes(rowSlug.toLowerCase())) ||
                  (rowTitle && (manual_title || page_title || "").toLowerCase().includes(rowTitle.toLowerCase()))
                ) {
                  // Update the row with new SEO values
                  if (seo_title) {
                    if ("seo_title" in row) row.seo_title = seo_title;
                    if ("title" in row) row.title = manual_title || seo_title;
                    if ("name" in row) row.name = manual_title || seo_title;
                    if ("page_title" in row) row.page_title = manual_title || seo_title;
                  }
                  if (seo_description) {
                    if ("seo_description" in row) row.seo_description = seo_description;
                    if ("description" in row) row.description = seo_description;
                    if ("meta_description" in row) row.meta_description = seo_description;
                    if ("excerpt" in row) row.excerpt = seo_description;
                  }
                  if (seo_keywords?.length) {
                    if ("seo_keywords" in row) row.seo_keywords = seo_keywords.join(", ");
                    if ("keywords" in row) row.keywords = seo_keywords.join(", ");
                  }

                  csvRows[i] = row;
                  rowUpdated = true;
                  break;
                }
              }

              if (rowUpdated) {
                await supabase
                  .from("campaigns")
                  .update({ csv_data: csvRows as any, updated_at: new Date().toISOString() })
                  .eq("id", campaign.id);
                campaignUpdated = true;
                console.log("[MANUAL] Updated campaign CSV row for slug:", slug);
              }
            }
          }
        } catch (syncErr: any) {
          console.error("[MANUAL] Template/campaign sync error:", syncErr);
          // Non-critical — continue
        }
      }

      // Audit log
      try {
        if (wsId) {
          await supabase.from("audit_logs").insert({
            workspace_id: wsId,
            user_id: user.id,
            action: "manual_seo_update",
            entity_type: page_type || "page",
            entity_id: page_external_id || page_slug,
            details: {
              title: manual_title || page_title,
              pushed_to_cms: !!pushResult,
              template_updated: templateUpdated,
              campaign_updated: campaignUpdated,
            },
          });
        }
      } catch (_) { /* non-critical */ }

      return new Response(JSON.stringify({
        success: true,
        pushed_to_cms: !!pushResult,
        push_error: pushError,
        external_url: pushResult?.url || page_url,
        template_updated: templateUpdated,
        campaign_updated: campaignUpdated,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!page_content) {
      return new Response(JSON.stringify({ error: "page_content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check subscription limits
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("ai_generations_used, ai_generations_limit, pages_used, pages_limit")
      .eq("user_id", user.id)
      .maybeSingle();

    if (sub && sub.ai_generations_used >= sub.ai_generations_limit) {
      return new Response(JSON.stringify({ error: "AI generation limit reached. Please upgrade your plan." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestedFields = Array.isArray(optimize_fields) && optimize_fields.length > 0
      ? optimize_fields
      : ["seo_title", "seo_description", "seo_keywords"];
    // Live CMS optimizations preserve builder/design output by default. In that
    // mode, rewritten body HTML is intentionally not pushed, so asking the AI to
    // rewrite a full page only burns time until the 150s idle timeout. Keep the
    // request metadata-only unless the caller explicitly opted into design/content
    // overwrite, or the caller is only drafting locally with skip_push.
    const fields = preserveDesign && !skip_push
      ? requestedFields.filter((field: string) => field !== "content")
      : requestedFields;
    const metadataOnly = !fields.includes("content");
    const existingSeoKeywords = Array.isArray(page_seo_keywords)
      ? page_seo_keywords.filter((keyword: unknown): keyword is string => typeof keyword === "string" && keyword.trim().length > 0)
      : [];
    const primaryKeyword = existingSeoKeywords[0] || "";
    const effectiveSeoTitle = typeof page_seo_title === "string" && page_seo_title.trim().length > 0
      ? page_seo_title.trim()
      : page_title || "";
    const effectiveSeoDescription = typeof page_seo_description === "string" && page_seo_description.trim().length > 0
      ? page_seo_description.trim()
      : "";
    // Resolve effective language: explicit param → website setting → auto-detect.
    // This guarantees that if the connected website has a configured language
    // (e.g. French), all republished/optimized content uses it even when the caller
    // forgets to pass `language` in the request body.
    let effectiveLanguage: string | null = typeof language === "string" && language.trim().length > 0
      ? language.trim()
      : null;
    if (!effectiveLanguage && website_id) {
      try {
        const { data: siteRow } = await supabase
          .from("websites")
          .select("language")
          .eq("id", website_id)
          .maybeSingle();
        const siteLang = (siteRow as { language?: string | null } | null)?.language;
        if (typeof siteLang === "string" && siteLang.trim().length > 0) {
          effectiveLanguage = siteLang.trim();
        }
      } catch (_) { /* non-critical */ }
    }

    const lang = effectiveLanguage
      || (primaryKeyword ? "same as the exact focus keyword phrase and current page URL" : "auto-detect from the existing page content and title");

    // Build a stronger language instruction for the AI
    const languageInstruction = effectiveLanguage
      ? `CRITICAL LANGUAGE RULE: ALL output (seo_title, seo_description, seo_keywords, and content) MUST be written in ${effectiveLanguage}. Do NOT output in English unless the language IS English. The website content language is ${effectiveLanguage} — respect it exactly. Translate any English source text into ${effectiveLanguage}.`
      : "LANGUAGE RULE: Detect the language from the existing page content and title. ALL output MUST be in that same language. Do NOT translate to English if the original content is in another language.";

    // Strip HTML to get plain text for AI analysis
    const plainText = page_content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const truncatedText = plainText.slice(0, metadataOnly ? 1200 : 3000);

    // ── Reversible design preservation ──────────────────────────────────────
    // We must NEVER lose the page's <style>/<script> blocks (that's what
    // destroys the layout on republish). Instead of deleting them before the AI
    // call, we swap each block for a UNIQUE comment placeholder, then restore
    // the EXACT original blocks into the AI output afterwards. We also track if
    // the HTML had to be truncated so we never push a cut-off body.
    const CONTENT_CAP = 20000;
    const preservedBlocks: string[] = [];
    let contentTruncated = false;
    let truncatedHtml = "";
    if (fields.includes("content")) {
      const stash = (full: string): string => {
        const idx = preservedBlocks.length;
        preservedBlocks.push(full);
        return `<!--PGP_KEEP_${idx}-->`;
      };
      truncatedHtml = page_content
        .replace(/<!--\s*STYLES\s*-->[\s\S]*?<!--\s*\/STYLES\s*-->/gi, (m) => stash(m))
        .replace(/<style[\s\S]*?<\/style>/gi, (m) => stash(m))
        .replace(/<script[\s\S]*?<\/script>/gi, (m) => stash(m));
      // Cap size to stay within token limits — but remember if we cut anything.
      if (truncatedHtml.length > CONTENT_CAP) {
        truncatedHtml = truncatedHtml.slice(0, CONTENT_CAP) + "\n<!-- TRUNCATED -->";
        contentTruncated = true;
      }
    }

    // Restore the exact original <style>/<script> blocks into AI-optimized HTML.
    // Returns null when restoration can't be trusted (missing/duplicated/leftover
    // placeholders) so the caller can safely fall back to the original content.
    const restorePreservedBlocks = (html: string): string | null => {
      if (!html) return null;
      let restored = html;
      for (let i = 0; i < preservedBlocks.length; i++) {
        const marker = `<!--PGP_KEEP_${i}-->`;
        const occurrences = restored.split(marker).length - 1;
        if (occurrences !== 1) return null; // AI dropped or duplicated a block
        restored = restored.replace(marker, () => preservedBlocks[i]);
      }
      if (/<!--PGP_KEEP_\d+-->/.test(restored)) return null; // stray placeholder
      return restored;
    };

    // Per-section scoping: when the caller only wants to rewrite specific sections
    // (services, faq, testimonials, about, hero, cta), give the AI hard rules to
    // identify those sections by common markers and leave every other text node
    // byte-identical.
    const SECTION_MARKERS: Record<string, string[]> = {
      services: ["service", "services", "our-services", "offering", "offerings", "features", "what-we-do", "solutions", "products"],
      faq: ["faq", "faqs", "faq-", "questions", "q-and-a", "qna", "accordion"],
      testimonials: ["testimonial", "testimonials", "reviews", "review", "quote", "quotes", "customers", "clients-say"],
      about: ["about", "about-us", "about-", "who-we-are", "company", "our-story", "story", "mission"],
      hero: ["hero", "hero-", "banner", "top-banner", "masthead", "jumbotron"],
      cta: ["cta", "call-to-action", "cta-", "get-started", "contact-cta"],
    };
    const activeSections = requestedSections.filter((s) => SECTION_MARKERS[s]);
    const sectionScopeInstruction = activeSections.length > 0 && fields.includes("content")
      ? `

═══ SECTION-SCOPED REWRITE (STRICT) ═══
Rewrite ONLY the text inside HTML elements that belong to these page sections: ${activeSections.join(", ").toUpperCase()}.
Detect target sections by ANY of these signals on an element OR its ancestors:
${activeSections
  .map((s) => `- ${s.toUpperCase()}: id/class/data-* attribute contains one of [${SECTION_MARKERS[s].join(", ")}], OR the nearest preceding heading (h1-h4) text is about "${s}" (e.g. "Our ${s}", "${s.charAt(0).toUpperCase() + s.slice(1)}", "Frequently Asked Questions" for faq, "What our customers say" for testimonials).`)
  .join("\n")}

For every OTHER text node in the HTML (any element NOT inside a matching section):
- Keep its text byte-identical. Do NOT rewrite it, translate it, shorten it, or "improve" it.
- Copy it into the output exactly as-is.

Inside matching sections you MUST still obey every design/length rule above.
If you cannot confidently identify a section marker for a scope, DO NOT invent one — leave the whole page unchanged for that scope rather than rewriting the wrong block.`
      : "";




    const systemPrompt = metadataOnly
      ? `You are an expert SEO metadata optimizer.
Return ONLY valid JSON with the requested fields. Do NOT return page body HTML/content.
Rules:
- seo_title: 30-60 characters, primary keyword near the start, include one action/offer word.
- seo_description: 120-156 characters, include primary keyword, benefit, CTA, and local cue.
- seo_keywords: 5-8 concise keywords, primary keyword first when available.
- Keep output language consistent with the page language/focus keyword.
Language: ${lang}
${languageInstruction}
Requested fields:
${fields.includes("seo_title") ? '- "seo_title"' : ""}
${fields.includes("seo_description") ? '- "seo_description"' : ""}
${fields.includes("seo_keywords") ? '- "seo_keywords"' : ""}`
      : `You are an expert SEO/SEA/GEO content optimizer. Your output MUST score 90+ on ALL THREE scoring dimensions: SEO, SEA (Search Engine Advertising / Landing Page Quality), and GEO (Local/Geographic relevance).

${metadataOnly ? `FAST METADATA-ONLY MODE:
- Do NOT rewrite or return page body HTML/content.
- Do NOT add links, schema, image alt text, paragraphs, sections, or any body copy.
- Return only the requested metadata fields so the live page design remains untouched.` : ""}

ABSOLUTE DESIGN PRESERVATION RULES (NEVER VIOLATE):
- NEVER change ANY HTML tag, attribute, class, id, style, data-* attribute, or structure.
- NEVER remove or modify: URLs, href links, src attributes, prices, cart elements, forms, buttons, iframes, scripts, images.
- NEVER change: elementor-*, wp-*, shopify-*, woocommerce-*, product-*, cart-*, price-* classes.
- NEVER alter: <style> blocks, inline styles, CSS classes, media queries.
- CRITICAL: The HTML contains comment placeholders like <!--PGP_KEEP_0-->, <!--PGP_KEEP_1-->. These stand for the page's CSS/script blocks. You MUST keep EVERY one of them, byte-for-byte, in the EXACT same position. Never delete, duplicate, rename, move, or add these markers.
- ONLY change the visible TEXT CONTENT inside HTML elements.
- REWRITE EVERY visible text node: page title, ALL headings (h1/h2/h3/h4), subheadings, paragraphs, list items, buttons, captions, badges, CTAs. Do NOT leave any original visible text unchanged unless it is a brand name, phone number, address, price, or product SKU.
- LENGTH PARITY (STRICT): The rewritten text inside each element MUST match the original text length of THAT SAME element within ±15% characters. Headings stay heading-length, paragraphs stay paragraph-length. Never merge, split, add, or remove elements/sentences/lines.
- Keep EXACT same number of sections, divs, headings, paragraphs, lists.
- Preserve ALL product data: prices, SKUs, variants, add-to-cart buttons, reviews, ratings.

═══ SEO SCORE REQUIREMENTS (18 checks, need 16+ for 90+) ═══
1. Focus keyword MUST appear in: SEO title (within first 18 chars), meta description, opening lines, at least one H2/H3, URL-aligned wording, and naturally throughout content
2. Focus keyword density: 0.5-2.5%
3. Title: 30-60 characters with primary keyword near the start
4. Meta description: 120-156 characters with keyword + CTA + benefit + local cue
5. Content: 650+ words minimum when rewriting content
6. Has H1 heading
7. Has H2/H3 subheadings with keyword in at least one
8. IMAGE ALT TEXT: At least one <img> must have alt text containing the focus keyword
9. INTERNAL LINKS: Add at least one <a href="/..."> internal link
10. OUTBOUND LINKS: Add at least one <a href="https://..."> outbound link to an authoritative source
11. Short paragraphs (under 150 words each)
12. Use transition words: however, therefore, additionally, moreover, furthermore, also, because, for example, in addition, as a result, first, next, finally, meanwhile, instead (need 3+ occurrences)
13. Use active voice predominantly (minimize passive constructions)
14. STRUCTURED DATA: Include JSON-LD <script type="application/ld+json"> with appropriate schema

═══ SEA SCORE REQUIREMENTS (9 checks, need 8+ for 90+) ═══
YOU MUST naturally weave these signal words into the text content:
1. CTA language — use words like: buy, get, shop, order, start, book, reserve, request, contact, call, discover, learn more, try, schedule, checkout, add to cart, subscribe, sign up
2. Action words in title — include at least one CTA or offer word in the title
3. Benefit-led introduction — first paragraph must use words like: save, fast, easy, simple, reliable, premium, quality, effective, powerful, best, trusted, affordable, results, boost, improve, grow, protect
4. Trust signals — include words like: trusted, guarantee, warranty, certified, proven, rated, recommended, satisfaction, verified, review, testimonial
5. Offer/value language — use words like: free, discount, offer, deal, plan, package, price, pricing, trial, bundle, save, starting at
6. Focused content (100-1500 words for landing pages)
7. Scannable structure — multiple headings or lists
8. Clear next step — use intent words like: call, contact, book, reserve, request, order, subscribe, sign up
9. Urgency or proof — use phrases like: today, now, instant, quick, fast, limited, same-day, immediate, top-rated, best-selling, or include numbers/percentages

═══ GEO SCORE REQUIREMENTS (7 checks, need 6+ for 90+) ═══
YOU MUST naturally include geographic/local relevance signals:
1. Local cue in title or intro — use phrases like: local, nearby, near you, in your area, serving, regional, community, neighborhood
2. Service area language — use: serving, available in, delivery in, coverage across, service area, throughout, nearby, local service
3. Localized heading — at least one H2/H3 should contain a local/area-specific word
4. Community/proximity language — use: community, neighborhood, locals, local experts, nearby, around you, close by, in the area
5. Availability cues — use: open, available, today, same-day, response time, hours, coverage, delivery window, visit, call us, contact us
6. Clean descriptive URL (handled by slug)
7. Local credibility — use: trusted locally, local team, area specialists, nearby support, serving customers

CRITICAL INTEGRATION RULE: Do NOT just dump these words randomly. Weave them naturally into engaging, human-readable copy that makes sense for the page topic. Every sentence should read naturally while hitting multiple scoring signals simultaneously.

PRIMARY KEYWORD RULE:
- If a focus keyword is provided, you MUST use that exact phrase as the primary keyword.
- Do NOT translate, anglicize, or replace the provided focus keyword with a different phrase.
- Keep the output in the same language as the provided focus keyword unless the user explicitly asks otherwise.
- The first item in seo_keywords MUST be the exact primary focus keyword.

Language: ${lang}
${languageInstruction}

Return these fields (only what's requested):
${fields.includes("seo_title") ? '- "seo_title": SEO title 30-60 chars, keyword near start, include an action/offer word (e.g., "Get", "Best", "Free", "Top")' : ""}
${fields.includes("seo_description") ? '- "seo_description": Meta description 120-156 chars with the exact focus keyword + CTA + benefit word + local cue' : ""}
${fields.includes("seo_keywords") ? '- "seo_keywords": Array of 5-8 LSI/related keywords with the exact primary focus keyword first' : ""}
${fields.includes("content") ? '- "content": Full HTML with IDENTICAL structure but text optimized to score 90+ on ALL THREE dimensions (SEO + SEA + GEO). Every tag/class/attribute MUST be preserved byte-for-byte. Only text nodes change.' : ""}

Return ONLY valid JSON, no markdown fences.`;

    const userPrompt = `Page title: "${page_title || "Untitled"}"
Current SEO title: ${effectiveSeoTitle || "N/A"}
Current meta description: ${effectiveSeoDescription || "N/A"}
Current SEO keywords: ${existingSeoKeywords.join(", ") || "N/A"}
Primary focus keyword: ${primaryKeyword || "Derive it from the existing page title/slug and keep it language-consistent"}
Page URL: ${page_url || page_slug || "N/A"}
Page type: ${page_type || "page"}

Current content (plain text summary):
${truncatedText}

${fields.includes("content") ? `HTML to optimize (PRESERVE ALL TAGS/CLASSES/ATTRIBUTES — only change text inside elements):
${truncatedHtml}` : ""}

${instruction ? `\nUser instruction: ${instruction}\n` : ""}
${metadataOnly ? `IMPORTANT: Optimize metadata only. Do not return content/html. Use the current content summary only as context for title, description, and keywords.` : `IMPORTANT: Generate content that scores 90+ on ALL THREE metrics:
- SEO: Use the exact focus keyword in SEO title (first 18 chars), meta description, opening lines, subheadings, and naturally in the content; density 0.5-2.5%; transition words (3+); active voice; 650+ words; at least one image alt text with keyword; at least one internal link (href="/...") and one outbound link (href="https://..."); JSON-LD schema markup
- SEA: Include CTA words (buy/get/shop/order/contact), benefit words (save/fast/easy/reliable/premium), trust signals (trusted/guarantee/certified/proven), offer language (free/discount/deal), urgency cues (today/now/limited)
- GEO: Include local signals (local/nearby/community/service area/serving), availability cues (available/today/same-day/contact us), local credibility (trusted locally/local team/area specialists)

Weave all signals naturally — the text must read like professional marketing copy, not keyword spam.`}

If a primary focus keyword is provided, the optimized metadata and rewritten content MUST revolve around that exact phrase so external WordPress SEO plugins score it correctly.`;

    const includeContent = fields.includes("content");
    const fallbackResult = {
      title: page_title || "",
      seoTitle: effectiveSeoTitle,
      seoDescription: effectiveSeoDescription,
      seoKeywords: existingSeoKeywords,
      slug: page_slug || "",
      url: page_url,
      content: page_content,
    };

    // Pick the model based on whether we're rewriting the full page body.
    // Lite is fine for meta-only tweaks; a body rewrite needs the stronger
    // model or it echoes the original HTML back unchanged.
    const activeModel = includeContent ? CONTENT_REWRITE_MODEL : METADATA_MODEL;

    const credit = await deductCreditsForRequest(req, "seo_optimization", activeModel);
    if (!credit.allowed) {
      return new Response(JSON.stringify({
        error: credit.error === "insufficient_credits"
          ? `Insufficient AI credits (remaining: ${credit.remaining ?? 0}). Please upgrade your plan.`
          : "Authentication required to use AI features.",
        remaining: credit.remaining ?? 0,
      }), {
        status: credit.error === "insufficient_credits" ? 402 : 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: Record<string, any> = {};
    try {
      ensureBudget(functionStartedAt, "SEO optimization");
      const optimizationTimeoutMs = metadataOnly ? 40_000 : AI_CALL_TIMEOUT_MS;
      result = normalizeOptimizationResult(
        await requestOptimizationDraft(
          LOVABLE_API_KEY,
          systemPrompt,
          userPrompt,
          Math.min(optimizationTimeoutMs, Math.max(8_000, remainingBudgetMs(functionStartedAt, 55_000))),
          activeModel,
        ),
        fallbackResult,
        fields,
        includeContent,
      );
    } catch (error: any) {
      if (error?.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (error?.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", error?.status, error?.details || error);
      throw timeoutError(error?.message || "AI generation failed", error?.status || 500, error?.details);
    }

    // Guardrail: if the model echoed the body back byte-for-byte (or only
    // whitespace-different), issue one stronger rewrite so headings / subheadings
    // / paragraph text actually change instead of only the meta fields.
    const normalizeForCompare = (s: string) =>
      (s || "").replace(/\s+/g, " ").trim();
    if (
      includeContent &&
      result.content &&
      page_content &&
      normalizeForCompare(result.content) === normalizeForCompare(page_content)
    ) {
      console.warn("[OPTIMIZE] AI returned identical body — retrying with strict rewrite prompt.");
      try {
        const strictPrompt = `${userPrompt}

The previous attempt returned the body HTML unchanged. That is INVALID.

You MUST rewrite every visible text node inside the HTML:
- Every heading (h1-h6) — new wording, same tag/class/attributes.
- Every paragraph, list item, blockquote — new wording.
- Every button / link label text — new wording (URLs stay identical).
- Keep length within ±15% of the original per node.
- Do NOT change any tag, class, id, style attribute, script, or inline SVG.
- Do NOT drop or add nodes.

Return the FULL JSON again with the fully rewritten "content".`;
        const strictTimeoutMs = Math.min(AI_CALL_TIMEOUT_MS, Math.max(8_000, remainingBudgetMs(functionStartedAt, 45_000)));
        if (strictTimeoutMs >= 8_000) {
          result = normalizeOptimizationResult(
            await requestOptimizationDraft(LOVABLE_API_KEY, systemPrompt, strictPrompt, strictTimeoutMs, activeModel),
            fallbackResult,
            fields,
            includeContent,
          );
        }
      } catch (err: any) {
        console.error("[OPTIMIZE] Strict rewrite retry failed:", err?.status, err?.message);
      }
    }

    let qualityReport = analyzeSeoQuality({
      title: page_title,
      seoTitle: result.seo_title || effectiveSeoTitle,
      seoDescription: result.seo_description || effectiveSeoDescription,
      seoKeywords: result.seo_keywords || existingSeoKeywords,
      slug: page_slug,
      url: page_url,
      content: includeContent ? (result.content || page_content) : page_content,
    });

    const repairLoopStart = Date.now();
    for (
      let attempt = 0;
      attempt < MAX_QUALITY_REPAIR_ATTEMPTS &&
      includeContent &&
      needsQualityRepair(qualityReport) &&
      Date.now() - repairLoopStart < REPAIR_LOOP_BUDGET_MS;
      attempt += 1
    ) {
      const repairPrompt = `${userPrompt}

Previous draft JSON:
${JSON.stringify(result)}

Validation scores for this draft:
- SEO: ${qualityReport.seoScore}
- SEA: ${qualityReport.seaScore}
- GEO: ${qualityReport.geoScore}
- Primary keyword: ${qualityReport.primaryKeyword}

Failed checks to repair:
${buildQualityRepairChecklist(qualityReport.checks)}

Revise and return the FULL JSON again. Fix every failed item, keep the exact primary keyword first in seo_keywords, and preserve HTML structure/classes/attributes exactly.`;

      try {
        const repairTimeoutMs = Math.min(AI_CALL_TIMEOUT_MS, Math.max(8_000, remainingBudgetMs(functionStartedAt, 45_000)));
        if (repairTimeoutMs < 8_000) break;
        result = normalizeOptimizationResult(
          await requestOptimizationDraft(LOVABLE_API_KEY, systemPrompt, repairPrompt, repairTimeoutMs, activeModel),
          fallbackResult,
          fields,
          includeContent,
        );
      } catch (error: any) {
        if (error?.status === 429 || error?.status === 402) break;
        console.error("AI repair error:", error?.status, error?.details || error);
        break;
      }

      qualityReport = analyzeSeoQuality({
        title: page_title,
        seoTitle: result.seo_title || effectiveSeoTitle,
        seoDescription: result.seo_description || effectiveSeoDescription,
        seoKeywords: result.seo_keywords || existingSeoKeywords,
        slug: page_slug,
        url: page_url,
        content: includeContent ? (result.content || page_content) : page_content,
      });
    }

    // ── Rebuild the full design before any repair / save / push ─────────────
    // The AI worked on a style-stripped (and possibly truncated) copy. We must
    // restore the EXACT original <style>/<script> blocks, and if anything looks
    // unsafe (truncated body, missing placeholders) fall back to the untouched
    // original content so the live page NEVER loses its layout.
    let designSafeContent: string | null = null;
    if (includeContent && result.content) {
      if (contentTruncated) {
        console.warn("[OPTIMIZE] Content was truncated for AI — keeping original body to preserve full design.");
        designSafeContent = page_content;
      } else {
        const restored = restorePreservedBlocks(result.content);
        if (restored) {
          designSafeContent = restored;
        } else {
          console.warn("[OPTIMIZE] AI dropped style/script placeholders — falling back to original body to preserve design.");
          designSafeContent = page_content;
        }
      }
    }

    // Auto-repair content to fix missing H1, links, schema, keyword placement,
    // SEA signals (CTA/benefit/trust/offer/urgency), and GEO signals (local/community/availability).
    // Run even when "content" wasn't explicitly requested — we still need the live page to score 10/10.
    const baseContentForRepair = designSafeContent || page_content;
    if (includeContent && baseContentForRepair) {
      result.content = autoRepairContent(baseContentForRepair, {
        title: page_title,
        seoTitle: result.seo_title || effectiveSeoTitle,
        primaryKeyword: qualityReport.primaryKeyword,
        slug: page_slug,
        language: effectiveLanguage,
      });
    }

    // Ensure SEO title contains an action/offer word (SEA: "Action words in title")
    const actionWordRegex = /(buy|get|shop|order|book|reserve|request|contact|call|discover|subscribe|sign up|free|best|top|new|save|deal|premium)/i;
    if (fields.includes("seo_title") && result.seo_title && !actionWordRegex.test(result.seo_title)) {
      const prefix = "Get ";
      const candidate = `${prefix}${result.seo_title}`;
      result.seo_title = candidate.length <= 60 ? candidate : result.seo_title;
    }

    // Fetch the website for CMS push
    const { data: website } = await supabase
      .from("websites")
      .select("id, url, type, credentials, workspace_id")
      .eq("id", website_id)
      .maybeSingle();

    let pushResult: { external_id?: string; url?: string } | null = null;
    let pushError: string | null = null;
    const nextSeoTitle = fields.includes("seo_title")
      ? (result.seo_title || page_seo_title || undefined)
      : (page_seo_title || undefined);
    const nextSeoDescription = fields.includes("seo_description")
      ? (result.seo_description || page_seo_description || undefined)
      : (page_seo_description || undefined);
    const nextSeoKeywords = fields.includes("seo_keywords")
      ? ensurePrimaryKeywordFirst(
      qualityReport.primaryKeyword,
      Array.isArray(result.seo_keywords) && result.seo_keywords.length > 0 ? result.seo_keywords : existingSeoKeywords,
      )
      : existingSeoKeywords;

    // Snapshot the current known-good (pre-optimization) content BEFORE pushing,
    // so the page can be rolled back if the optimization breaks the layout.
    if (website && page_external_id && !skip_push && (page_content || page_title)) {
      try {
        await supabase.from("page_versions").insert({
          user_id: user.id,
          workspace_id: workspace_id || website?.workspace_id || null,
          website_id,
          external_id: page_external_id,
          page_type: page_type || "page",
          title: page_title || null,
          content: page_content || null,
          slug: page_slug || null,
          seo_title: page_seo_title || null,
          seo_description: page_seo_description || null,
          seo_keywords: Array.isArray(page_seo_keywords) && page_seo_keywords.length > 0 ? page_seo_keywords : null,
          source: "pre_optimize",
        });
        console.log("[OPTIMIZE] Saved pre-optimization snapshot to page_versions");
      } catch (snapErr) {
        console.error("[OPTIMIZE] Failed to save snapshot:", snapErr);
      }
    }

    if (website && page_external_id && !skip_push) {
      try {
        ensureBudget(functionStartedAt, "CMS update", 35_000);
        const isProductContent = page_type === "product";
        const connector = isProductContent
          ? await createProductConnector(website as WebsiteRecord)
          : await createConnector(website as WebsiteRecord);
        // Push repaired content to CMS even if user didn't request "content" field —
        // the auto-repair adds GEO/SEA signals required to score 10/10 on the live page.
        const rewrittenContent = result.content && result.content !== page_content ? result.content : null;
        // Always UPDATE existing page — never create a new one
        const updatePayload: Record<string, any> = {
          // NEVER rename the live page. The optimized SEO title is metadata only
          // (handled below via updatePayload.seo_title) — the page's actual name
          // (post title) must stay exactly as it is on the connected website.
          // Only fall back to the SEO title when the page genuinely has no name.
          title: page_title || result.seo_title || undefined,
          slug: page_slug,
          status: "publish",
        };

        if (isProductContent) updatePayload.product_data = { handle: page_slug || undefined };
        // Only push rewritten body content when the caller explicitly opted into
        // a design overwrite — preserves builder layouts on republish.
        if (rewrittenContent && !preserveDesign) {
          updatePayload.content = rewrittenContent;
        }
        if (preserveDesign) updatePayload.preserve_design = true;
        if (forceRepublish) updatePayload.publish_format = "html";
        if (nextSeoTitle) updatePayload.seo_title = nextSeoTitle;
        if (nextSeoDescription) {
          updatePayload.seo_description = nextSeoDescription;
          updatePayload.excerpt = nextSeoDescription;
        }
        if (nextSeoKeywords.length > 0) updatePayload.seo_keywords = nextSeoKeywords;

        pushResult = await withTimeout(
          connector.updatePage(page_external_id, updatePayload),
          Math.min(CMS_PUSH_TIMEOUT_MS, Math.max(8_000, remainingBudgetMs(functionStartedAt, 8_000))),
          "CMS update timed out. The connected site did not respond quickly enough; please retry or update metadata only.",
        );
        console.log(`[OPTIMIZE] Updated existing ${isProductContent ? 'product' : 'page'} on CMS:`, pushResult);
      } catch (pushErr: any) {
        pushError = pushErr.message || "CMS update failed";
        console.error("[OPTIMIZE] CMS push failed:", pushErr);
      }
    } else if (!page_external_id) {
      pushError = "No page ID — cannot update on website";
    }

    // Save / update in generated_pages for tracking
    const wsId = workspace_id || website?.workspace_id || null;

    // Check if we already have this page tracked
    const { data: existingPage } = await supabase
      .from("generated_pages")
      .select("id, campaign_id")
      .eq("website_id", website_id)
      .eq("external_id", page_external_id || "")
      .eq("user_id", user.id)
      .maybeSingle();

    const pageRecord: Record<string, any> = {
      // Keep the real page name in tracking — the SEO title is stored separately
      // in seo_title, never as the page's display name.
      title: page_title || nextSeoTitle,
      content: preserveDesign ? page_content : (result.content || page_content),
      slug: page_slug || "",
      seo_title: nextSeoTitle || null,
      seo_description: nextSeoDescription || null,
      seo_keywords: nextSeoKeywords.length > 0 ? nextSeoKeywords : null,
      user_id: user.id,
      website_id,
      workspace_id: wsId,
      status: pushResult ? "published" : "generated",
      external_id: page_external_id || (pushResult?.external_id || null),
      external_url: pushResult?.url || page_url || null,
    };

    if (existingPage) {
      await supabase.from("generated_pages").update(pageRecord).eq("id", existingPage.id);
    } else {
      await supabase.from("generated_pages").insert(pageRecord);
    }

    // Increment usage counters
    if (sub) {
      await supabase
        .from("subscriptions")
        .update({
          ai_generations_used: (sub.ai_generations_used || 0) + 1,
          pages_used: existingPage ? sub.pages_used : (sub.pages_used || 0) + 1,
        })
        .eq("user_id", user.id);
    }

    // Audit log
    try {
      if (wsId) {
        await supabase.from("audit_logs").insert({
          workspace_id: wsId,
          user_id: user.id,
          action: "seo_optimize",
          entity_type: page_type || "page",
          entity_id: page_external_id || page_slug,
          details: {
            title: page_title,
            fields_optimized: fields,
            pushed_to_cms: !!pushResult,
          },
        });
      }
    } catch (_) { /* non-critical */ }

    return new Response(JSON.stringify({
      success: true,
      result,
      pushed_to_cms: !!pushResult,
      push_error: pushError,
      external_url: pushResult?.url || page_url,
      quality_report: {
        primary_keyword: qualityReport.primaryKeyword,
        seo_score: qualityReport.seoScore,
        sea_score: qualityReport.seaScore,
        geo_score: qualityReport.geoScore,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("optimize-seo-content error:", err);
    return new Response(JSON.stringify({
      error: err.message || "Unknown error",
      code: err.status === 504 ? "FUNCTION_SAFE_TIMEOUT" : undefined,
      details: err.details,
    }), {
      status: err.status || 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

Deno.serve((req) => {
  const functionStartedAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const hardTimeout = new Promise<Response>((resolve) => {
    timer = setTimeout(() => {
      resolve(new Response(JSON.stringify({
        error: "SEO optimization timed out before the platform limit. Please retry with metadata-only fields or update the connected site connection.",
        code: "FUNCTION_SAFE_TIMEOUT",
      }), {
        status: 504,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }));
    }, FUNCTION_BUDGET_MS);
  });

  return Promise.race([
    handleOptimizeSeoContent(req, functionStartedAt),
    hardTimeout,
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
});
