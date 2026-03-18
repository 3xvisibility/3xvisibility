import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function slugify(text: string): string {
  // Normalize accents, strip diacritics, lowercase, clean
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Process {{#if variable}}...{{/if}} conditionals
function processConditionals(content: string, vars: Record<string, string>): string {
  return content.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{#else\}\}([\s\S]*?))?\{\{\/if\}\}/gi,
    (_match, varName, ifBlock, elseBlock) => {
      const value = vars[varName] || vars[varName.toLowerCase()];
      return (value && value.trim()) ? ifBlock : (elseBlock || "");
    }
  );
}

// Process {{#each items}}...{{/each}} loops (items = comma-separated string)
function processLoops(content: string, vars: Record<string, string>): string {
  return content.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/gi,
    (_match, varName, loopBlock) => {
      const value = vars[varName] || vars[varName.toLowerCase()];
      if (!value) return "";
      const items = value.split(",").map(s => s.trim()).filter(Boolean);
      return items.map((item, index) =>
        loopBlock
          .replace(/\{\{this\}\}/gi, item)
          .replace(/\{\{@index\}\}/gi, String(index))
          .replace(/\{\{@number\}\}/gi, String(index + 1))
      ).join("\n");
    }
  );
}

// Build JSON-LD structured data based on campaign type and row data
function buildJsonLd(
  campaignType: string,
  pageTitle: string,
  seoDescription: string,
  slug: string,
  geoSettings: Record<string, any>,
  row: Record<string, string>
): string {
  const escape = (s: string) => s.replace(/"/g, '\\"');

  if (campaignType === "geo") {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: pageTitle,
      description: seoDescription,
    };
    if (geoSettings.city || geoSettings.region || geoSettings.country) {
      schema.address = {
        "@type": "PostalAddress",
        addressLocality: geoSettings.city || "",
        addressRegion: geoSettings.region || "",
        addressCountry: geoSettings.country || "",
        postalCode: geoSettings.postcode || "",
      };
    }
    if (geoSettings.lat && geoSettings.lng) {
      schema.geo = { "@type": "GeoCoordinates", latitude: geoSettings.lat, longitude: geoSettings.lng };
    }
    if (row.phone || row.telephone) schema.telephone = row.phone || row.telephone;
    if (row.email) schema.email = row.email;
    return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  }

  // Check for FAQ-style data
  if (row.question && row.answer) {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{
        "@type": "Question",
        name: row.question,
        acceptedAnswer: { "@type": "Answer", text: row.answer },
      }],
    };
    return `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`;
  }

  // Default WebPage schema
  const webSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle,
    description: seoDescription,
  };
  return `<script type="application/ld+json">${JSON.stringify(webSchema)}</script>`;
}

// Build GEO reusable HTML blocks (address, phone, opening hours)
function buildGeoBlocks(geoSettings: Record<string, any>, row: Record<string, string>): string {
  const parts: string[] = [];

  // Address block
  const addressParts = [geoSettings.city, geoSettings.region, geoSettings.postcode, geoSettings.country].filter(Boolean);
  if (addressParts.length > 0) {
    parts.push(`<div class="geo-address" itemscope itemtype="https://schema.org/PostalAddress">
  <strong>📍 Address</strong><br>
  ${geoSettings.city ? `<span itemprop="addressLocality">${geoSettings.city}</span>` : ""}${geoSettings.region ? `, <span itemprop="addressRegion">${geoSettings.region}</span>` : ""}${geoSettings.postcode ? ` <span itemprop="postalCode">${geoSettings.postcode}</span>` : ""}${geoSettings.country ? `<br><span itemprop="addressCountry">${geoSettings.country}</span>` : ""}
</div>`);
  }

  // Phone block
  const phone = row.phone || row.telephone;
  if (phone) {
    parts.push(`<div class="geo-phone"><strong>📞 Phone</strong><br><a href="tel:${phone}" itemprop="telephone">${phone}</a></div>`);
  }

  // Opening hours block
  const hours = row.opening_hours || row.hours;
  if (hours) {
    parts.push(`<div class="geo-hours"><strong>🕐 Opening Hours</strong><br><span itemprop="openingHours">${hours}</span></div>`);
  }

  return parts.length > 0 ? `\n<!-- GEO Blocks -->\n<section class="geo-info">\n${parts.join("\n")}\n</section>` : "";
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
  if (url) tags.push(`<meta property="og:url" content="${escape(url)}">`);
  if (imageUrl) {
    tags.push(`<meta property="og:image" content="${escape(imageUrl)}">`);
    tags.push(`<meta name="twitter:image" content="${escape(imageUrl)}">`);
  }
  return `<!-- Open Graph Meta Tags -->\n${tags.join("\n")}`;
}

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

