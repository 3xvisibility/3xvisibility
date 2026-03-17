import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractAiBlocks(content: string): { fullMatch: string; prompt: string }[] {
  const regex = /\{\{AI:([\s\S]*?)\}\}/g;
  const blocks: { fullMatch: string; prompt: string }[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push({ fullMatch: match[0], prompt: match[1].trim() });
  }
  return blocks;
}

async function generateAiContent(
  prompt: string,
  settings: { tone: string; contentLength: string; language: string },
  apiKey: string
): Promise<string> {
  const lengthGuide: Record<string, string> = {
    short: "Keep it concise, 1-2 sentences.",
    medium: "Write a well-developed paragraph of 3-5 sentences.",
    long: "Write a detailed, comprehensive section of 2-3 paragraphs.",
  };
  const languageMap: Record<string, string> = {
    en: "English", es: "Spanish", fr: "French", de: "German",
    pt: "Portuguese", it: "Italian", nl: "Dutch", ja: "Japanese",
    zh: "Chinese", ko: "Korean", ar: "Arabic",
  };

  const systemPrompt = `You are an expert content writer. Generate high-quality, engaging content.
Tone: ${settings.tone}
Length: ${lengthGuide[settings.contentLength] || lengthGuide.medium}
Language: ${languageMap[settings.language] || "English"}

IMPORTANT: Return ONLY the generated content text. No markdown formatting, no headers, no extra commentary.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI generation error:", response.status, errText);
    if (response.status === 429) throw new Error("AI rate limit exceeded.");
    if (response.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI generation failed (${response.status})`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content returned from AI");
  return content.trim();
}

async function generateSeoMetadata(
  pageTitle: string,
  pageContent: string,
  settings: { tone: string; language: string },
  apiKey: string
): Promise<{ seo_title: string; seo_description: string; seo_keywords: string[] }> {
  const snippet = pageContent.replace(/<[^>]*>/g, "").slice(0, 1000);
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: `You are an SEO expert. Generate optimized SEO metadata.\nTone: ${settings.tone}\nLanguage: ${settings.language}`,
        },
        {
          role: "user",
          content: `Generate SEO metadata for this page:\n\nTitle: ${pageTitle}\n\nContent excerpt: ${snippet}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "set_seo_metadata",
            description: "Set the SEO metadata for this page",
            parameters: {
              type: "object",
              properties: {
                seo_title: { type: "string", description: "SEO title, max 60 chars" },
                seo_description: { type: "string", description: "Meta description, max 160 chars" },
                seo_keywords: { type: "array", items: { type: "string" }, description: "5-8 keywords" },
              },
              required: ["seo_title", "seo_description", "seo_keywords"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "set_seo_metadata" } },
    }),
  });

  if (!response.ok) {
    return {
      seo_title: pageTitle.slice(0, 60),
      seo_description: snippet.slice(0, 160),
      seo_keywords: [],
    };
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      const parsed = JSON.parse(toolCall.function.arguments);
      return {
        seo_title: (parsed.seo_title || pageTitle).slice(0, 60),
        seo_description: (parsed.seo_description || snippet).slice(0, 160),
        seo_keywords: parsed.seo_keywords || [],
      };
    } catch { /* fallthrough */ }
  }

  return { seo_title: pageTitle.slice(0, 60), seo_description: snippet.slice(0, 160), seo_keywords: [] };
}

function buildOgMetaTags(
  title: string,
  description: string,
  url?: string,
  imageUrl?: string
): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const tags = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escape(title)}">`,
    `<meta property="og:description" content="${escape(description)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escape(title)}">`,
    `<meta name="twitter:description" content="${escape(description)}">`,
  ];
  if (url) {
    tags.push(`<meta property="og:url" content="${escape(url)}">`);
  }
  if (imageUrl) {
    tags.push(`<meta property="og:image" content="${escape(imageUrl)}">`);
    tags.push(`<meta name="twitter:image" content="${escape(imageUrl)}">`);
  }
  return `<!-- Open Graph Meta Tags -->\n${tags.join("\n")}`;
}

// Helper to log campaign events
async function logEvent(
  supabase: any,
  campaignId: string,
  userId: string,
  event: string,
  message: string,
  batchNumber?: number,
  pagesInBatch?: number
) {
  await supabase.from("campaign_logs").insert({
    campaign_id: campaignId,
    user_id: userId,
    event,
    message,
    batch_number: batchNumber ?? null,
    pages_in_batch: pagesInBatch ?? null,
  });
}

