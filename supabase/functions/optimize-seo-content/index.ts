import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createConnector, createProductConnector, type WebsiteRecord } from "../_shared/connectors/factory.ts";
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

function generateElementorId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 7; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function buildElementorData(htmlContent: string): string {
  return JSON.stringify([
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
  ]);
}

function shouldMirrorToElementor(
  websiteType: string | undefined,
  pageType: string | undefined,
  html: string | null | undefined,
): boolean {
  if (!html || pageType === "product") return false;
  if (!websiteType || !["wordpress", "woocommerce"].includes(websiteType)) return false;

  const normalized = html.toLowerCase();
  return normalized.includes("elementor") || normalized.includes("data-elementor") || normalized.includes("e-con");
}

// Lite model is enough for SEO meta + minor text tweaks; saves significant credits.
const OPTIMIZATION_MODEL = "google/gemini-2.5-flash-lite";
const MAX_QUALITY_REPAIR_ATTEMPTS = 2;

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

async function requestOptimizationDraft(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPTIMIZATION_MODEL,
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
  const seoTitle = trimTextAtWordBoundary(String(rawResult.seo_title || fallback.seoTitle || fallback.title || "").trim(), 60);
  const seoDescription = trimTextAtWordBoundary(String(rawResult.seo_description || fallback.seoDescription || "").trim(), 156);
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

Deno.serve(async (req) => {
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
    } = body;

    if (!website_id) {
      return new Response(JSON.stringify({ error: "website_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Manual update mode: skip AI, just push edited content to CMS ──
    if (manual_update) {
      const { data: website } = await supabase
        .from("websites")
        .select("url, type, credentials, workspace_id")
        .eq("id", website_id)
        .maybeSingle();

      if (!website) {
        return new Response(JSON.stringify({ error: "Website not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let pushResult: { external_id?: string; url?: string } | null = null;
      let pushError: string | null = null;

      try {
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
        if (shouldMirrorToElementor(website.type, page_type, nextContent)) {
          updatePayload.elementor_meta = {
            elementor_data: buildElementorData(nextContent),
            elementor_edit_mode: "builder",
          };
        }
        if (manual_excerpt) updatePayload.excerpt = manual_excerpt;
        if (seo_title) updatePayload.seo_title = seo_title;
        if (seo_description) updatePayload.seo_description = seo_description;
        if (seo_keywords?.length) updatePayload.seo_keywords = seo_keywords;
        pushResult = await connector.updatePage(page_external_id, updatePayload);
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

    const fields = optimize_fields || ["seo_title", "seo_description", "seo_keywords", "content"];
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
    const lang = language
      || (primaryKeyword ? "same as the exact focus keyword phrase and current page URL" : "auto-detect from the existing page content and title");

    // Build a stronger language instruction for the AI
    const languageInstruction = language
      ? `CRITICAL LANGUAGE RULE: ALL output (seo_title, seo_description, seo_keywords, and content) MUST be written in ${language}. Do NOT output in English unless the language IS English. The website content language is ${language} — respect it exactly.`
      : "LANGUAGE RULE: Detect the language from the existing page content and title. ALL output MUST be in that same language. Do NOT translate to English if the original content is in another language.";

    // Strip HTML to get plain text for AI analysis
    const plainText = page_content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const truncatedText = plainText.slice(0, 3000);

    // For content rewriting, strip <style> blocks and limit HTML size to avoid timeouts
    let truncatedHtml = "";
    if (fields.includes("content")) {
      // Remove <style> blocks and <!-- STYLES --> sections to reduce size
      truncatedHtml = page_content
        .replace(/<!--\s*STYLES\s*-->[\s\S]*?<!--\s*\/STYLES\s*-->/gi, "<!-- STYLES PRESERVED -->")
        .replace(/<style[\s\S]*?<\/style>/gi, "/* styles preserved */")
        .replace(/<script[\s\S]*?<\/script>/gi, "");
      // Cap at 8000 chars to stay within token limits
      if (truncatedHtml.length > 8000) {
        truncatedHtml = truncatedHtml.slice(0, 8000) + "\n<!-- TRUNCATED -->";
      }
    }

    const systemPrompt = `You are an expert SEO/SEA/GEO content optimizer. Your output MUST score 90+ on ALL THREE scoring dimensions: SEO, SEA (Search Engine Advertising / Landing Page Quality), and GEO (Local/Geographic relevance).

ABSOLUTE DESIGN PRESERVATION RULES (NEVER VIOLATE):
- NEVER change ANY HTML tag, attribute, class, id, style, data-* attribute, or structure.
- NEVER remove or modify: URLs, href links, src attributes, prices, cart elements, forms, buttons, iframes, scripts, images.
- NEVER change: elementor-*, wp-*, shopify-*, woocommerce-*, product-*, cart-*, price-* classes.
- NEVER alter: <style> blocks, inline styles, CSS classes, media queries.
- ONLY change the visible TEXT CONTENT inside HTML elements.
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
IMPORTANT: Generate content that scores 90+ on ALL THREE metrics:
- SEO: Use the exact focus keyword in SEO title (first 18 chars), meta description, opening lines, subheadings, and naturally in the content; density 0.5-2.5%; transition words (3+); active voice; 650+ words; at least one image alt text with keyword; at least one internal link (href="/...") and one outbound link (href="https://..."); JSON-LD schema markup
- SEA: Include CTA words (buy/get/shop/order/contact), benefit words (save/fast/easy/reliable/premium), trust signals (trusted/guarantee/certified/proven), offer language (free/discount/deal), urgency cues (today/now/limited)
- GEO: Include local signals (local/nearby/community/service area/serving), availability cues (available/today/same-day/contact us), local credibility (trusted locally/local team/area specialists)

Weave all signals naturally — the text must read like professional marketing copy, not keyword spam.

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

    let result: Record<string, any> = {};
    try {
      result = normalizeOptimizationResult(
        await requestOptimizationDraft(LOVABLE_API_KEY, systemPrompt, userPrompt),
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
      throw new Error("AI generation failed");
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

    for (let attempt = 0; attempt < MAX_QUALITY_REPAIR_ATTEMPTS && needsQualityRepair(qualityReport); attempt += 1) {
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
        result = normalizeOptimizationResult(
          await requestOptimizationDraft(LOVABLE_API_KEY, systemPrompt, repairPrompt),
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

    // Auto-repair content to fix missing H1, links, schema, keyword placement
    if (includeContent && result.content) {
      result.content = autoRepairContent(result.content, {
        title: page_title,
        seoTitle: result.seo_title || effectiveSeoTitle,
        primaryKeyword: qualityReport.primaryKeyword,
        slug: page_slug,
      });
    }

    // Fetch the website for CMS push
    const { data: website } = await supabase
      .from("websites")
      .select("url, type, credentials, workspace_id")
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

    if (website && page_external_id && !skip_push) {
      try {
        const isProductContent = page_type === "product";
        const connector = isProductContent
          ? await createProductConnector(website as WebsiteRecord)
          : await createConnector(website as WebsiteRecord);
        const rewrittenContent = result.content && fields.includes("content") ? result.content : null;
        // Always UPDATE existing page — never create a new one
        const updatePayload: Record<string, any> = {
          title: result.seo_title || page_title,
          slug: page_slug,
          status: "publish",
        };

        if (isProductContent) updatePayload.product_data = { handle: page_slug || undefined };
        if (rewrittenContent) {
          updatePayload.content = rewrittenContent;
        }
        if (rewrittenContent && shouldMirrorToElementor(website.type, page_type, page_content || rewrittenContent)) {
          updatePayload.elementor_meta = {
            elementor_data: buildElementorData(rewrittenContent),
            elementor_edit_mode: "builder",
          };
        }
        if (nextSeoTitle) updatePayload.seo_title = nextSeoTitle;
        if (nextSeoDescription) {
          updatePayload.seo_description = nextSeoDescription;
          updatePayload.excerpt = nextSeoDescription;
        }
        if (nextSeoKeywords.length > 0) updatePayload.seo_keywords = nextSeoKeywords;

        pushResult = await connector.updatePage(page_external_id, updatePayload);
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
      title: nextSeoTitle || page_title,
      content: result.content || page_content,
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
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