// Update GenerationJob progress (realtime-enabled table)
async function updateJob(supabase: any, jobId: string, updates: Record<string, any>) {
  await supabase.from("generation_jobs").update({
    ...updates,
    updated_at: new Date().toISOString(),
  }).eq("id", jobId);
}

const BATCH_SIZE = 50;

Deno.serve(async (req) => {
  console.log("[GENERATE-PAGES] Request received:", req.method);
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

    // Support service-role calls from the scheduled runner
    const serviceRoleHeader = req.headers.get("x-service-role-key");
    let user: { id: string } | null = null;

    if (serviceRoleHeader === supabaseServiceKey) {
      // Service-role call — resolve user from the campaign after parsing body
      // We'll set user below after reading campaign_id
    } else {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: authUser }, error: userError } = await userClient.auth.getUser();
      if (userError || !authUser) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      user = authUser;
    }

    const body = await req.json();
    console.log("[GENERATE-PAGES] Body parsed:", JSON.stringify({ campaign_id: body.campaign_id, action: body.action }));
    const { campaign_id, action } = body;

    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For service-role calls, resolve user_id from the campaign
    if (!user) {
      const { data: campLookup } = await supabase.from("campaigns").select("user_id").eq("id", campaign_id).maybeSingle();
      if (!campLookup) {
        return new Response(JSON.stringify({ error: "Campaign not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      user = { id: campLookup.user_id };
    }

    // Handle pause action — update both campaign and active job
    if (action === "pause") {
      await supabase.from("campaigns").update({ is_paused: true }).eq("id", campaign_id).eq("user_id", user.id);
      // Pause active job
      const { data: activeJob } = await supabase
        .from("generation_jobs")
        .select("id")
        .eq("campaign_id", campaign_id)
        .eq("status", "running")
        .maybeSingle();
      if (activeJob) {
        await updateJob(supabase, activeJob.id, { status: "paused" });
      }
      await logEvent(supabase, campaign_id, user.id, "paused", "Generation paused by user");
      return new Response(JSON.stringify({ success: true, action: "paused" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle resume — update campaign and resume paused job
    let existingJobId: string | null = null;
    if (action === "resume") {
      await supabase.from("campaigns").update({ is_paused: false, status: "processing" }).eq("id", campaign_id).eq("user_id", user.id);
      const { data: pausedJob } = await supabase
        .from("generation_jobs")
        .select("id")
        .eq("campaign_id", campaign_id)
        .eq("status", "paused")
        .maybeSingle();
      if (pausedJob) {
        existingJobId = pausedJob.id;
        await updateJob(supabase, pausedJob.id, { status: "running" });
      }
      await logEvent(supabase, campaign_id, user.id, "resumed", "Generation resumed by user");
    }

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*, templates(content, variables, seo_title_pattern, seo_description_pattern, schema_type, schema_config)")
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

    // Check if campaign is scheduled for later
    if (campaign.scheduled_at && !action) {
      const scheduledTime = new Date(campaign.scheduled_at).getTime();
      if (scheduledTime > Date.now()) {
        return new Response(JSON.stringify({
          error: `Campaign is scheduled for ${campaign.scheduled_at}. It cannot be run before the scheduled time.`,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Try loading CSV from dedicated storage table first, fall back to inline csv_data
    let csvRows: Record<string, string>[] = [];
    const { data: csvFile } = await supabase
      .from("campaign_csv_files")
      .select("raw_content, headers")
      .eq("campaign_id", campaign_id)
      .maybeSingle();

    if (csvFile?.raw_content) {
      // Parse raw CSV text
      const lines = (csvFile.raw_content as string).split("\n").filter((l: string) => l.trim());
      if (lines.length > 1) {
        const firstLine = lines[0];
        let delimiter = ",";
        if (firstLine.includes("\t")) delimiter = "\t";
        else if (firstLine.split(";").length > firstLine.split(",").length) delimiter = ";";
        else if (firstLine.split("|").length > firstLine.split(",").length) delimiter = "|";

        const headers = firstLine.split(delimiter).map((h: string) => h.trim().replace(/^["']|["']$/g, ""));
        csvRows = lines.slice(1).map((line: string) => {
          const values = line.split(delimiter).map((v: string) => v.trim().replace(/^["']|["']$/g, ""));
          return headers.reduce((acc: Record<string, string>, h: string, i: number) => ({ ...acc, [h]: values[i] || "" }), {});
        });
      }
    }

    // Fall back to inline csv_data
    if (csvRows.length === 0) {
      csvRows = (campaign.csv_data || []) as Record<string, string>[];
    }

    if (csvRows.length === 0) {
      return new Response(JSON.stringify({ error: "No CSV data in this campaign" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load custom mappings from the mappings table
    const { data: customMappings } = await supabase
      .from("mappings")
      .select("source_column, target_field, transform_expression")
      .eq("campaign_id", campaign_id)
      .order("sort_order", { ascending: true });

    const alreadyProcessed = campaign.processed_rows || 0;
    const startIndex = action === "resume" ? alreadyProcessed : 0;
    // Apply max_rows limit if set
    const maxRowsLimit = campaign.max_rows ? Math.min(campaign.max_rows, csvRows.length) : csvRows.length;
    const limitedRows = csvRows.slice(0, maxRowsLimit);
    const remainingRows = limitedRows.slice(startIndex);

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

    // Create or reuse GenerationJob
    let jobId = existingJobId;
    const isFirstRun = action !== "resume";

    if (isFirstRun) {
      // Create a new generation job
      const { data: newJob, error: jobErr } = await supabase
        .from("generation_jobs")
        .insert({
          campaign_id,
          workspace_id: campaign.workspace_id,
          user_id: user.id,
          status: "running",
          total_rows: limitedRows.length,
          processed_rows: 0,
          success_count: 0,
          error_count: 0,
          current_batch: 0,
          batch_size: BATCH_SIZE,
          started_at: new Date().toISOString(),
          config: {
            has_ai_blocks: hasAiBlocks,
            ai_blocks_count: aiBlocks.length,
            campaign_type: campaign.campaign_type || "seo",
          },
        })
        .select("id")
        .single();

      if (jobErr) {
        console.error("Failed to create generation job:", jobErr);
      } else {
        jobId = newJob.id;
      }

      await supabase.from("campaigns").update({
        status: "processing",
        processed_rows: 0,
        failed_rows: 0,
        current_batch: 0,
        is_paused: false,
        generation_started_at: new Date().toISOString(),
        generation_completed_at: null,
      }).eq("id", campaign_id);

      await logEvent(supabase, campaign_id, user.id, "started", `Generation started. ${csvRows.length} total pages to generate. Job: ${jobId}`);
    }

    // Process in batches
    const totalBatches = Math.ceil(remainingRows.length / BATCH_SIZE);
    let processedCount = alreadyProcessed;
    let failedCount = campaign.failed_rows || 0;
    let successCount = alreadyProcessed - (campaign.failed_rows || 0);
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
        await logEvent(supabase, campaign_id, user.id, "paused_during_batch",
          `Paused after batch ${batchesCompleted}. ${processedCount}/${csvRows.length} pages processed.`, batchesCompleted);

        await supabase.from("campaigns").update({
          status: "queued",
          processed_rows: processedCount,
          failed_rows: failedCount,
          current_batch: batchesCompleted,
        }).eq("id", campaign_id);

        if (jobId) {
          await updateJob(supabase, jobId, {
            status: "paused",
            processed_rows: processedCount,
            success_count: successCount,
            error_count: failedCount,
            current_batch: batchesCompleted,
          });
        }

        return new Response(JSON.stringify({
          success: true,
          paused: true,
          generated: successCount,
          failed: failedCount,
          total: csvRows.length,
          remaining: csvRows.length - processedCount,
          job_id: jobId,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const batchStart = batchIdx * BATCH_SIZE;
      const batchRows = remainingRows.slice(batchStart, batchStart + BATCH_SIZE);
      batchesCompleted++;

      await logEvent(supabase, campaign_id, user.id, "batch_started",
        `Batch ${batchesCompleted} started (${batchRows.length} pages)`, batchesCompleted, batchRows.length);

      const batchPages: any[] = [];

      for (const row of batchRows) {
        try {
          let pageContent = templateContent;

          // Build combined vars for conditionals/loops
          const allVars: Record<string, string> = { ...row };
          const geoSettings = (campaign.geo_settings || {}) as Record<string, any>;
          for (const [gk, gv] of Object.entries(geoSettings)) {
            if (typeof gv === "string") allVars[gk] = gv;
          }

          // Process conditional logic {{#if}}...{{/if}}
          pageContent = processConditionals(pageContent, allVars);

          // Process loops {{#each}}...{{/each}}
          pageContent = processLoops(pageContent, allVars);

          // Apply custom mappings first if available, then fall back to direct replacement
          if (customMappings && customMappings.length > 0) {
            for (const mapping of customMappings) {
              const value = row[mapping.source_column] || "";
              let finalValue = value;
              if (mapping.transform_expression) {
                try {
                  if (mapping.transform_expression === "uppercase") finalValue = value.toUpperCase();
                  else if (mapping.transform_expression === "lowercase") finalValue = value.toLowerCase();
                  else if (mapping.transform_expression === "capitalize") finalValue = value.charAt(0).toUpperCase() + value.slice(1);
                  else if (mapping.transform_expression.startsWith("prefix:")) finalValue = mapping.transform_expression.slice(7) + value;
                  else if (mapping.transform_expression.startsWith("suffix:")) finalValue = value + mapping.transform_expression.slice(7);
                } catch { /* use original value */ }
              }
              const regex = new RegExp(`\\{${mapping.target_field}\\}`, "gi");
              pageContent = pageContent.replace(regex, finalValue);
            }
          }

          // Inject geo_settings as template variables
          for (const [geoKey, geoValue] of Object.entries(geoSettings)) {
            if (typeof geoValue === "string") {
              const geoRegex = new RegExp(`\\{${geoKey}\\}`, "gi");
              pageContent = pageContent.replace(geoRegex, geoValue);
            }
          }

          // Standard variable replacement for any remaining placeholders
          for (const [key, value] of Object.entries(row)) {
            const regex = new RegExp(`\\{${key}\\}`, "gi");
            pageContent = pageContent.replace(regex, value || "");
          }

          // Replace {{GEO_BLOCKS}} placeholder with reusable GEO HTML
          if (pageContent.includes("{{GEO_BLOCKS}}")) {
            const geoBlocksHtml = buildGeoBlocks(geoSettings, row);
            pageContent = pageContent.replace(/\{\{GEO_BLOCKS\}\}/gi, geoBlocksHtml);
          } else if ((campaign.campaign_type || "seo") === "geo") {
            // Auto-append GEO blocks for GEO campaigns
            pageContent += buildGeoBlocks(geoSettings, row);
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

          // Build UTM query string from campaign utm_settings
          const utmSettings = (campaign.utm_settings || {}) as Record<string, string>;
          const utmParams: string[] = [];
          for (const [utmKey, utmVal] of Object.entries(utmSettings)) {
            if (typeof utmVal === "string" && utmVal.trim()) {
              let resolvedVal = utmVal;
              for (const [rk, rv] of Object.entries(row)) {
                resolvedVal = resolvedVal.replace(new RegExp(`\\{${rk}\\}`, "gi"), rv || "");
              }
              utmParams.push(`${encodeURIComponent(utmKey)}=${encodeURIComponent(resolvedVal)}`);
            }
          }
          const utmQueryString = utmParams.length > 0 ? `?${utmParams.join("&")}` : "";

          // Apply template SEO patterns if defined, otherwise use AI
          const tplSeoTitle = campaign.templates.seo_title_pattern as string || "";
          const tplSeoDesc = campaign.templates.seo_description_pattern as string || "";

          let seoData = {
            seo_title: pageTitle.slice(0, 60),
            seo_description: pageContent.replace(/<[^>]*>/g, "").slice(0, 160),
            seo_keywords: [] as string[],
          };

          if (tplSeoTitle || tplSeoDesc) {
            // Resolve variables in SEO patterns
            const resolvePattern = (pattern: string): string => {
              let resolved = pattern;
              for (const [key, value] of Object.entries(allVars)) {
                resolved = resolved.replace(new RegExp(`\\{${key}\\}`, "gi"), value || "");
              }
              return resolved;
            };
            if (tplSeoTitle) seoData.seo_title = resolvePattern(tplSeoTitle).slice(0, 60);
            if (tplSeoDesc) seoData.seo_description = resolvePattern(tplSeoDesc).slice(0, 160);

            // Still generate keywords via AI if available
            if (LOVABLE_API_KEY) {
              try {
                const aiSeo = await generateSeoMetadata(pageTitle, pageContent, aiSettings, LOVABLE_API_KEY);
                seoData.seo_keywords = aiSeo.seo_keywords;
                aiGenerationsUsed++;
              } catch { /* keep empty keywords */ }
            }
          } else if (LOVABLE_API_KEY) {
            try {
              seoData = await generateSeoMetadata(pageTitle, pageContent, aiSettings, LOVABLE_API_KEY);
              aiGenerationsUsed++;
            } catch { /* keep fallback */ }
          }

          // Build canonical URL
          let canonicalUrl: string | null = null;
          if (campaign.website_id) {
            const { data: website } = await supabase.from("websites").select("url").eq("id", campaign.website_id).maybeSingle();
            if (website?.url) {
              const baseUrl = website.url.replace(/\/+$/, "");
              canonicalUrl = `${baseUrl}/${slug}`;
            }
          }

          // Build JSON-LD structured data — use template schema config if defined
          const tplSchemaType = campaign.templates.schema_type as string || "";
          const tplSchemaConfig = (campaign.templates.schema_config || {}) as Record<string, string>;
          let jsonLd: string;

          if (tplSchemaType && tplSchemaType !== "WebPage") {
            // Resolve variables in schema config values
            const resolvedSchema: Record<string, any> = {
              "@context": "https://schema.org",
              "@type": tplSchemaType,
            };
            for (const [sk, sv] of Object.entries(tplSchemaConfig)) {
              if (!sv) continue;
              let resolved = sv;
              for (const [key, value] of Object.entries(allVars)) {
                resolved = resolved.replace(new RegExp(`\\{${key}\\}`, "gi"), value || "");
              }
              resolvedSchema[sk] = resolved;
            }
            // Add description from SEO data if not set
            if (!resolvedSchema.description) resolvedSchema.description = seoData.seo_description;
            if (!resolvedSchema.name) resolvedSchema.name = pageTitle;

            // Nest address fields for LocalBusiness
            if (tplSchemaType === "LocalBusiness") {
              const addrFields = ["addressLocality", "addressRegion", "addressCountry", "postalCode"];
              const address: Record<string, string> = {};
              for (const af of addrFields) {
                if (resolvedSchema[af]) {
                  address[af] = resolvedSchema[af];
                  delete resolvedSchema[af];
                }
              }
              if (Object.keys(address).length > 0) {
                resolvedSchema.address = { "@type": "PostalAddress", ...address };
              }
            }

            // Build Product offer structure
            if (tplSchemaType === "Product" && resolvedSchema.price) {
              resolvedSchema.offers = {
                "@type": "Offer",
                price: resolvedSchema.price,
                priceCurrency: resolvedSchema.currency || "USD",
              };
              delete resolvedSchema.price;
              delete resolvedSchema.currency;
            }

            // Build FAQ structure
            if (tplSchemaType === "FAQPage" && resolvedSchema.question) {
              resolvedSchema.mainEntity = [{
                "@type": "Question",
                name: resolvedSchema.question,
                acceptedAnswer: { "@type": "Answer", text: resolvedSchema.answer || "" },
              }];
              delete resolvedSchema.question;
              delete resolvedSchema.answer;
            }

            jsonLd = `<script type="application/ld+json">${JSON.stringify(resolvedSchema)}</script>`;
          } else {
            jsonLd = buildJsonLd(
              campaign.campaign_type || "seo",
              pageTitle,
              seoData.seo_description,
              slug,
              geoSettings,
              row
            );
          }

          // Build OG meta tags + canonical
          const ogTags = buildOgMetaTags(seoData.seo_title, seoData.seo_description, canonicalUrl || undefined);
          const canonicalTag = canonicalUrl ? `<link rel="canonical" href="${canonicalUrl}">` : "";
          pageContent = `${ogTags}\n${canonicalTag}\n${jsonLd}\n${pageContent}`;

          // Extract SEA ad IDs from utm_settings or row data
          const adCampaignId = (utmSettings as any).ad_campaign_id || row.ad_campaign_id || null;
          const adGroupId = (utmSettings as any).ad_group_id || row.ad_group_id || null;

          batchPages.push({
            campaign_id,
            user_id: user.id,
            website_id: campaign.website_id,
            workspace_id: campaign.workspace_id,
            title: pageTitle,
            slug: slug + utmQueryString,
            content: pageContent,
            status: (campaign.publish_mode === "published" ? "published" : "pending") as any,
            error_message: null,
            seo_title: seoData.seo_title,
            seo_description: seoData.seo_description,
            seo_keywords: seoData.seo_keywords,
            canonical_url: canonicalUrl,
            ad_campaign_id: adCampaignId,
            ad_group_id: adGroupId,
          });

          processedCount++;
          successCount++;
        } catch (err: any) {
          batchPages.push({
            campaign_id,
            user_id: user.id,
            website_id: campaign.website_id,
            workspace_id: campaign.workspace_id,
            title: `Failed Page ${processedCount + 1}`,
            slug: `failed-page-${processedCount + 1}`,
            content: "",
            status: "failed",
            error_message: err.message || "Unknown error",
            seo_title: null,
            seo_description: null,
            seo_keywords: null,
            canonical_url: null,
            ad_campaign_id: null,
            ad_group_id: null,
          });
          processedCount++;
          failedCount++;
        }
      }

      // Insert batch
      if (batchPages.length > 0) {
        const { error: insertError } = await supabase.from("generated_pages").insert(batchPages);
        if (insertError) {
          await logEvent(supabase, campaign_id, user.id, "batch_error",
            `Batch ${batchesCompleted} insert failed: ${insertError.message}`, batchesCompleted);
          failedCount += batchPages.length;
        }
      }

      const batchFailed = batchPages.filter(p => p.status === "failed").length;
      await logEvent(supabase, campaign_id, user.id, "batch_completed",
        `Batch ${batchesCompleted} done: ${batchPages.length - batchFailed} ok, ${batchFailed} failed`,
        batchesCompleted, batchPages.length);

      // Update campaign progress
      await supabase.from("campaigns").update({
        processed_rows: processedCount,
        failed_rows: failedCount,
        current_batch: batchesCompleted,
      }).eq("id", campaign_id);

      // Update GenerationJob progress (realtime)
      if (jobId) {
        await updateJob(supabase, jobId, {
          processed_rows: processedCount,
          success_count: successCount,
          error_count: failedCount,
          current_batch: batchesCompleted,
        });
      }
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

    // Finalize GenerationJob
    if (jobId) {
      await updateJob(supabase, jobId, {
        status: finalStatus === "failed" ? "failed" : "completed",
        processed_rows: processedCount,
        success_count: successCount,
        error_count: failedCount,
        current_batch: batchesCompleted,
        completed_at: new Date().toISOString(),
      });
    }

    await logEvent(supabase, campaign_id, user.id, "completed",
      `Generation ${finalStatus}. ${successCount} pages generated, ${failedCount} failed. Job: ${jobId}`);

    // Create user notification
    const notifType = finalStatus === "failed" ? "error" : "success";
    const notifTitle = finalStatus === "failed"
      ? `Campaign "${campaign.name}" failed`
      : `Campaign "${campaign.name}" completed`;
    const notifMessage = `${successCount} pages generated, ${failedCount} failed.`;
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: notifTitle,
      message: notifMessage,
      type: notifType,
      campaign_id: campaign_id,
    });

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
      generated: successCount,
      failed: failedCount,
      total: csvRows.length,
      ai_generations_used: aiGenerationsUsed,
      job_id: jobId,
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
