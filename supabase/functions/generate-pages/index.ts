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

// Detect {{AI:...}} blocks in content
function extractAiBlocks(content: string): { fullMatch: string; prompt: string }[] {
  const regex = /\{\{AI:([\s\S]*?)\}\}/g;
  const blocks: { fullMatch: string; prompt: string }[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push({ fullMatch: match[0], prompt: match[1].trim() });
  }
  return blocks;
}

// Generate AI content for a single prompt
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

IMPORTANT: Return ONLY the generated content text. No markdown formatting, no headers, no extra commentary. Just the clean text content ready to be inserted into HTML.`;

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
    if (response.status === 429) throw new Error("AI rate limit exceeded. Please try again later.");
    if (response.status === 402) throw new Error("AI credits exhausted. Please add more credits.");
    throw new Error(`AI generation failed (${response.status})`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content returned from AI");
  return content.trim();
}

// Generate SEO metadata using AI
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
          content: `You are an SEO expert. Generate optimized SEO metadata for web pages.
Tone: ${settings.tone}
Language: ${settings.language}`,
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
                seo_title: {
                  type: "string",
                  description: "SEO-optimized title tag, max 60 characters, include primary keyword",
                },
                seo_description: {
                  type: "string",
                  description: "Meta description, max 160 characters, compelling and keyword-rich",
                },
                seo_keywords: {
                  type: "array",
                  items: { type: "string" },
                  description: "5-8 relevant SEO keywords",
                },
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
    console.error("SEO AI error:", response.status);
    // Fallback to basic SEO
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
    } catch {
      // fallthrough
    }
  }

  return {
    seo_title: pageTitle.slice(0, 60),
    seo_description: snippet.slice(0, 160),
    seo_keywords: [],
  };
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

    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      return new Response(JSON.stringify({ error: "No template assigned to this campaign" }), {
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

    // AI blocks + 1 SEO generation per page
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiGenerationsNeeded = 0;
    if (hasAiBlocks) {
      aiGenerationsNeeded = csvRows.length * aiBlocks.length;
    }
    // SEO generation counts as 1 per page
    const seoGenerationsNeeded = LOVABLE_API_KEY ? csvRows.length : 0;
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
          error: `AI generation limit exceeded. You need ${totalAiNeeded} generations but only have ${limit - used} remaining. Upgrade your plan for more.`,
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

    await supabase
      .from("campaigns")
      .update({ status: "processing", processed_rows: 0 })
      .eq("id", campaign_id);

    const generatedPages: {
      campaign_id: string;
      user_id: string;
      website_id: string | null;
      title: string;
      slug: string;
      content: string;
      status: string;
      error_message: string | null;
      seo_title: string | null;
      seo_description: string | null;
      seo_keywords: string[] | null;
    }[] = [];

    let processedCount = 0;
    let aiGenerationsUsed = 0;
    let aiErrors: string[] = [];

    for (const row of csvRows) {
      try {
        let pageContent = templateContent;
        let pageTitle = "";

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
              console.error("AI block error:", aiErr.message);
              aiErrors.push(aiErr.message);
              pageContent = pageContent.replace(
                block.fullMatch,
                `<em style="color: #dc2626;">[AI content generation failed: ${aiErr.message}]</em>`
              );
            }
          }
        }

        const h1Match = pageContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (h1Match) {
          pageTitle = h1Match[1].replace(/<[^>]*>/g, "").trim();
        } else {
          const values = Object.values(row).filter(Boolean);
          pageTitle = values.slice(0, 2).join(" - ") || `Page ${processedCount + 1}`;
        }

        const slug = slugify(pageTitle) || `page-${processedCount + 1}`;

        // Generate SEO metadata using AI
        let seoData: { seo_title: string; seo_description: string; seo_keywords: string[] } = {
          seo_title: pageTitle.slice(0, 60),
          seo_description: pageContent.replace(/<[^>]*>/g, "").slice(0, 160),
          seo_keywords: [],
        };

        if (LOVABLE_API_KEY) {
          try {
            seoData = await generateSeoMetadata(pageTitle, pageContent, aiSettings, LOVABLE_API_KEY);
            aiGenerationsUsed++;
          } catch (seoErr: any) {
            console.error("SEO generation error:", seoErr.message);
            // Keep fallback seoData
          }
        }

        generatedPages.push({
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
        generatedPages.push({
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
      }
    }

    if (generatedPages.length > 0) {
      const { error: insertError } = await supabase
        .from("generated_pages")
        .insert(generatedPages);

      if (insertError) {
        await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaign_id);
        return new Response(JSON.stringify({ error: "Failed to store generated pages", details: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (aiGenerationsUsed > 0) {
      const { data: currentSub } = await supabase
        .from("subscriptions")
        .select("ai_generations_used")
        .eq("user_id", user.id)
        .maybeSingle();

      if (currentSub) {
        await supabase
          .from("subscriptions")
          .update({ ai_generations_used: (currentSub.ai_generations_used || 0) + aiGenerationsUsed })
          .eq("user_id", user.id);
      }
    }

    await supabase
      .from("campaigns")
      .update({
        status: aiErrors.length > 0 && aiErrors.length === aiBlocks.length * csvRows.length ? "failed" : "completed",
        processed_rows: generatedPages.filter(p => p.status !== "failed").length,
      })
      .eq("id", campaign_id);

    return new Response(
      JSON.stringify({
        success: true,
        generated: generatedPages.filter(p => p.status !== "failed").length,
        failed: generatedPages.filter(p => p.status === "failed").length,
        total: csvRows.length,
        ai_generations_used: aiGenerationsUsed,
        ai_errors: aiErrors.length > 0 ? aiErrors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
