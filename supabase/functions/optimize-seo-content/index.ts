import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createConnector, type WebsiteRecord } from "../_shared/connectors/factory.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
        const connector = await createConnector(website as WebsiteRecord);
        const isProductContent = page_type === "product";
        const updatePayload: Record<string, any> = {
          title: manual_title || page_title,
          slug: page_slug,
          content: manual_content || page_content,
          status: "publish",
        };
        if (isProductContent) updatePayload.product_data = { handle: page_slug || undefined };
        if (manual_excerpt) updatePayload.excerpt = manual_excerpt;
        if (seo_title) updatePayload.seo_title = seo_title;
        if (seo_description) updatePayload.seo_description = seo_description;
        if (seo_keywords?.length) updatePayload.seo_keywords = seo_keywords;
        pushResult = await connector.updatePage(page_external_id, updatePayload);
        console.log("[MANUAL] Updated existing page on CMS:", pushResult);
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
    const lang = language || "en";

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

    const systemPrompt = `You are an expert SEO optimizer. You analyze existing web page content and generate optimized SEO metadata and improved content text.

CRITICAL RULES:
- When rewriting content, you MUST preserve ALL existing HTML structure, classes, IDs, and design elements exactly as they are.
- Only change the TEXT inside HTML elements, never change tags, attributes, classes, styles, or structure.
- Keep the same number of sections, headings, and elements.
- Improve text for SEO keywords, readability, and engagement.
- Language: ${lang}

You must return a JSON object with these fields (only include what's requested):
${fields.includes("seo_title") ? '- "seo_title": An SEO-optimized title (30-60 chars, with primary keyword)' : ""}
${fields.includes("seo_description") ? '- "seo_description": A compelling meta description (120-160 chars, with call-to-action)' : ""}
${fields.includes("seo_keywords") ? '- "seo_keywords": An array of 5-8 relevant SEO keywords' : ""}
${fields.includes("content") ? '- "content": The full rewritten HTML with IDENTICAL structure but improved text for SEO. Preserve every HTML tag, class, id, style attribute. Only change text content.' : ""}

Return ONLY valid JSON, no markdown fences.`;

    const userPrompt = `Page title: "${page_title || "Untitled"}"
Page URL: ${page_url || page_slug || "N/A"}
Page type: ${page_type || "page"}

Current content (plain text summary):
${truncatedText}

${fields.includes("content") ? `HTML structure to optimize (preserve structure exactly, only change text):
${truncatedHtml}` : ""}

${instruction ? `\nUser instruction: ${instruction}\n` : ""}
Generate optimized SEO data for this page. Focus on the main topic/keywords of the existing content.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "seo_optimization_result",
              description: "Return the SEO optimization results",
              parameters: {
                type: "object",
                properties: {
                  seo_title: { type: "string", description: "Optimized SEO title (30-60 chars)" },
                  seo_description: { type: "string", description: "Optimized meta description (120-160 chars)" },
                  seo_keywords: { type: "array", items: { type: "string" }, description: "5-8 relevant keywords" },
                  content: { type: "string", description: "HTML content with improved text but same structure" },
                },
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "seo_optimization_result" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI generation failed");
    }

    const aiData = await response.json();

    // Extract structured output from tool call
    let result: Record<string, any> = {};
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        result = typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
      } catch {
        // Fallback: try parsing message content
        const raw = aiData.choices?.[0]?.message?.content || "";
        try { result = JSON.parse(raw.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "")); } catch { /* empty */ }
      }
    }

    if (!result.seo_title && !result.seo_description && !result.seo_keywords && !result.content) {
      // Last resort fallback
      const raw = aiData.choices?.[0]?.message?.content || "";
      try { result = JSON.parse(raw.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "")); } catch { /* empty */ }
    }

    // Fetch the website for CMS push
    const { data: website } = await supabase
      .from("websites")
      .select("url, type, credentials, workspace_id")
      .eq("id", website_id)
      .maybeSingle();

    let pushResult: { external_id?: string; url?: string } | null = null;
    let pushError: string | null = null;

    if (website && page_external_id && !skip_push) {
      try {
        const connector = await createConnector(website as WebsiteRecord);
        const isProductContent = page_type === "product";
        // Always UPDATE existing page — never create a new one
        const updatePayload: Record<string, any> = {
          title: result.seo_title || page_title,
          slug: page_slug,
          status: "publish",
        };

        if (isProductContent) updatePayload.product_data = { handle: page_slug || undefined };
        if (result.content && fields.includes("content")) {
          updatePayload.content = result.content;
        }
        if (result.seo_title) updatePayload.seo_title = result.seo_title;
        if (result.seo_description) {
          updatePayload.seo_description = result.seo_description;
          updatePayload.excerpt = result.seo_description;
        }
        if (result.seo_keywords) updatePayload.seo_keywords = result.seo_keywords;

        pushResult = await connector.updatePage(page_external_id, updatePayload);
        console.log("[OPTIMIZE] Updated existing page on CMS:", pushResult);
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
      title: result.seo_title || page_title,
      content: result.content || page_content,
      slug: page_slug || "",
      seo_title: result.seo_title || null,
      seo_description: result.seo_description || null,
      seo_keywords: result.seo_keywords || null,
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
