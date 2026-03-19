import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ═══════════════════════════════════════════════════════════
// Spintax / Content Spinning Support
// Syntax: {option1|option2|option3} — randomly picks one
// Supports nested spintax: {outer {inner1|inner2}|other}
// ═══════════════════════════════════════════════════════════
function processSpintax(text: string): string {
  const MAX_DEPTH = 10;
  let result = text;
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    // Match innermost {a|b|c} blocks (no nested braces inside)
    const spintaxRegex = /\{([^{}]*?\|[^{}]*?)\}/g;
    if (!spintaxRegex.test(result)) break;
    result = result.replace(spintaxRegex, (_match, group: string) => {
      const options = group.split("|");
      return options[Math.floor(Math.random() * options.length)];
    });
  }
  return result;
}

// ═══════════════════════════════════════════════════════════
// Dynamic Elements — shortcodes for maps, videos, images, embeds
// ═══════════════════════════════════════════════════════════

function resolveVarsInQuery(query: string, vars: Record<string, string>): string {
  let resolved = query;
  for (const [k, v] of Object.entries(vars)) {
    resolved = resolved.replace(new RegExp(`\\{${k}\\}`, "gi"), v || "");
  }
  return resolved.trim();
}

function processDynamicElements(content: string, vars: Record<string, string>): string {
  let result = content;

  // {{MAP:query}} or {{MAP:lat,lng}} — Google Maps embed
  result = result.replace(/\{\{MAP:(.*?)\}\}/gi, (_match, query: string) => {
    const encoded = encodeURIComponent(resolveVarsInQuery(query, vars));
    return `<div class="dynamic-map" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:1em 0;">
  <iframe src="https://maps.google.com/maps?q=${encoded}&output=embed" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
</div>`;
  });

  // {{OSM:query}} — OpenStreetMap embed (free alternative to Google Maps)
  result = result.replace(/\{\{OSM:(.*?)\}\}/gi, (_match, query: string) => {
    const resolvedQuery = resolveVarsInQuery(query, vars);
    const encoded = encodeURIComponent(resolvedQuery);
    // Check if query looks like lat,lng coordinates
    const coordMatch = resolvedQuery.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    let src: string;
    if (coordMatch) {
      const [, lat, lng] = coordMatch;
      src = `https://www.openstreetmap.org/export/embed.html?bbox=${Number(lng)-0.01},${Number(lat)-0.01},${Number(lng)+0.01},${Number(lat)+0.01}&layer=mapnik&marker=${lat},${lng}`;
    } else {
      src = `https://www.openstreetmap.org/export/embed.html?bbox=-180,-90,180,90&layer=mapnik`;
      // Use nominatim search fallback
      src = `https://www.openstreetmap.org/export/embed.html?bbox=-10,35,30,60&layer=mapnik`;
    }
    return `<div class="dynamic-osm" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:1em 0;">
  <iframe src="${src}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen loading="lazy"></iframe>
  <br/><small><a href="https://www.openstreetmap.org/?query=${encoded}" target="_blank">View larger map</a></small>
</div>`;
  });

  // {{YOUTUBE:search query}} — YouTube embed
  result = result.replace(/\{\{YOUTUBE:(.*?)\}\}/gi, (_match, query: string) => {
    const encoded = encodeURIComponent(resolveVarsInQuery(query, vars));
    return `<div class="dynamic-youtube" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:1em 0;">
  <iframe src="https://www.youtube.com/embed?listType=search&list=${encoded}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen loading="lazy"></iframe>
</div>`;
  });

  // {{IMAGE:search query}} — Unsplash image
  result = result.replace(/\{\{IMAGE:(.*?)\}\}/gi, (_match, query: string) => {
    const resolvedQuery = resolveVarsInQuery(query, vars);
    const encoded = encodeURIComponent(resolvedQuery);
    return `<div class="dynamic-image" style="margin:1em 0;">
  <img src="https://source.unsplash.com/800x450/?${encoded}" alt="${resolvedQuery}" style="width:100%;height:auto;border-radius:8px;" loading="lazy">
</div>`;
  });

  // {{PEXELS:search query}} — Pexels stock photo (uses their free embed)
  result = result.replace(/\{\{PEXELS:(.*?)\}\}/gi, (_match, query: string) => {
    const resolvedQuery = resolveVarsInQuery(query, vars);
    const encoded = encodeURIComponent(resolvedQuery);
    const seed = Math.floor(Math.random() * 50) + 1;
    return `<div class="dynamic-pexels" style="margin:1em 0;">
  <img src="https://images.pexels.com/photos/${seed}/pexels-photo-${seed}.jpeg?auto=compress&cs=tinysrgb&w=800&h=450&dpr=1" alt="${resolvedQuery}" style="width:100%;height:auto;border-radius:8px;" loading="lazy" onerror="this.src='https://source.unsplash.com/800x450/?${encoded}'">
  <small style="display:block;text-align:right;color:#94a3b8;font-size:0.75em;margin-top:4px;">Photo from Pexels</small>
</div>`;
  });

  // {{PIXABAY:search query}} — Pixabay stock photo placeholder
  result = result.replace(/\{\{PIXABAY:(.*?)\}\}/gi, (_match, query: string) => {
    const resolvedQuery = resolveVarsInQuery(query, vars);
    const encoded = encodeURIComponent(resolvedQuery);
    return `<div class="dynamic-pixabay" style="margin:1em 0;">
  <img src="https://pixabay.com/get/placeholder/?q=${encoded}&w=800&h=450" alt="${resolvedQuery}" style="width:100%;height:auto;border-radius:8px;" loading="lazy" onerror="this.src='https://source.unsplash.com/800x450/?${encoded}'">
  <small style="display:block;text-align:right;color:#94a3b8;font-size:0.75em;margin-top:4px;">Photo from Pixabay</small>
</div>`;
  });

  // {{WIKIPEDIA:topic}} — Wikipedia excerpt embed
  result = result.replace(/\{\{WIKIPEDIA:(.*?)\}\}/gi, (_match, topic: string) => {
    const resolvedTopic = resolveVarsInQuery(topic, vars);
    const encoded = encodeURIComponent(resolvedTopic.replace(/\s+/g, "_"));
    return `<div class="dynamic-wikipedia" style="padding:1em;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:1em 0;">
  <h4 style="margin:0 0 0.5em;font-size:1em;">📖 ${resolvedTopic}</h4>
  <p style="font-size:0.9em;color:#475569;margin:0;">
    <em>Wikipedia content for "${resolvedTopic}" loads dynamically on the published page.</em>
  </p>
  <p style="margin:0.5em 0 0;font-size:0.8em;">
    <a href="https://en.wikipedia.org/wiki/${encoded}" target="_blank" rel="noopener noreferrer" style="color:#3b82f6;">Read more on Wikipedia →</a>
  </p>
  <script>
    (function(){
      var el = document.currentScript.parentElement;
      fetch('https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}')
        .then(function(r){return r.json()})
        .then(function(d){
          if(d.extract){
            el.querySelector('p').innerHTML = d.extract;
            if(d.thumbnail && d.thumbnail.source){
              var img = document.createElement('img');
              img.src = d.thumbnail.source;
              img.alt = '${resolvedTopic.replace(/'/g, "\\'")}';
              img.style.cssText = 'float:right;max-width:200px;margin:0 0 1em 1em;border-radius:4px;';
              el.insertBefore(img, el.firstChild.nextSibling);
            }
          }
        }).catch(function(){});
    })();
  </script>
</div>`;
  });

  // {{YELP:category,location}} — Yelp business listing embed
  result = result.replace(/\{\{YELP:(.*?)\}\}/gi, (_match, params: string) => {
    const resolvedParams = resolveVarsInQuery(params, vars);
    const parts = resolvedParams.split(",").map(s => s.trim());
    const category = parts[0] || "restaurants";
    const location = parts[1] || parts[0] || "";
    const yelpSearch = encodeURIComponent(`${category} ${location}`);
    return `<div class="dynamic-yelp" style="padding:1em;background:#fff;border:1px solid #e2e8f0;border-radius:8px;margin:1em 0;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:0.75em;">
    <span style="font-size:1.25em;">⭐</span>
    <h4 style="margin:0;font-size:1em;">Top ${category} in ${location}</h4>
  </div>
  <p style="font-size:0.85em;color:#64748b;margin:0 0 0.75em;">
    <em>Local business listings for "${category}" in ${location} load dynamically on the published page.</em>
  </p>
  <a href="https://www.yelp.com/search?find_desc=${encodeURIComponent(category)}&find_loc=${encodeURIComponent(location)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:0.5em 1em;background:#d32323;color:#fff;border-radius:4px;text-decoration:none;font-size:0.85em;font-weight:600;">
    View on Yelp →
  </a>
</div>`;
  });

  // {{WEATHER:location}} — OpenWeatherMap widget placeholder
  result = result.replace(/\{\{WEATHER:(.*?)\}\}/gi, (_match, location: string) => {
    const resolvedLoc = resolveVarsInQuery(location, vars);
    return `<div class="dynamic-weather" style="padding:1em;background:#f0f9ff;border-radius:8px;margin:1em 0;text-align:center;">
  <p style="font-size:0.9em;color:#64748b;">🌤️ Weather for <strong>${resolvedLoc}</strong></p>
  <p style="font-size:0.8em;color:#94a3b8;">Weather data loads on the published page</p>
</div>`;
  });

  return result;
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

function extractAiImageBlocks(content: string): { fullMatch: string; prompt: string }[] {
  const regex = /\{\{AI_IMAGE:([\s\S]*?)\}\}/g;
  const blocks: { fullMatch: string; prompt: string }[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push({ fullMatch: match[0], prompt: match[1].trim() });
  }
  return blocks;
}

async function generateAiImage(
  prompt: string,
  apiKey: string,
  supabase: any,
  campaignId: string,
  pageIndex: number,
  blockIndex: number
): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [
        { role: "user", content: `Generate a high-quality, professional image: ${prompt}` },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI image generation error:", response.status, errText);
    if (response.status === 429) throw new Error("AI rate limit exceeded.");
    if (response.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI image generation failed (${response.status})`);
  }

  const data = await response.json();
  const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageData) throw new Error("No image returned from AI");

  // Extract base64 data and upload to storage
  const base64Match = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!base64Match) throw new Error("Invalid image data format");

  const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
  const base64 = base64Match[2];
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const filePath = `${campaignId}/page-${pageIndex}-img-${blockIndex}-${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from("ai-images")
    .upload(filePath, bytes, { contentType: `image/${base64Match[1]}`, upsert: true });

  if (uploadErr) {
    console.error("Storage upload error:", uploadErr);
    throw new Error("Failed to upload AI image");
  }

  const { data: publicUrl } = supabase.storage.from("ai-images").getPublicUrl(filePath);
  return publicUrl.publicUrl;
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

// Module-level workspace tracker for logEvent
let _currentWorkspaceId: string | null = null;

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
    workspace_id: _currentWorkspaceId,
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
     console.log("[GENERATE-PAGES] Body parsed:", JSON.stringify({ campaign_id: body.campaign_id, action: body.action, test_mode: body.test_mode, overwrite_fields: body.overwrite_fields }));
    const { campaign_id, action, test_mode, overwrite_fields } = body;
    // overwrite_fields: { title?: bool, content?: bool, seo?: bool, images?: bool } — for selective re-generation
    const isOverwriteMode = overwrite_fields && typeof overwrite_fields === "object" && Object.values(overwrite_fields).some(Boolean);

    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For service-role calls, resolve user_id from the campaign
    if (!user) {
      const { data: campLookup } = await supabase.from("campaigns").select("user_id, workspace_id").eq("id", campaign_id).maybeSingle();
      if (!campLookup) {
        return new Response(JSON.stringify({ error: "Campaign not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      user = { id: campLookup.user_id };
      _currentWorkspaceId = campLookup.workspace_id || null;
    } else {
      // Pre-fetch workspace_id for logEvent calls before full campaign load
      const { data: wsLookup } = await supabase.from("campaigns").select("workspace_id").eq("id", campaign_id).maybeSingle();
      _currentWorkspaceId = wsLookup?.workspace_id || null;
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
      console.error("[GENERATE-PAGES] Campaign not found:", campaignError?.message);
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[GENERATE-PAGES] Campaign loaded:", campaign.name, "template:", !!campaign.templates);
    _currentWorkspaceId = campaign.workspace_id || null;
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
      console.error("[GENERATE-PAGES] No CSV data found for campaign");
      return new Response(JSON.stringify({ error: "No CSV data in this campaign" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("[GENERATE-PAGES] CSV rows:", csvRows.length);

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
    let limitedRows = csvRows.slice(0, maxRowsLimit);

    // ═══════════════════════════════════════════════════════════
    // Generation Methods: all | sequential | random
    // ═══════════════════════════════════════════════════════════
    const generationMethod = (campaign as any).generation_method || "all";

    if (generationMethod === "random") {
      // Shuffle rows randomly (Fisher-Yates)
      for (let i = limitedRows.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [limitedRows[i], limitedRows[j]] = [limitedRows[j], limitedRows[i]];
      }
    }
    // "sequential" uses the rows in their original CSV order (default behavior)
    // "all" also uses original order but is meant for "all combinations" mode

    // Test mode: only generate 1 draft page
    if (test_mode) {
      limitedRows = [limitedRows[0]];
    }

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
    const aiImageBlocks = extractAiImageBlocks(templateContent);
    const hasAiBlocks = aiBlocks.length > 0;
    const hasAiImageBlocks = aiImageBlocks.length > 0;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // AI limit check
    const aiGenerationsNeeded = hasAiBlocks ? remainingRows.length * aiBlocks.length : 0;
    const aiImageGenerationsNeeded = hasAiImageBlocks ? remainingRows.length * aiImageBlocks.length : 0;
    const seoGenerationsNeeded = LOVABLE_API_KEY ? remainingRows.length : 0;
    const totalAiNeeded = aiGenerationsNeeded + aiImageGenerationsNeeded + seoGenerationsNeeded;

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

    if ((hasAiBlocks || hasAiImageBlocks) && !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create or reuse GenerationJob
    let jobId = existingJobId;
    const isFirstRun = action !== "resume";

    if (isFirstRun && !test_mode) {
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
            has_ai_image_blocks: hasAiImageBlocks,
            ai_blocks_count: aiBlocks.length,
            ai_image_blocks_count: aiImageBlocks.length,
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

    // Pre-fetch website URL once (instead of per-row)
    let websiteBaseUrl: string | null = null;
    if (campaign.website_id) {
      const { data: website } = await supabase.from("websites").select("url").eq("id", campaign.website_id).maybeSingle();
      if (website?.url) websiteBaseUrl = website.url.replace(/\/+$/, "");
    }

    const TIMEOUT_MS = 120_000; // 120s soft limit (edge functions have ~150s hard limit)
    const startTime = Date.now();

    console.log("[GENERATE-PAGES] Starting batch processing. Rows:", remainingRows.length, "AI blocks:", aiBlocks.length);

    // Process in batches
    const totalBatches = Math.ceil(remainingRows.length / BATCH_SIZE);
    let processedCount = alreadyProcessed;
    let failedCount = campaign.failed_rows || 0;
    let successCount = alreadyProcessed - (campaign.failed_rows || 0);
    let aiGenerationsUsed = 0;
    let batchesCompleted = campaign.current_batch || 0;
    let timedOut = false;

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      // Timeout guard — save progress and return partial results
      if (Date.now() - startTime > TIMEOUT_MS) {
        timedOut = true;
        console.log(`[GENERATE-PAGES] Timeout reached after ${batchesCompleted} batches. Saving partial results.`);
        await logEvent(supabase, campaign_id, user.id, "timeout_partial",
          `Timeout after ${batchesCompleted} batches. ${processedCount}/${limitedRows.length} processed. Will auto-resume.`,
          batchesCompleted);

        // Save progress so it can be resumed
        await supabase.from("campaigns").update({
          status: "queued",
          processed_rows: processedCount,
          failed_rows: failedCount,
          current_batch: batchesCompleted,
          is_paused: false,
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

        // Auto-trigger a resume call so the next invocation picks up where we left off
        try {
          const resumeUrl = `${supabaseUrl}/functions/v1/generate-pages`;
          fetch(resumeUrl, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
              "x-service-role-key": supabaseServiceKey,
            },
            body: JSON.stringify({ campaign_id, action: "resume" }),
          }).catch(() => {}); // fire-and-forget
        } catch { /* ignore */ }

        return new Response(JSON.stringify({
          success: true,
          partial: true,
          generated: successCount,
          failed: failedCount,
          total: limitedRows.length,
          remaining: limitedRows.length - processedCount,
          job_id: jobId,
          message: `Timeout reached. ${successCount} pages generated so far. Auto-resuming remaining ${limitedRows.length - processedCount} pages.`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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

          // Process variable transforms {variable:transform} BEFORE standard replacement
          // Supports: uppercase, lowercase, capitalize, slug, extract(n), truncate(n)
          pageContent = pageContent.replace(/\{(\w+):(\w+(?:\(\d+\))?)\}/gi, (_m, varName, transform) => {
            const rawVal = allVars[varName] || allVars[varName.toLowerCase()] || row[varName] || "";
            const t = transform.toLowerCase();
            if (t === "uppercase") return rawVal.toUpperCase();
            if (t === "lowercase") return rawVal.toLowerCase();
            if (t === "capitalize") return rawVal.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
            if (t === "slug") return rawVal.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
            const extractMatch = t.match(/^extract\((\d+)\)$/);
            if (extractMatch) {
              const n = parseInt(extractMatch[1]);
              return rawVal.split(/\s+/).slice(0, n).join(" ");
            }
            const truncMatch = t.match(/^truncate\((\d+)\)$/);
            if (truncMatch) {
              const n = parseInt(truncMatch[1]);
              return rawVal.length > n ? rawVal.slice(0, n) + "…" : rawVal;
            }
            return rawVal;
          });

          // Standard variable replacement for any remaining placeholders
          for (const [key, value] of Object.entries(row)) {
            const regex = new RegExp(`\\{${key}\\}`, "gi");
            pageContent = pageContent.replace(regex, value || "");
          }

          // Process spintax {option1|option2|option3} AFTER variable replacement
          pageContent = processSpintax(pageContent);

          // Process dynamic elements {{MAP:}}, {{YOUTUBE:}}, {{IMAGE:}}, {{WEATHER:}}
          pageContent = processDynamicElements(pageContent, allVars);

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

          // Process {{AI_IMAGE:prompt}} blocks — generate unique images per page
          if (hasAiImageBlocks && LOVABLE_API_KEY) {
            const currentAiImageBlocks = extractAiImageBlocks(pageContent);
            for (let imgIdx = 0; imgIdx < currentAiImageBlocks.length; imgIdx++) {
              const block = currentAiImageBlocks[imgIdx];
              try {
                const imageUrl = await generateAiImage(
                  block.prompt, LOVABLE_API_KEY, supabase,
                  campaign_id, processedCount, imgIdx
                );
                const altText = block.prompt.replace(/"/g, '&quot;').slice(0, 200);
                pageContent = pageContent.replace(
                  block.fullMatch,
                  `<div class="ai-generated-image" style="margin:1em 0;">
  <img src="${imageUrl}" alt="${altText}" style="width:100%;height:auto;border-radius:8px;" loading="lazy">
</div>`
                );
                aiGenerationsUsed++;
              } catch (imgErr: any) {
                pageContent = pageContent.replace(
                  block.fullMatch,
                  `<em style="color:#dc2626;">[AI Image failed: ${imgErr.message}]</em>`
                );
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

          // Build slug with optional directory structure (hierarchical nesting)
          let slug = slugify(pageTitle) || `page-${processedCount + 1}`;
          const dirStructure = (campaign as any).directory_structure as { levels?: string[]; separator?: string } | null;
          if (dirStructure?.levels && dirStructure.levels.length > 0) {
            const dirParts: string[] = [];
            for (const level of dirStructure.levels) {
              const levelValue = allVars[level] || row[level];
              if (levelValue) {
                dirParts.push(slugify(levelValue));
              }
            }
            if (dirParts.length > 0) {
              const sep = dirStructure.separator || "/";
              slug = dirParts.join(sep) + sep + slug;
            }
          }

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

          // Build canonical URL using pre-fetched website URL
          let canonicalUrl: string | null = null;
          if (websiteBaseUrl) {
            canonicalUrl = `${websiteBaseUrl}/${slug}`;
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
            status: "pending" as any,
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

      // Insert or selectively update batch
      if (batchPages.length > 0) {
        if (isOverwriteMode) {
          // Selective overwrite: find existing pages by slug and update only selected fields
          for (const page of batchPages) {
            if (page.status === "failed") {
              // Still insert failed pages
              await supabase.from("generated_pages").insert(page);
              continue;
            }
            const baseSlug = page.slug.split("?")[0]; // strip UTM for matching
            const { data: existing } = await supabase
              .from("generated_pages")
              .select("id")
              .eq("campaign_id", campaign_id)
              .ilike("slug", `${baseSlug}%`)
              .maybeSingle();

            if (existing) {
              // Build partial update based on overwrite_fields
              const updates: Record<string, any> = {};
              if (overwrite_fields.title) {
                updates.title = page.title;
                updates.slug = page.slug;
              }
              if (overwrite_fields.content) {
                updates.content = page.content;
              }
              if (overwrite_fields.seo) {
                updates.seo_title = page.seo_title;
                updates.seo_description = page.seo_description;
                updates.seo_keywords = page.seo_keywords;
                updates.canonical_url = page.canonical_url;
              }
              // images: re-process content to update image-related embeds (already in content)
              if (overwrite_fields.images && !overwrite_fields.content) {
                // Extract and update only image/media portions in existing content
                const { data: existingPage } = await supabase
                  .from("generated_pages")
                  .select("content")
                  .eq("id", existing.id)
                  .single();
                if (existingPage) {
                  let updatedContent = existingPage.content;
                  // Replace dynamic-image divs
                  const newImages = page.content.match(/<div class="dynamic-image"[\s\S]*?<\/div>/gi) || [];
                  const oldImages = updatedContent.match(/<div class="dynamic-image"[\s\S]*?<\/div>/gi) || [];
                  newImages.forEach((newImg: string, i: number) => {
                    if (oldImages[i]) {
                      updatedContent = updatedContent.replace(oldImages[i], newImg);
                    }
                  });
                  // Replace dynamic-map divs
                  const newMaps = page.content.match(/<div class="dynamic-map"[\s\S]*?<\/div>\s*<\/div>/gi) || [];
                  const oldMaps = updatedContent.match(/<div class="dynamic-map"[\s\S]*?<\/div>\s*<\/div>/gi) || [];
                  newMaps.forEach((newMap: string, i: number) => {
                    if (oldMaps[i]) {
                      updatedContent = updatedContent.replace(oldMaps[i], newMap);
                    }
                  });
                  // Replace dynamic-youtube divs
                  const newYT = page.content.match(/<div class="dynamic-youtube"[\s\S]*?<\/div>\s*<\/div>/gi) || [];
                  const oldYT = updatedContent.match(/<div class="dynamic-youtube"[\s\S]*?<\/div>\s*<\/div>/gi) || [];
                  newYT.forEach((newV: string, i: number) => {
                    if (oldYT[i]) {
                      updatedContent = updatedContent.replace(oldYT[i], newV);
                    }
                  });
                  updates.content = updatedContent;
                }
              }
              updates.status = "pending";
              if (Object.keys(updates).length > 0) {
                await supabase.from("generated_pages").update(updates).eq("id", existing.id);
              }
            } else {
              // No existing page found, insert as new
              await supabase.from("generated_pages").insert(page);
            }
          }
        } else {
          const { error: insertError } = await supabase.from("generated_pages").insert(batchPages);
          if (insertError) {
            await logEvent(supabase, campaign_id, user.id, "batch_error",
              `Batch ${batchesCompleted} insert failed: ${insertError.message}`, batchesCompleted);
            failedCount += batchPages.length;
          }
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

    // Test mode: return the preview without saving to DB or changing campaign status
    if (test_mode) {
      return new Response(JSON.stringify({
        success: true,
        test_mode: true,
        generated: 1,
        preview: {
          title: "Test page preview generated",
          pages: [], // pages were already inserted above; we can return info
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Auto-publish pages to CMS when publish_mode is "published"
    if (campaign.publish_mode === "published" && campaign.website_id && successCount > 0) {
      try {
        // Fetch all pending page IDs from this campaign
        const { data: pendingPages } = await supabase
          .from("generated_pages")
          .select("id")
          .eq("campaign_id", campaign_id)
          .eq("status", "pending");

        if (pendingPages && pendingPages.length > 0) {
          const pageIds = pendingPages.map((p: any) => p.id);
          console.log(`[GENERATE-PAGES] Auto-publishing ${pageIds.length} pages to CMS`);
          await logEvent(supabase, campaign_id, user.id, "auto_publish_started",
            `Auto-publishing ${pageIds.length} pages to connected website`);

          // Process in chunks of 10 to avoid timeouts
          const PUBLISH_CHUNK = 10;
          let publishedCount = 0;
          let publishFailedCount = 0;

          for (let i = 0; i < pageIds.length; i += PUBLISH_CHUNK) {
            const chunk = pageIds.slice(i, i + PUBLISH_CHUNK);
            try {
              const publishUrl = `${supabaseUrl}/functions/v1/publish-pages`;
              const publishRes = await fetch(publishUrl, {
                method: "POST",
                headers: {
                  Authorization: authHeader,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  page_ids: chunk,
                  publish_type: "page",
                  website_id: campaign.website_id,
                }),
              });

              if (publishRes.ok) {
                const publishResult = await publishRes.json();
                publishedCount += publishResult.published || 0;
                publishFailedCount += publishResult.failed || 0;
              } else {
                const errText = await publishRes.text();
                console.error(`[GENERATE-PAGES] Publish chunk failed:`, errText);
                publishFailedCount += chunk.length;
              }
            } catch (pubErr) {
              console.error(`[GENERATE-PAGES] Publish chunk error:`, pubErr);
              publishFailedCount += chunk.length;
            }
          }

          await logEvent(supabase, campaign_id, user.id, "auto_publish_completed",
            `Auto-publish done: ${publishedCount} published, ${publishFailedCount} failed`);
        }
      } catch (pubErr) {
        console.error("[GENERATE-PAGES] Auto-publish error:", pubErr);
        await logEvent(supabase, campaign_id, user.id, "auto_publish_error",
          `Auto-publish failed: ${pubErr instanceof Error ? pubErr.message : "Unknown error"}`);
      }
    }

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
    console.error("[GENERATE-PAGES] Fatal error:", err.message, err.stack);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