const BATCH_SIZE = 50;

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

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
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
    const { campaign_id, action } = body;

    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle pause/resume actions
    if (action === "pause") {
      await supabase.from("campaigns").update({ is_paused: true }).eq("id", campaign_id).eq("user_id", user.id);
      await logEvent(supabase, campaign_id, user.id, "paused", "Generation paused by user");
      return new Response(JSON.stringify({ success: true, action: "paused" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "resume") {
      await supabase.from("campaigns").update({ is_paused: false, status: "processing" }).eq("id", campaign_id).eq("user_id", user.id);
      await logEvent(supabase, campaign_id, user.id, "resumed", "Generation resumed by user");
      // Continue processing below — fall through to batch logic
    }

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*, templates(content, variables)")
      .eq("id", campaign_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!campaign.templates) {
      return new Response(JSON.stringify({ error: "No template assigned" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const csvRows = (campaign.csv_data || []) as Record<string, string>[];
    if (csvRows.length === 0) {
      return new Response(JSON.stringify({ error: "No CSV data in this campaign" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine start offset — for resume, continue from where we left off
    const alreadyProcessed = campaign.processed_rows || 0;
    const startIndex = action === "resume" ? alreadyProcessed : 0;
    const remainingRows = csvRows.slice(startIndex);

    if (remainingRows.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "All pages already generated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("ai_tone, ai_content_length, ai_language")
      .eq("user_id", user.id)
      .maybeSingle();

    const aiSettings = {
      tone: profile?.ai_tone || "professional",
      contentLength: profile?.ai_content_length || "medium",
      language: profile?.ai_language || "en",
    };

    const templateContent = campaign.templates.content as string;
    const aiBlocks = extractAiBlocks(templateContent);
    const hasAiBlocks = aiBlocks.length > 0;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // AI limit check
    const aiGenerationsNeeded = hasAiBlocks ? remainingRows.length * aiBlocks.length : 0;
    const seoGenerationsNeeded = LOVABLE_API_KEY ? remainingRows.length : 0;
    const totalAiNeeded = aiGenerationsNeeded + seoGenerationsNeeded;

    if (totalAiNeeded > 0) {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("ai_generations_used, ai_generations_limit")
        .eq("user_id", user.id)
        .maybeSingle();

      const used = subscription?.ai_generations_used || 0;
      const limit = subscription?.ai_generations_limit || 50;
      if (used + totalAiNeeded > limit) {
        return new Response(JSON.stringify({
          error: `AI limit exceeded. Need ${totalAiNeeded}, have ${limit - used} remaining.`,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (hasAiBlocks && !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as processing
    const isFirstRun = action !== "resume";
    if (isFirstRun) {
      await supabase.from("campaigns").update({
        status: "processing",
        processed_rows: 0,
        failed_rows: 0,
        current_batch: 0,
        is_paused: false,
        generation_started_at: new Date().toISOString(),
        generation_completed_at: null,
      }).eq("id", campaign_id);

      await logEvent(supabase, campaign_id, user.id, "started", `Generation started. ${csvRows.length} total pages to generate.`);
    }

    // Process in batches
    const totalBatches = Math.ceil(remainingRows.length / BATCH_SIZE);
    let processedCount = alreadyProcessed;
    let failedCount = campaign.failed_rows || 0;
    let aiGenerationsUsed = 0;
    let batchesCompleted = campaign.current_batch || 0;

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      // Check if paused
      const { data: freshCampaign } = await supabase
        .from("campaigns")
        .select("is_paused")
        .eq("id", campaign_id)
        .maybeSingle();

      if (freshCampaign?.is_paused) {
        await logEvent(supabase, campaign_id, user.id, "paused_during_batch", `Paused after batch ${batchesCompleted}. ${processedCount}/${csvRows.length} pages processed.`, batchesCompleted);
        
        await supabase.from("campaigns").update({
          status: "queued",
          processed_rows: processedCount,
          failed_rows: failedCount,
          current_batch: batchesCompleted,
        }).eq("id", campaign_id);

        return new Response(JSON.stringify({
          success: true,
          paused: true,
          generated: processedCount - failedCount,
          failed: failedCount,
          total: csvRows.length,
          remaining: csvRows.length - processedCount,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const batchStart = batchIdx * BATCH_SIZE;
      const batchRows = remainingRows.slice(batchStart, batchStart + BATCH_SIZE);
      batchesCompleted++;

      await logEvent(supabase, campaign_id, user.id, "batch_started", `Batch ${batchesCompleted} started (${batchRows.length} pages)`, batchesCompleted, batchRows.length);

      const batchPages: any[] = [];

      for (const row of batchRows) {
        try {
          let pageContent = templateContent;
          for (const [key, value] of Object.entries(row)) {
            const regex = new RegExp(`\\{${key}\\}`, "gi");
            pageContent = pageContent.replace(regex, value || "");
          }

          if (hasAiBlocks && LOVABLE_API_KEY) {
            const currentAiBlocks = extractAiBlocks(pageContent);
            for (const block of currentAiBlocks) {
              try {
                const generatedText = await generateAiContent(block.prompt, aiSettings, LOVABLE_API_KEY);
                pageContent = pageContent.replace(block.fullMatch, generatedText);
                aiGenerationsUsed++;
              } catch (aiErr: any) {
                pageContent = pageContent.replace(block.fullMatch, `<em style="color:#dc2626;">[AI failed: ${aiErr.message}]</em>`);
              }
            }
          }

          const h1Match = pageContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
          let pageTitle: string;
          if (h1Match) {
            pageTitle = h1Match[1].replace(/<[^>]*>/g, "").trim();
          } else {
            const values = Object.values(row).filter(Boolean);
            pageTitle = values.slice(0, 2).join(" - ") || `Page ${processedCount + 1}`;
          }

          const slug = slugify(pageTitle) || `page-${processedCount + 1}`;

          let seoData = {
            seo_title: pageTitle.slice(0, 60),
            seo_description: pageContent.replace(/<[^>]*>/g, "").slice(0, 160),
            seo_keywords: [] as string[],
          };

          if (LOVABLE_API_KEY) {
            try {
              seoData = await generateSeoMetadata(pageTitle, pageContent, aiSettings, LOVABLE_API_KEY);
              aiGenerationsUsed++;
            } catch { /* keep fallback */ }
          }

          batchPages.push({
            campaign_id,
            user_id: user.id,
            website_id: campaign.website_id,
            title: pageTitle,
            slug,
            content: pageContent,
            status: "pending",
            error_message: null,
            seo_title: seoData.seo_title,
            seo_description: seoData.seo_description,
            seo_keywords: seoData.seo_keywords,
          });

          processedCount++;
        } catch (err: any) {
          batchPages.push({
            campaign_id,
            user_id: user.id,
            website_id: campaign.website_id,
            title: `Failed Page ${processedCount + 1}`,
            slug: `failed-page-${processedCount + 1}`,
            content: "",
            status: "failed",
            error_message: err.message || "Unknown error",
            seo_title: null,
            seo_description: null,
            seo_keywords: null,
          });
          processedCount++;
          failedCount++;
        }
      }

      // Insert batch
      if (batchPages.length > 0) {
        const { error: insertError } = await supabase.from("generated_pages").insert(batchPages);
        if (insertError) {
          await logEvent(supabase, campaign_id, user.id, "batch_error", `Batch ${batchesCompleted} insert failed: ${insertError.message}`, batchesCompleted);
          failedCount += batchPages.length;
        }
      }

      const batchFailed = batchPages.filter(p => p.status === "failed").length;
      await logEvent(supabase, campaign_id, user.id, "batch_completed",
        `Batch ${batchesCompleted} done: ${batchPages.length - batchFailed} ok, ${batchFailed} failed`,
        batchesCompleted, batchPages.length);

      // Update campaign progress after each batch (realtime)
      await supabase.from("campaigns").update({
        processed_rows: processedCount,
        failed_rows: failedCount,
        current_batch: batchesCompleted,
      }).eq("id", campaign_id);
    }

    // Update AI usage
    if (aiGenerationsUsed > 0) {
      const { data: currentSub } = await supabase
        .from("subscriptions")
        .select("ai_generations_used")
        .eq("user_id", user.id)
        .maybeSingle();

      if (currentSub) {
        await supabase.from("subscriptions")
          .update({ ai_generations_used: (currentSub.ai_generations_used || 0) + aiGenerationsUsed })
          .eq("user_id", user.id);
      }
    }

    // Mark completed
    const finalStatus = failedCount === csvRows.length ? "failed" : "completed";
    await supabase.from("campaigns").update({
      status: finalStatus,
      processed_rows: processedCount,
      failed_rows: failedCount,
      generation_completed_at: new Date().toISOString(),
      is_paused: false,
    }).eq("id", campaign_id);

    await logEvent(supabase, campaign_id, user.id, "completed",
      `Generation ${finalStatus}. ${processedCount - failedCount} pages generated, ${failedCount} failed.`);

    // Auto-generate sitemap if campaign has a website
    if (campaign.website_id) {
      try {
        const sitemapUrl = `${supabaseUrl}/functions/v1/generate-sitemap`;
        await fetch(sitemapUrl, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ website_id: campaign.website_id }),
        });
      } catch (e) {
        console.error("Auto-sitemap generation failed:", e);
      }

      // Auto-submit to Google Indexing if configured
      try {
        const { data: webConfig } = await supabase
          .from("websites")
          .select("google_indexing_enabled")
          .eq("id", campaign.website_id)
          .maybeSingle();

        if (webConfig?.google_indexing_enabled) {
          const indexingUrl = `${supabaseUrl}/functions/v1/google-indexing`;
          await fetch(indexingUrl, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ action: "auto-submit", website_id: campaign.website_id }),
          });
        }
      } catch (e) {
        console.error("Auto-indexing failed:", e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      generated: processedCount - failedCount,
      failed: failedCount,
      total: csvRows.length,
      ai_generations_used: aiGenerationsUsed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
