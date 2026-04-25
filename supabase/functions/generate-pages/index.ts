import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { autoRepairContent, derivePrimaryKeyword } from "../_shared/seo-quality.ts";
import { buildMultiEngineMeta, buildAutoFaq, buildExtraJsonLd } from "../_shared/seo-meta.ts";
import { validateJsonLdInHtml, summarizeValidation } from "../_shared/jsonld-validator.ts";
import { resolveLanguageName } from "../_shared/languages.ts";
import { buildVibeOverrideStyles, type VibeTheme } from "../_shared/vibe-theme.ts";

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
function processBlockSpinning(text: string): string {
  return text.replace(/\[spin\]([\s\S]*?)\[\/spin\]/gi, (_m, inner: string) => {
    const blocks = inner.split("||").map(b => b.trim());
    if (blocks.length <= 1) return blocks[0] || "";
    return blocks[Math.floor(Math.random() * blocks.length)];
  });
}

function processSpintax(text: string): string {
  // First process block-level spinning [spin]...[/spin]
  let result = processBlockSpinning(text);

  const MAX_DEPTH = 10;
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

  // {{IMAGE:search query}} — Picsum stock image (free, reliable)
  result = result.replace(/\{\{IMAGE:(.*?)\}\}/gi, (_match, query: string) => {
    const resolvedQuery = resolveVarsInQuery(query, vars);
    const seed = Math.abs([...resolvedQuery].reduce((a, c) => a + c.charCodeAt(0), 0)) % 1000;
    return `<div class="dynamic-image" style="margin:1em 0;">
  <img src="https://picsum.photos/seed/${seed}/800/450" alt="${resolvedQuery}" style="width:100%;height:auto;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.08);" loading="lazy">
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
      const items = value.split(",").map((s) => s.trim()).filter(Boolean);
      return items.map((item, index) =>
        loopBlock
          .replace(/\{\{this\}\}/gi, item)
          .replace(/\{\{@index\}\}/gi, String(index))
          .replace(/\{\{@number\}\}/gi, String(index + 1))
      ).join("\n");
    }
  );
}

function splitCsvRecords(rawContent: string): string[] {
  const normalized = rawContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const records: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (char === '"') {
      current += char;
      if (inQuotes && nextChar === '"') {
        current += nextChar;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "\n" && !inQuotes) {
      if (current.trim()) records.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) records.push(current);
  return records;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values.map((value) => value.replace(/^['"]|['"]$/g, ""));
}

function parseCsvRawContent(rawContent: string): Record<string, string>[] {
  const records = splitCsvRecords(rawContent).filter((record) => record.trim());
  if (records.length <= 1) return [];

  const firstLine = records[0];
  let delimiter = ",";
  if (firstLine.includes("\t")) delimiter = "\t";
  else if (firstLine.split(";").length > firstLine.split(",").length) delimiter = ";";
  else if (firstLine.split("|").length > firstLine.split(",").length) delimiter = "|";

  const headers = parseCsvLine(firstLine, delimiter);
  return records
    .slice(1)
    .map((record) => parseCsvLine(record, delimiter))
    .filter((values) => values.some((value) => value.length > 0))
    .map((values) =>
      headers.reduce((acc: Record<string, string>, header, index) => {
        acc[header] = values[index] || "";
        return acc;
      }, {})
    );
}

function triggerBackgroundFunction(
  url: string,
  headers: HeadersInit,
  body: Record<string, unknown>,
  label: string
) {
  fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }).catch((error) => {
    console.error(`[GENERATE-PAGES] Background ${label} failed to start:`, error);
  });
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
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
      signal: controller.signal,
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
  } finally {
    clearTimeout(timeout);
  }
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
  const resolvedLangName = resolveLanguageName(settings.language);

  const systemPrompt = `You are an expert content writer. Generate high-quality, engaging content.
Tone: ${settings.tone}
Length: ${lengthGuide[settings.contentLength] || lengthGuide.medium}

CRITICAL LANGUAGE RULE: ALL generated text MUST be written in ${resolvedLangName}. This is the website's primary language and is non-negotiable. If the input prompt, template, or CSV data is in another language (e.g. English), TRANSLATE it into ${resolvedLangName}. Never output English unless ${resolvedLangName} IS English.

IMPORTANT: Return ONLY the generated content text. No markdown formatting, no headers, no extra commentary.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
      signal: controller.signal,
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
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Generate AI default values for unmapped template variables, in one batched
 * call, using the campaign's niche / business / services context. Returns the
 * same value for every row (template-level defaults) so it costs only 1 AI
 * generation regardless of how many pages the campaign produces.
 */
async function generateAiVarDefaults(
  variables: string[],
  context: { business?: string; niche?: string; service?: string },
  settings: { tone: string; contentLength: string; language: string },
  apiKey: string,
): Promise<Record<string, string>> {
  if (variables.length === 0) return {};
  const langName = resolveLanguageName(settings.language);
  const ctxLine = [
    context.business && `Business: ${context.business}`,
    context.niche && `Niche: ${context.niche}`,
    context.service && `Services / products: ${context.service}`,
  ].filter(Boolean).join("\n") || "(no extra context provided — infer reasonable values)";

  const systemPrompt = `You generate default values for template variables of a programmatic SEO page.

CRITICAL LANGUAGE RULE: ALL values MUST be written in ${langName}. This is non-negotiable.
- Translate any English business / niche / services context above into ${langName} before generating.
- Brand names stay in their original form, but every other word (services, descriptions, CTAs, locations qualifiers) MUST be in ${langName}.
- Never mix languages within a single value.
- If ${langName} is not English and you would naturally write the value in English, STOP and rewrite it in ${langName}.

TONE: ${settings.tone}.
Each value must be short, natural, and directly usable as a substitution in HTML. No markdown, no quotes, no labels, no language tags.`;
  const userPrompt = `${ctxLine}

For each variable name below, return a concise, realistic default value that fits the niche/services above, written in ${langName}.
Variables: ${variables.join(", ")}

Return ONLY a JSON object, no prose, no code fences. Example:
{"variable_name": "value in ${langName}", "another": "value in ${langName}"}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error("[AI-DEFAULTS] gateway error", response.status, await response.text());
      return {};
    }
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(cleaned); } catch { parsed = {}; }
    const out: Record<string, string> = {};
    for (const v of variables) {
      const val = parsed[v] ?? parsed[v.toLowerCase()];
      if (typeof val === "string" && val.trim()) out[v] = val.trim();
      else if (typeof val === "number" || typeof val === "boolean") out[v] = String(val);
    }
    return out;
  } catch (err) {
    console.error("[AI-DEFAULTS] failed", err);
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

async function generateSeoMetadata(
  pageTitle: string,
  pageContent: string,
  settings: { tone: string; language: string },
  apiKey: string,
  websiteContext?: { name?: string; url?: string }
): Promise<{ seo_title: string; seo_description: string; seo_keywords: string[] }> {
  const snippet = pageContent.replace(/<[^>]*>/g, "").slice(0, 2000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  const websiteInfo = websiteContext?.name || websiteContext?.url
    ? `\nWebsite: ${websiteContext.name || ""}${websiteContext.url ? ` (${websiteContext.url})` : ""}`
    : "";

  const resolvedLangName = resolveLanguageName(settings.language);

  try {
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
            content: `You are a Rank Math / Yoast SEO expert. Generate metadata that scores 90+ on these plugins.\nTone: ${settings.tone}${websiteInfo}

CRITICAL LANGUAGE RULE: ALL output (seo_title, seo_description, seo_keywords) MUST be written in ${resolvedLangName}. This is the website's primary language and is non-negotiable. If the source title/content is in another language (e.g. English), TRANSLATE the metadata into ${resolvedLangName}. Never output English unless ${resolvedLangName} IS English.

STRICT RULES FOR HIGH SCORES:
1. seo_title: 30-60 chars. Put the EXACT primary focus keyword within the first 18 characters. Include a brand/action word. Format: "Focus Keyword - Action | Brand"
2. seo_description: 120-156 chars. Must contain the EXACT focus keyword phrase + a CTA (call, buy, get, order) + a benefit word (best, trusted, fast, easy) + a local cue (local, nearby, serving).
3. seo_keywords: First item MUST be the exact primary focus keyword (2-4 word phrase). Include 4-7 additional LSI/related keywords.
4. The primary focus keyword should be the most specific, meaningful 2-4 word phrase from the page title/content. NOT generic words like "best product" but specific like "manual poppy seed mill".
5. All CTAs, benefit words, and local cues MUST be expressed in ${resolvedLangName} (translate them if needed — e.g. "buy" → "acheter" in French).`,
          },
          {
            role: "user",
            content: `Generate Rank Math/Yoast-optimized SEO metadata for:\n\nTitle: ${pageTitle}\n\nContent:\n${snippet}\n\nReminder: Output language MUST be ${resolvedLangName}.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_seo_metadata",
              description: "Set SEO metadata optimized for Rank Math/Yoast 90+ scores",
              parameters: {
                type: "object",
                properties: {
                  seo_title: { type: "string", description: "SEO title 30-60 chars, keyword in first 18 chars" },
                  seo_description: { type: "string", description: "Meta description 120-156 chars with keyword + CTA + benefit + local cue" },
                  seo_keywords: { type: "array", items: { type: "string" }, description: "5-8 keywords, exact focus keyword first" },
                },
                required: ["seo_title", "seo_description", "seo_keywords"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_seo_metadata" } },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        seo_title: pageTitle.slice(0, 60),
        seo_description: snippet.slice(0, 156),
        seo_keywords: [],
      };
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        const title = (parsed.seo_title || pageTitle).trim();
        const desc = (parsed.seo_description || snippet).trim();
        return {
          seo_title: title.length > 60 ? title.slice(0, 57) + "..." : title,
          seo_description: desc.length > 156 ? desc.slice(0, 153) + "..." : desc.length < 120 ? desc.padEnd(120, ".") : desc,
          seo_keywords: parsed.seo_keywords || [],
        };
      } catch { /* fallthrough */ }
    }

    return { seo_title: pageTitle.slice(0, 60), seo_description: snippet.slice(0, 156), seo_keywords: [] };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Professional responsive CSS wrapper — injected into every generated page.
 * Uses CSS custom properties with inherit/currentColor so the page automatically
 * adopts the connected website's fonts, colors, and branding.
 */
function buildResponsiveStylesheet(): string {
  return `<style>
/* === PageGen Pro — Adaptive Responsive Page Styles === */
/* Custom properties: inherit from host theme, with neutral fallbacks */
.pgp-page{
  --pgp-font: inherit;
  --pgp-text: inherit;
  --pgp-text-muted: inherit;
  --pgp-heading: inherit;
  --pgp-link: currentColor;
  --pgp-border: rgba(128,128,128,.2);
  --pgp-surface: rgba(128,128,128,.04);
  --pgp-surface-hover: rgba(128,128,128,.08);
  --pgp-radius: 12px;
}
.pgp-page{font-family:var(--pgp-font),-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.75;color:var(--pgp-text);max-width:1100px;margin:0 auto;padding:2rem 1.5rem;word-wrap:break-word;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
.pgp-page *{box-sizing:border-box}
.pgp-page h1{font-size:clamp(2rem,5vw,3rem);font-weight:800;line-height:1.15;margin:0 0 1em;color:var(--pgp-heading);letter-spacing:-.02em}
.pgp-page h2{font-size:clamp(1.5rem,3.5vw,2.25rem);font-weight:700;line-height:1.25;margin:2em 0 .75em;color:var(--pgp-heading);letter-spacing:-.015em;padding-bottom:.4em;border-bottom:2px solid var(--pgp-border)}
.pgp-page h3{font-size:clamp(1.15rem,2.5vw,1.6rem);font-weight:600;margin:1.5em 0 .6em;color:var(--pgp-heading)}
.pgp-page h4{font-size:clamp(1rem,2vw,1.3rem);font-weight:600;margin:1.25em 0 .5em;color:var(--pgp-heading)}
.pgp-page p{margin:0 0 1.25em;font-size:1.0625rem;color:var(--pgp-text);line-height:1.8}
.pgp-page img{max-width:100%;height:auto;border-radius:var(--pgp-radius);margin:1.5em 0;display:block}
.pgp-page a{color:var(--pgp-link);text-decoration:underline;text-underline-offset:2px;font-weight:500;transition:opacity .2s ease}
.pgp-page a:hover{opacity:.75}
.pgp-page ul,.pgp-page ol{margin:0 0 1.5em;padding-left:1.5em}
.pgp-page li{margin-bottom:.6em;color:var(--pgp-text);line-height:1.7}
.pgp-page section{margin:3em 0}
.pgp-page blockquote{border-left:3px solid var(--pgp-border);margin:2em 0;padding:1em 1.5em;background:var(--pgp-surface);border-radius:0 var(--pgp-radius) var(--pgp-radius) 0;font-style:italic}
.pgp-page strong{font-weight:700}
.pgp-page hr{border:none;height:1px;background:var(--pgp-border);margin:3em 0}

/* Buttons & CTAs — adapt to theme via currentColor */
.pgp-page .btn,.pgp-page .cta,.pgp-page button[type="submit"],.pgp-page a.cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 32px;background:var(--pgp-heading,currentColor);color:#fff;border:none;border-radius:var(--pgp-radius);font-size:1.05rem;font-weight:600;cursor:pointer;text-decoration:none!important;transition:all .2s ease;letter-spacing:.01em}
.pgp-page .btn:hover,.pgp-page .cta:hover,.pgp-page button[type="submit"]:hover,.pgp-page a.cta:hover{opacity:.85;transform:translateY(-2px)}

/* Forms — neutral, inherits theme */
.pgp-page form{background:var(--pgp-surface);border:1px solid var(--pgp-border);border-radius:var(--pgp-radius);padding:2em;margin:2em 0}
.pgp-page label{display:block;font-weight:600;font-size:.9rem;margin-bottom:.4em;text-transform:uppercase;letter-spacing:.04em}
.pgp-page input[type="text"],.pgp-page input[type="email"],.pgp-page input[type="tel"],.pgp-page input[type="url"],.pgp-page textarea,.pgp-page select{width:100%;padding:12px 16px;border:1px solid var(--pgp-border);border-radius:8px;font-size:1rem;margin-bottom:1em;transition:border-color .2s ease;background:transparent;font-family:inherit;color:inherit}
.pgp-page input:focus,.pgp-page textarea:focus,.pgp-page select:focus{outline:none;border-color:currentColor}

/* Tables */
.pgp-page table{width:100%;border-collapse:collapse;margin:2em 0}
.pgp-page th{padding:12px 16px;text-align:left;font-weight:700;font-size:.875rem;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid var(--pgp-border)}
.pgp-page td{padding:12px 16px;border-bottom:1px solid var(--pgp-border)}
.pgp-page tr:hover td{background:var(--pgp-surface)}

/* Hero Section — uses slightly tinted background, inherits text */
.pgp-page .hero-section,.pgp-page .hero{background:var(--pgp-surface);padding:clamp(3em,8vw,5em) clamp(2em,5vw,4em);border-radius:var(--pgp-radius);margin-bottom:2.5em;text-align:center}
.pgp-page .hero h1,.pgp-page .hero-section h1{color:var(--pgp-heading)}
.pgp-page .hero p,.pgp-page .hero-section p{font-size:1.15rem;max-width:700px;margin-left:auto;margin-right:auto}

/* Cards — clean, neutral borders */
.pgp-page .card,.pgp-page .feature-card,.pgp-page .service-card{background:transparent;border:1px solid var(--pgp-border);border-radius:var(--pgp-radius);padding:1.75em;margin-bottom:1.5em;transition:box-shadow .2s ease}
.pgp-page .card:hover,.pgp-page .feature-card:hover,.pgp-page .service-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.06)}

/* Grid layouts */
.pgp-page .grid,.pgp-page .cards-grid,.pgp-page .features-grid,.pgp-page .services-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5em;margin:2em 0}

/* Testimonials */
.pgp-page .testimonial{background:var(--pgp-surface);border-radius:var(--pgp-radius);padding:1.75em;margin:1.5em 0;border-left:3px solid var(--pgp-border)}
.pgp-page .testimonial .stars{color:#f59e0b;font-size:1.3em;margin-bottom:.75em;letter-spacing:2px}

/* Badges & Tags */
.pgp-page .badge,.pgp-page .tag{display:inline-block;padding:5px 14px;background:var(--pgp-surface);border:1px solid var(--pgp-border);border-radius:24px;font-size:.85em;font-weight:600;margin:0 6px 6px 0}

/* Geo/Contact Info */
.pgp-page .geo-info,.pgp-page .contact-info{background:var(--pgp-surface);border:1px solid var(--pgp-border);border-radius:var(--pgp-radius);padding:1.75em;margin:2em 0}
.pgp-page .geo-address,.pgp-page .geo-phone,.pgp-page .geo-hours{margin-bottom:1em;padding-bottom:.75em;border-bottom:1px solid var(--pgp-border)}
.pgp-page .geo-address:last-child,.pgp-page .geo-phone:last-child,.pgp-page .geo-hours:last-child{margin-bottom:0;padding-bottom:0;border-bottom:none}

/* Dynamic embeds */
.pgp-page .dynamic-map,.pgp-page .dynamic-osm,.pgp-page .dynamic-youtube{border-radius:var(--pgp-radius);overflow:hidden;margin:2em 0}

/* Pricing */
.pgp-page .pricing{text-align:center;background:var(--pgp-surface);border:1px solid var(--pgp-border);border-radius:var(--pgp-radius);padding:2em;margin:1.5em 0;transition:border-color .2s ease}
.pgp-page .pricing:hover{border-color:currentColor}
.pgp-page .pricing .price{font-size:2.75rem;font-weight:800;letter-spacing:-.02em}
.pgp-page .pricing .price span{font-size:1rem;font-weight:400;opacity:.6}

/* FAQ Sections */
.pgp-page .faq-item,.pgp-page details{border:1px solid var(--pgp-border);border-radius:8px;padding:1em 1.25em;margin-bottom:.75em;transition:border-color .2s ease}
.pgp-page .faq-item:hover,.pgp-page details:hover{border-color:currentColor}
.pgp-page summary{cursor:pointer;font-weight:600;list-style:none;display:flex;align-items:center;justify-content:space-between}
.pgp-page summary::after{content:'+';font-size:1.4rem;font-weight:300;transition:transform .2s}
.pgp-page details[open] summary::after{content:'−'}

/* Footer */
.pgp-page footer,.pgp-page .page-footer{margin-top:4em;padding-top:2em;border-top:1px solid var(--pgp-border);font-size:.875rem;text-align:center;opacity:.6}

/* Responsive */
@media(max-width:768px){
  .pgp-page{padding:1.25rem 1rem}
  .pgp-page .grid,.pgp-page .cards-grid,.pgp-page .features-grid,.pgp-page .services-grid{grid-template-columns:1fr;gap:1em}
  .pgp-page form{padding:1.25em}
  .pgp-page .hero,.pgp-page .hero-section{padding:2em 1.25em}
  .pgp-page .card,.pgp-page .feature-card,.pgp-page .service-card{padding:1.25em}
}
@media(max-width:480px){
  .pgp-page{padding:1rem .75rem}
  .pgp-page h1{font-size:1.65rem}
  .pgp-page h2{font-size:1.35rem}
  .pgp-page p{font-size:1rem}
  .pgp-page .btn,.pgp-page .cta,.pgp-page a.cta{width:100%;text-align:center;padding:12px 20px;font-size:1rem}
}
@media print{
  .pgp-page{max-width:100%;padding:0}
  .pgp-page img{box-shadow:none}
  .pgp-page .btn,.pgp-page .cta{display:none}
}
</style>`;
}

function buildOgMetaTags(
  title: string,
  description: string,
  url?: string,
  imageUrl?: string,
  twitterCardType?: string
): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const tags = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escape(title)}">`,
    `<meta property="og:description" content="${escape(description)}">`,
    `<meta name="twitter:card" content="${escape(twitterCardType || "summary_large_image")}">`,
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

const BATCH_SIZE = 5;

Deno.serve(async (req) => {
  console.log("[GENERATE-PAGES] Request received:", req.method);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let activeCampaignId: string | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any = null;

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
    supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    console.log("[GENERATE-PAGES] Body parsed:", JSON.stringify({ campaign_id: body.campaign_id, action: body.action, test_mode: body.test_mode, overwrite_fields: body.overwrite_fields, publish_mode: body.publish_mode, retry_failed_only: body.retry_failed_only, language_override: body.language_override }));
    const { campaign_id, action, test_mode, overwrite_fields, publish_mode, retry_failed_only, language_override } = body;
    activeCampaignId = campaign_id ?? null;
    // overwrite_fields: { title?: bool, content?: bool, seo?: bool, images?: bool } — for selective re-generation
    const isOverwriteMode = overwrite_fields && typeof overwrite_fields === "object" && Object.values(overwrite_fields).some(Boolean);
    // publish_mode: "draft" | "publish" — determines initial page status
    const effectivePublishMode = publish_mode === "publish" ? "published" : "pending";

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
      .select("raw_content, headers, row_count")
      .eq("campaign_id", campaign_id)
      .maybeSingle();

    if (csvFile?.raw_content) {
      const parsedRows = parseCsvRawContent(csvFile.raw_content as string);
      const expectedRowCount = typeof csvFile.row_count === "number" ? csvFile.row_count : null;

      if (!expectedRowCount || parsedRows.length === expectedRowCount) {
        csvRows = parsedRows;
      } else {
        console.warn(
          `[GENERATE-PAGES] CSV parse mismatch for campaign ${campaign_id}: parsed ${parsedRows.length}, expected ${expectedRowCount}. Falling back to inline csv_data.`
        );
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

    // Retry failed only: filter to rows whose slugs match failed pages
    if (retry_failed_only && !test_mode) {
      const { data: failedPages } = await supabase
        .from("generated_pages")
        .select("slug, title")
        .eq("campaign_id", campaign_id)
        .eq("status", "failed");

      if (failedPages && failedPages.length > 0) {
        const failedSlugs = new Set(failedPages.map((p: any) => slugify(p.title)));
        limitedRows = limitedRows.filter((row: Record<string, string>) => {
          const values = Object.values(row).filter(Boolean);
          const rowTitle = values.slice(0, 2).join(" - ");
          return failedSlugs.has(slugify(rowTitle));
        });
        // Delete existing failed pages so they can be regenerated
        await supabase
          .from("generated_pages")
          .delete()
          .eq("campaign_id", campaign_id)
          .eq("status", "failed");
        console.log(`[GENERATE-PAGES] Retry failed only: ${limitedRows.length} rows to retry`);
      }
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

    // Resolve language priority (highest → lowest):
    //   1) per-run override sent in the request body — UNLESS the connected
    //      website has language_locked = true, in which case the override is
    //      ignored.
    //   2) connected website's saved language (sticky for that site)
    //   3) campaign.language (chosen in the wizard for this campaign)
    //   4) user's profile default
    let resolvedLanguage = profile?.ai_language || "en";
    const campaignLang = (campaign as { language?: string | null } | null)?.language;
    if (typeof campaignLang === "string" && campaignLang.trim().length > 0) {
      resolvedLanguage = campaignLang.trim();
    }
    let siteLanguageLocked = false;
    try {
      const websiteIdForLang = (campaign as { website_id?: string | null } | null)?.website_id;
      if (websiteIdForLang) {
        const { data: siteRow } = await supabase
          .from("websites")
          .select("language, language_locked")
          .eq("id", websiteIdForLang)
          .maybeSingle();
        const siteLang = (siteRow as { language?: string | null } | null)?.language;
        siteLanguageLocked = !!(siteRow as { language_locked?: boolean } | null)?.language_locked;
        if (typeof siteLang === "string" && siteLang.trim().length > 0) {
          resolvedLanguage = siteLang.trim();
        }
      }
    } catch (_) { /* non-critical */ }
    if (typeof language_override === "string" && language_override.trim().length > 0) {
      if (siteLanguageLocked) {
        console.log(`[GENERATE-PAGES] Ignoring per-run language override "${language_override}" — website language is locked to "${resolvedLanguage}"`);
      } else {
        resolvedLanguage = language_override.trim();
        console.log(`[GENERATE-PAGES] Per-run language override applied: ${resolvedLanguage}`);
      }
    }
    console.log(`[GENERATE-PAGES] Resolved AI language: ${resolvedLanguage} → ${resolveLanguageName(resolvedLanguage)}`);

    const aiSettings = {
      tone: profile?.ai_tone || "professional",
      contentLength: profile?.ai_content_length || "medium",
      language: resolvedLanguage,
    };

    const templateContent = campaign.templates.content as string;
    const aiBlocks = extractAiBlocks(templateContent);
    const aiImageBlocks = extractAiImageBlocks(templateContent);
    const hasAiBlocks = aiBlocks.length > 0;
    const hasAiImageBlocks = aiImageBlocks.length > 0;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const effectiveBatchSize = hasAiBlocks || hasAiImageBlocks ? 1 : BATCH_SIZE;

    // ─────────────────────────────────────────────────────────────────────
    // AI auto-fill for unmapped variables
    // If a template variable has no CSV column, no custom value mapping,
    // and doesn't appear as a key in the CSV rows, fill it once with AI
    // using the campaign's niche / business / services context. The same
    // value is reused across every row → costs only 1 AI generation.
    // ─────────────────────────────────────────────────────────────────────
    let aiVarDefaults: Record<string, string> = {};
    let aiAutofillUsed = 0;
    try {
      const declaredVars = (((campaign.templates as { variables?: string[] }).variables) || []) as string[];
      const tokenMatches = templateContent.match(/\{([a-zA-Z0-9_.-]+)\}/g) || [];
      const tokenVars = tokenMatches.map((t: string) => t.slice(1, -1));
      const allVarsSet = new Set<string>([...declaredVars, ...tokenVars]);
      const reservedPrefixes = ["AI:", "AI_IMAGE:", "MAP:", "YOUTUBE:", "IMAGE:", "WEATHER:", "GEO_BLOCKS"];
      const candidateVars = Array.from(allVarsSet).filter((v) => {
        if (!v) return false;
        if (v.includes(":")) return false;
        if (reservedPrefixes.some((p) => v.toUpperCase().startsWith(p))) return false;
        return true;
      });

      const mappedTargets = new Set<string>(
        (customMappings || [])
          .map((m: { target_field?: string }) => (m.target_field || "").toLowerCase())
          .filter(Boolean),
      );
      const csvHeaderSet = new Set<string>();
      if (csvRows.length > 0) {
        for (const k of Object.keys(csvRows[0])) csvHeaderSet.add(k.toLowerCase());
      }
      const geoSettingsKeys = new Set<string>(
        Object.keys((campaign.geo_settings || {}) as Record<string, unknown>).map((k) => k.toLowerCase()),
      );

      // Per-variable fill rules: csv_first (default) | csv_only | ai_only | ai_first
      type FillRule = "csv_first" | "csv_only" | "ai_only" | "ai_first";
      const fillRules = (((campaign.mapping || {}) as { fill_rules?: Record<string, FillRule> }).fill_rules) || {};
      const ruleFor = (v: string): FillRule => (fillRules[v] || fillRules[v.toLowerCase()] || "csv_first");

      const unmapped = candidateVars.filter((v) => {
        const rule = ruleFor(v);
        if (rule === "csv_only") return false;
        if (rule === "ai_only" || rule === "ai_first") return true;
        // csv_first → only AI fill if no CSV/mapping/geo value exists
        const k = v.toLowerCase();
        return !mappedTargets.has(k) && !csvHeaderSet.has(k) && !geoSettingsKeys.has(k);
      });

      const aiContext = (((campaign.mapping || {}) as { ai_context?: { business?: string; niche?: string; service?: string } }).ai_context) || {};
      const hasContext = !!(aiContext.business || aiContext.niche || aiContext.service);
      const aiFillMode = (((campaign.mapping || {}) as { ai_fill_mode?: "per_campaign" | "per_row" }).ai_fill_mode) || "per_campaign";

      if (unmapped.length > 0 && LOVABLE_API_KEY && hasContext && aiFillMode === "per_campaign") {
        console.log(`[GENERATE-PAGES] AI fill (per_campaign): ${unmapped.length} variable(s) →`, unmapped.join(", "));
        aiVarDefaults = await generateAiVarDefaults(unmapped, aiContext, aiSettings, LOVABLE_API_KEY);
        const filledCount = Object.keys(aiVarDefaults).length;
        console.log(`[GENERATE-PAGES] AI fill produced ${filledCount}/${unmapped.length} default(s) — reused across all rows`);
        if (filledCount > 0) {
          aiAutofillUsed = 1;
          await logEvent(
            supabase,
            campaign_id,
            user.id,
            "ai_defaults_filled",
            `AI filled ${filledCount} variable(s) once per campaign (reused on all rows): ${Object.keys(aiVarDefaults).join(", ")}`,
          );
        }
      } else if (unmapped.length > 0 && LOVABLE_API_KEY && hasContext && aiFillMode === "per_row") {
        console.log(`[GENERATE-PAGES] AI fill (per_row) deferred: ${unmapped.length} variable(s) will be generated per CSV row →`, unmapped.join(", "));
        await logEvent(
          supabase,
          campaign_id,
          user.id,
          "ai_defaults_deferred",
          `AI fill set to per-row mode — ${unmapped.length} variable(s) will be generated per row using row context: ${unmapped.join(", ")}`,
        );
      } else if (unmapped.length > 0 && !hasContext) {
        console.log(`[GENERATE-PAGES] ${unmapped.length} variable(s) need AI fill but no niche/services context — skipping`);
      }

      // Expose to row loop via closure variables
      (globalThis as unknown as {
        __fillRules?: Record<string, FillRule>;
        __aiFillMode?: string;
        __aiFillTargets?: string[];
        __aiFillContext?: typeof aiContext;
      }).__fillRules = fillRules;
      (globalThis as unknown as { __aiFillMode?: string }).__aiFillMode = aiFillMode;
      (globalThis as unknown as { __aiFillTargets?: string[] }).__aiFillTargets = unmapped;
      (globalThis as unknown as { __aiFillContext?: typeof aiContext }).__aiFillContext = aiContext;
    } catch (err) {
      console.error("[GENERATE-PAGES] AI fill setup failed:", err);
    }


    // Count custom value mappings (no AI needed for these)
    const customValueMappings = (customMappings || []).filter((m: any) => m.source_column?.startsWith("__custom__:"));
    const aiGenerationsNeeded = hasAiBlocks ? remainingRows.length * aiBlocks.length : 0;
    const aiImageGenerationsNeeded = hasAiImageBlocks ? remainingRows.length * aiImageBlocks.length : 0;
    const shouldUseAiSeo = Boolean(LOVABLE_API_KEY) && !!test_mode;
    const seoGenerationsNeeded = shouldUseAiSeo ? remainingRows.length : 0;
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
          batch_size: effectiveBatchSize,
          started_at: new Date().toISOString(),
          config: {
            has_ai_blocks: hasAiBlocks,
            has_ai_image_blocks: hasAiImageBlocks,
            ai_blocks_count: aiBlocks.length,
            ai_image_blocks_count: aiImageBlocks.length,
            campaign_type: campaign.campaign_type || "seo",
            effective_batch_size: effectiveBatchSize,
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

    // Pre-fetch website URL and name once (instead of per-row)
    let websiteBaseUrl: string | null = null;
    let websiteName: string | null = null;
    if (campaign.website_id) {
      const { data: website } = await supabase.from("websites").select("url, name").eq("id", campaign.website_id).maybeSingle();
      if (website?.url) websiteBaseUrl = website.url.replace(/\/+$/, "");
      if (website?.name) websiteName = website.name;
    }

    const TIMEOUT_MS = 120_000; // 120s soft limit (edge functions have ~150s hard limit)
    const startTime = Date.now();

    console.log("[GENERATE-PAGES] Starting batch processing. Rows:", remainingRows.length, "AI blocks:", aiBlocks.length, "Batch size:", effectiveBatchSize);

    // Process in batches
    const totalBatches = Math.ceil(remainingRows.length / effectiveBatchSize);
    let processedCount = alreadyProcessed;
    let failedCount = campaign.failed_rows || 0;
    let successCount = alreadyProcessed - (campaign.failed_rows || 0);
    let newSuccessCount = 0; // Only counts pages generated in THIS run (for usage tracking)
    let aiGenerationsUsed = 0;
    let batchesCompleted = campaign.current_batch || 0;
    let publishQueuedCount = 0;
    let timedOut = false;

    // US24 — Track slugs & titles across batches to enforce uniqueness
    const seenSlugsGlobal = new Set<string>();
    const seenTitlesGlobal = new Set<string>();
    // Pre-load existing slugs from previous runs in this campaign
    const { data: existingSlugs } = await supabase
      .from("generated_pages")
      .select("slug, title")
      .eq("campaign_id", campaign_id)
      .neq("status", "failed");
    if (existingSlugs) {
      for (const ep of existingSlugs) {
        seenSlugsGlobal.add(ep.slug.split("?")[0].toLowerCase());
        seenTitlesGlobal.add((ep.title || "").toLowerCase());
      }
    }

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
          }).catch(() => {});
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

      const batchStart = batchIdx * effectiveBatchSize;
      const batchRows = remainingRows.slice(batchStart, batchStart + effectiveBatchSize);
      batchesCompleted++;

      await logEvent(supabase, campaign_id, user.id, "batch_started",
        `Batch ${batchesCompleted} started (${batchRows.length} pages)`, batchesCompleted, batchRows.length);

      const batchPages: any[] = [];
      // Track slugs and titles within this campaign run for uniqueness
      const usedSlugs = new Set<string>(seenSlugsGlobal);
      const usedTitles = new Set<string>(seenTitlesGlobal);

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

          // Separate custom-value mappings from regular custom mappings
          const customValueMaps = (customMappings || []).filter((m: any) => m.source_column?.startsWith("__custom__:"));
          const regularMappings = (customMappings || []).filter((m: any) => !m.source_column?.startsWith("__custom__:"));

          // Apply custom value mappings (user-typed static values)
          if (customValueMaps.length > 0) {
            for (const mapping of customValueMaps) {
              const staticValue = mapping.source_column.replace("__custom__:", "");
              const regex = new RegExp(`\\{${mapping.target_field}\\}`, "gi");
              pageContent = pageContent.replace(regex, staticValue);
            }
          }

          // Apply regular custom mappings
          if (regularMappings.length > 0) {
            for (const mapping of regularMappings) {
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

          // Process variable transforms {variable:transform}
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

          // Per-variable fill rules: ai_only / ai_first override CSV.
          type FillRule = "csv_first" | "csv_only" | "ai_only" | "ai_first";
          const _fillRules = (((campaign.mapping || {}) as { fill_rules?: Record<string, FillRule> }).fill_rules) || {};
          const _ruleFor = (v: string): FillRule => (_fillRules[v] || _fillRules[v.toLowerCase()] || "csv_first");

          // Per-row AI fill: regenerate AI defaults using this row's data as
          // additional context (e.g. so {tagline} for "New York" differs from
          // "Los Angeles"). Falls back to the per-campaign defaults computed
          // upfront when not enabled.
          let rowAiDefaults = aiVarDefaults;
          const _aiFillMode = (globalThis as unknown as { __aiFillMode?: string }).__aiFillMode || "per_campaign";
          const _aiFillTargets = (globalThis as unknown as { __aiFillTargets?: string[] }).__aiFillTargets || [];
          const _aiFillCtx = (globalThis as unknown as { __aiFillContext?: { business?: string; niche?: string; service?: string } }).__aiFillContext || {};
          if (_aiFillMode === "per_row" && _aiFillTargets.length > 0 && LOVABLE_API_KEY) {
            // Merge row data into context so the AI sees this row's specifics.
            const rowSummary = Object.entries(row)
              .filter(([, v]) => typeof v === "string" && (v as string).trim())
              .slice(0, 12)
              .map(([k, v]) => `${k}: ${v}`).join("; ");
            const perRowCtx = {
              business: _aiFillCtx.business,
              niche: _aiFillCtx.niche,
              service: [_aiFillCtx.service, rowSummary].filter(Boolean).join(" — Row data: "),
            };
            try {
              rowAiDefaults = await generateAiVarDefaults(_aiFillTargets, perRowCtx, aiSettings, LOVABLE_API_KEY);
            } catch (e) {
              console.error("[GENERATE-PAGES] per-row AI fill failed, falling back to campaign defaults:", e);
              rowAiDefaults = aiVarDefaults;
            }
          }

          // 1. Apply AI defaults first when rule is ai_only or ai_first.
          for (const [key, value] of Object.entries(rowAiDefaults)) {
            const rule = _ruleFor(key);
            if (rule === "ai_only" || rule === "ai_first") {
              if (value || rule === "ai_only") {
                pageContent = pageContent.replace(new RegExp(`\\{${key}\\}`, "gi"), value || "");
              }
            }
          }

          // 2. Standard CSV/row variable replacement for remaining placeholders.
          for (const [key, value] of Object.entries(row)) {
            const rule = _ruleFor(key);
            if (rule === "ai_only") continue; // CSV must be ignored
            const regex = new RegExp(`\\{${key}\\}`, "gi");
            pageContent = pageContent.replace(regex, value || "");
          }

          // 3. AI fallback for any still-unfilled placeholders (csv_first when CSV empty).
          for (const [key, value] of Object.entries(rowAiDefaults)) {
            const rule = _ruleFor(key);
            if (rule === "ai_only" || rule === "ai_first") continue; // already applied
            const regex = new RegExp(`\\{${key}\\}`, "gi");
            pageContent = pageContent.replace(regex, value || "");
          }


          // Process spintax {option1|option2|option3}
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

          // Process {{AI_IMAGE:prompt}} blocks — replace with FREE Unsplash stock photos (zero AI cost)
          if (hasAiImageBlocks) {
            const currentAiImageBlocks = extractAiImageBlocks(pageContent);
            for (let imgIdx = 0; imgIdx < currentAiImageBlocks.length; imgIdx++) {
              const block = currentAiImageBlocks[imgIdx];
              try {
                const kw = encodeURIComponent(
                  String(block.prompt || "").split(/[\s,]+/).filter(Boolean).slice(0, 4).join(",") || "business",
                );
                const sig = Math.floor(Math.random() * 1_000_000);
                const imageUrl = `https://source.unsplash.com/1200x700/?${kw}&sig=${sig}`;
                const altText = block.prompt.replace(/"/g, '&quot;').slice(0, 200);
                pageContent = pageContent.replace(
                  block.fullMatch,
                  `<div class="ai-generated-image" style="margin:1em 0;">
  <img src="${imageUrl}" alt="${altText}" style="width:100%;height:auto;border-radius:8px;" loading="lazy">
</div>`
                );
              } catch (imgErr: any) {
                pageContent = pageContent.replace(
                  block.fullMatch,
                  `<em style="color:#dc2626;">[Image failed: ${imgErr.message}]</em>`
                );
              }
            }
          }

          // ═══════════════════════════════════════════════════════════
          // Image Fallback — if content has no real images (only
          // placeholders like picsum.photos or no <img> at all),
          // insert a relevant FREE Unsplash hero image based on page context.
          // No AI credits consumed.
          // ═══════════════════════════════════════════════════════════
          {
            const imgTags = pageContent.match(/<img\b[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi) || [];
            const realImages = imgTags.filter((tag: string) => {
              const srcMatch = tag.match(/src\s*=\s*["']([^"']+)["']/i);
              if (!srcMatch) return false;
              const src = srcMatch[1];
              return !src.includes("picsum.photos") &&
                     !src.includes("placeholder") &&
                     !src.includes("via.placeholder") &&
                     !src.includes("placehold.co") &&
                     !src.includes("dummyimage") &&
                     !src.startsWith("data:") &&
                     !src.includes("{") &&
                     src.trim().length > 5;
            });

            if (realImages.length === 0) {
              try {
                const contextValues = Object.values(allVars).filter(Boolean).slice(0, 5).join(" ");
                const h1Text = pageContent.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1]?.replace(/<[^>]*>/g, "").trim() || "";
                const kwSource = (h1Text || contextValues || "business").split(/[\s,]+/).filter(Boolean).slice(0, 4).join(",");
                const sig = Math.floor(Math.random() * 1_000_000);
                const fallbackUrl = `https://source.unsplash.com/1200x700/?${encodeURIComponent(kwSource)}&sig=${sig}`;
                const altText = (h1Text || contextValues).replace(/"/g, '&quot;').slice(0, 200);

                const placeholderRegex = /<img\b[^>]*src\s*=\s*["'](?:https?:\/\/(?:picsum\.photos|via\.placeholder|placehold\.co|dummyimage)[^"']*|[^"']*placeholder[^"']*)["'][^>]*\/?>/i;
                if (placeholderRegex.test(pageContent)) {
                  pageContent = pageContent.replace(placeholderRegex,
                    `<img src="${fallbackUrl}" alt="${altText}" style="width:100%;height:auto;border-radius:8px;" loading="lazy">`
                  );
                } else {
                  const heroImgHtml = `\n<div class="hero-image" style="margin:1em 0;">
  <img src="${fallbackUrl}" alt="${altText}" style="width:100%;height:auto;border-radius:8px;" loading="lazy">
</div>`;
                  const h1CloseIdx = pageContent.indexOf("</h1>");
                  if (h1CloseIdx !== -1) {
                    const insertAt = h1CloseIdx + 5;
                    pageContent = pageContent.slice(0, insertAt) + heroImgHtml + pageContent.slice(insertAt);
                  }
                }
              } catch (imgFallbackErr: any) {
                console.log("[GENERATE] Image fallback failed:", imgFallbackErr.message);
              }
            }
          }

          // Auto-repair SEO elements (H1, links, schema, keyword placement)
          const repairKeyword = derivePrimaryKeyword({
            title: Object.values(row).filter(Boolean).slice(0, 2).join(" "),
            slug: slugify(Object.values(row).filter(Boolean).slice(0, 2).join(" ")),
            content: pageContent,
          });
          pageContent = autoRepairContent(pageContent, {
            title: Object.values(row).filter(Boolean).slice(0, 2).join(" - ") || `Page ${processedCount + 1}`,
            primaryKeyword: repairKeyword,
          });

          const h1Match = pageContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
          let pageTitle: string;
          if (h1Match) {
            pageTitle = h1Match[1].replace(/<[^>]*>/g, "").trim();
          } else {
            const values = Object.values(row).filter(Boolean);
            pageTitle = values.slice(0, 2).join(" - ") || `Page ${processedCount + 1}`;
          }

          // Build slug — use template slug pattern from schema_config if defined
          const tplSchemaConfig = (campaign.templates.schema_config || {}) as Record<string, string>;
          const tplSlugPattern = tplSchemaConfig._slugPattern || "";
          let slug: string;
          if (tplSlugPattern) {
            let resolvedSlug = tplSlugPattern;
            for (const [key, value] of Object.entries(allVars)) {
              resolvedSlug = resolvedSlug.replace(new RegExp(`\\{${key}\\}`, "gi"), value || "");
            }
            slug = slugify(resolvedSlug) || slugify(pageTitle) || `page-${processedCount + 1}`;
          } else {
            slug = slugify(pageTitle) || `page-${processedCount + 1}`;
          }
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

          // US24 — Deduplicate slugs: append -2, -3, etc. if slug already exists
          const baseSlugForDedup = slug.toLowerCase();
          if (usedSlugs.has(baseSlugForDedup)) {
            let counter = 2;
            while (usedSlugs.has(`${baseSlugForDedup}-${counter}`)) counter++;
            slug = `${slug}-${counter}`;
          }
          usedSlugs.add(slug.toLowerCase());

          // Track title for uniqueness warning (logged but not blocked)
          if (usedTitles.has(pageTitle.toLowerCase())) {
            console.log(`[GENERATE-PAGES] Warning: duplicate title "${pageTitle}" in campaign ${campaign_id}`);
          }
          usedTitles.add(pageTitle.toLowerCase());

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

          // Read SEO title format from campaign mapping
          const campaignMapping = (campaign as any).mapping || {};
          const seoTitleFormat = campaignMapping.seo_title_format || "{title} | {brand}";

          let seoData = {
            seo_title: pageTitle.slice(0, 60),
            seo_description: pageContent.replace(/<[^>]*>/g, "").slice(0, 160),
            seo_keywords: [] as string[],
          };

          // Helper to apply the SEO title format pattern
          const applyTitleFormat = (rawTitle: string): string => {
            const brand = websiteName || "";
            return seoTitleFormat
              .replace(/\{title\}/gi, rawTitle)
              .replace(/\{brand\}/gi, brand)
              .trim()
              .replace(/^[\s|—-]+|[\s|—-]+$/g, "") // trim dangling separators if brand is empty
              .slice(0, 60);
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
            if (tplSeoTitle) {
              seoData.seo_title = resolvePattern(tplSeoTitle).slice(0, 60);
            } else {
              seoData.seo_title = applyTitleFormat(pageTitle);
            }
            if (tplSeoDesc) seoData.seo_description = resolvePattern(tplSeoDesc).slice(0, 160);

            // Still generate keywords via AI for test previews only to keep campaign publishing fast.
            if (shouldUseAiSeo) {
              try {
                const aiSeo = await generateSeoMetadata(pageTitle, pageContent, aiSettings, LOVABLE_API_KEY!, { name: websiteName || undefined, url: websiteBaseUrl || undefined });
                seoData.seo_keywords = aiSeo.seo_keywords;
                aiGenerationsUsed++;
              } catch { /* keep empty keywords */ }
            }
          } else if (shouldUseAiSeo) {
            try {
              seoData = await generateSeoMetadata(pageTitle, pageContent, aiSettings, LOVABLE_API_KEY!, { name: websiteName || undefined, url: websiteBaseUrl || undefined });
              // Apply the user's chosen format to the AI-generated title
              seoData.seo_title = applyTitleFormat(
                seoData.seo_title.replace(new RegExp(`\\s*[|—-]\\s*${(websiteName || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, "i"), "")
              );
              aiGenerationsUsed++;
            } catch { /* keep fallback */ }
          } else {
            // No template pattern and no AI — apply format to raw title
            seoData.seo_title = applyTitleFormat(pageTitle);
          }

          // Build canonical URL — use template pattern from schema_config if defined
          const tplCanonicalPattern = tplSchemaConfig._canonicalUrl || "";
          let canonicalUrl: string | null = null;
          if (tplCanonicalPattern) {
            let resolved = tplCanonicalPattern;
            for (const [key, value] of Object.entries({ ...allVars, slug })) {
              resolved = resolved.replace(new RegExp(`\\{${key}\\}`, "gi"), value || "");
            }
            canonicalUrl = resolved;
          } else if (websiteBaseUrl) {
            canonicalUrl = `${websiteBaseUrl}/${slug}`;
          }

          // Build JSON-LD structured data — use template schema config if defined
          const tplSchemaType = campaign.templates.schema_type as string || "";
          // tplSchemaConfig already declared above for slug pattern
          let jsonLd: string;

          if (tplSchemaType && tplSchemaType !== "WebPage") {
            // Resolve variables in schema config values
            const resolvedSchema: Record<string, any> = {
              "@context": "https://schema.org",
              "@type": tplSchemaType,
            };
            for (const [sk, sv] of Object.entries(tplSchemaConfig)) {
              if (!sv || sk.startsWith("_")) continue;
              if (typeof sv !== "string") { resolvedSchema[sk] = sv; continue; }
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

          // Build OG meta tags + canonical — use US16 OG/Twitter patterns from schema_config
          const resolveOgPattern = (pattern: string) => {
            let r = pattern;
            for (const [k, v] of Object.entries({ ...allVars, slug })) r = r.replace(new RegExp(`\\{${k}\\}`, "gi"), v || "");
            return r;
          };
          const ogTitle = tplSchemaConfig._ogTitle ? resolveOgPattern(tplSchemaConfig._ogTitle) : seoData.seo_title;
          const ogDesc = tplSchemaConfig._ogDescription ? resolveOgPattern(tplSchemaConfig._ogDescription) : seoData.seo_description;
          const ogImage = tplSchemaConfig._ogImage ? resolveOgPattern(tplSchemaConfig._ogImage) : undefined;
          const twitterCardType = tplSchemaConfig._twitterCard || "summary_large_image";
          const ogTags = buildOgMetaTags(ogTitle, ogDesc, canonicalUrl || undefined, ogImage, twitterCardType);
          const canonicalTag = canonicalUrl ? `<link rel="canonical" href="${canonicalUrl}">` : "";
          // Wrap content with responsive stylesheet and container
          const responsiveStyles = buildResponsiveStylesheet();
          // Per-campaign vibe theme override (palette, typography, density).
          // Returns "" when the campaign uses the default vibe.
          const vibeTheme = (((campaign.mapping || {}) as { vibe_theme?: VibeTheme }).vibe_theme) || null;
          const vibeOverride = buildVibeOverrideStyles(vibeTheme);

          // ── Additive SEO enhancements (multi-engine + AI-friendly) ──
          // These never replace existing tags; they are appended so any
          // engine/AI crawler that ignored Google-first hints can still parse
          // the page. Failures here must NEVER break page generation.
          let extendedSeo = "";
          let extraJsonLd = "";
          let aiFaqHtml = "";
          let aiFaqJsonLd = "";
          try {
            extendedSeo = buildMultiEngineMeta({
              title: seoData.seo_title,
              description: seoData.seo_description,
              language: resolvedLanguage,
              siteName: websiteName,
              canonicalUrl,
              modifiedAt: new Date().toISOString(),
              keywords: seoData.seo_keywords,
            });
            extraJsonLd = buildExtraJsonLd(
              campaign.campaign_type || "seo",
              pageTitle,
              seoData.seo_description,
              canonicalUrl,
              row,
            );
            // Only auto-generate FAQ when the template did NOT already declare
            // a FAQPage schema (avoids duplicate FAQPage JSON-LD).
            if (tplSchemaType !== "FAQPage") {
              // Project user-mapped CSV columns into the normalized faq_q1/faq_a1
              // keys that buildAutoFaq already understands. Existing keys on the
              // row are preserved (mapping wins only when both sides are set).
              const faqMapping = ((campaign as any)?.mapping?.faq_pairs ?? []) as Array<{
                question?: string;
                answer?: string;
              }>;
              const faqRow: Record<string, string> = { ...row };
              let slot = 1;
              for (const pair of faqMapping) {
                const q = pair?.question ? row[pair.question] : "";
                const a = pair?.answer ? row[pair.answer] : "";
                if (q && a) {
                  faqRow[`faq_q${slot}`] = q;
                  faqRow[`faq_a${slot}`] = a;
                  slot++;
                }
              }
              const faq = buildAutoFaq(pageContent, faqRow);
              aiFaqHtml = faq.html;
              aiFaqJsonLd = faq.jsonLd || "";
            }
          } catch (extErr) {
            console.warn("[GENERATE-PAGES] Extended SEO enhancements skipped:", (extErr as Error).message);
          }

          pageContent = `${ogTags}\n${extendedSeo}\n${canonicalTag}\n${jsonLd}\n${extraJsonLd}\n${aiFaqJsonLd}\n${responsiveStyles}\n${vibeOverride}\n<div class="pgp-page">\n${pageContent}${aiFaqHtml}\n</div>`;

          // ── Server-side JSON-LD validation (non-blocking) ──
          // We validate every <script type="application/ld+json"> block we
          // just emitted (primary schema, extra schema, FAQ). Failures here
          // MUST NEVER block generation — we only log + persist a summary
          // on the page record so the UI can surface it later.
          let seoWarnings: Record<string, unknown> | null = null;
          try {
            const validation = validateJsonLdInHtml(pageContent);
            if (validation.blocks > 0) {
              const summary = summarizeValidation(validation);
              seoWarnings = { jsonld: summary, validated_at: new Date().toISOString() };
              if (summary.error_count > 0 || summary.warning_count > 0) {
                console.warn(
                  `[GENERATE-PAGES] JSON-LD validation flagged ${summary.error_count} errors / ${summary.warning_count} warnings on "${pageTitle}" (types=${summary.types.join(",")})`,
                );
              }
            }
          } catch (vErr) {
            console.warn("[GENERATE-PAGES] JSON-LD validator skipped:", (vErr as Error).message);
          }

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
            status: effectivePublishMode as any,
            error_message: null,
            seo_title: seoData.seo_title,
            seo_description: seoData.seo_description,
            seo_keywords: seoData.seo_keywords,
            canonical_url: canonicalUrl,
            ad_campaign_id: adCampaignId,
            ad_group_id: adGroupId,
            seo_warnings: seoWarnings,
          });

          processedCount++;
          successCount++;
          newSuccessCount++;
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
      const pageIdsToPublish: string[] = [];
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
                const { error: updateError } = await supabase.from("generated_pages").update(updates).eq("id", existing.id);
                if (updateError) {
                  throw updateError;
                }
                if (campaign.publish_mode === "published" && campaign.website_id) {
                  pageIdsToPublish.push(existing.id);
                }
              }
            } else {
              // No existing page found, insert as new
              const { data: insertedPage, error: insertedPageError } = await supabase
                .from("generated_pages")
                .insert(page)
                .select("id")
                .single();
              if (insertedPageError) {
                throw insertedPageError;
              }
              if (campaign.publish_mode === "published" && campaign.website_id && insertedPage?.id) {
                pageIdsToPublish.push(insertedPage.id);
              }
            }
          }
        } else {
          const successfulPages = batchPages.filter((page) => page.status !== "failed");
          const failedPages = batchPages.filter((page) => page.status === "failed");

          if (successfulPages.length > 0) {
            const { data: insertedPages, error: insertError } = await supabase
              .from("generated_pages")
              .insert(successfulPages)
              .select("id");
            if (insertError) {
              await logEvent(supabase, campaign_id, user.id, "batch_error",
                `Batch ${batchesCompleted} insert failed: ${insertError.message}`, batchesCompleted);
              failedCount += successfulPages.length;
              successCount = Math.max(0, successCount - successfulPages.length);
            } else if (campaign.publish_mode === "published" && campaign.website_id) {
              pageIdsToPublish.push(...(insertedPages || []).map((page: any) => page.id).filter(Boolean));
            }
          }

          if (failedPages.length > 0) {
            const { error: failedInsertError } = await supabase.from("generated_pages").insert(failedPages);
            if (failedInsertError) {
              await logEvent(supabase, campaign_id, user.id, "batch_error",
                `Batch ${batchesCompleted} failed-page insert error: ${failedInsertError.message}`, batchesCompleted);
            }
          }
        }
      }

      if (pageIdsToPublish.length > 0) {
        const publishUrl = `${supabaseUrl}/functions/v1/publish-pages`;
        const PUBLISH_CHUNK = 5;
        publishQueuedCount += pageIdsToPublish.length;

        console.log(`[GENERATE-PAGES] Queueing background publish for batch of ${pageIdsToPublish.length} pages`);
        await logEvent(
          supabase,
          campaign_id,
          user.id,
          "auto_publish_started",
          `Queued auto-publish for batch ${batchesCompleted} (${pageIdsToPublish.length} pages)` ,
          batchesCompleted,
          pageIdsToPublish.length
        );

        for (let i = 0; i < pageIdsToPublish.length; i += PUBLISH_CHUNK) {
          const chunk = pageIdsToPublish.slice(i, i + PUBLISH_CHUNK);
          triggerBackgroundFunction(
            publishUrl,
            {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            {
              page_ids: chunk,
              publish_type: "page",
              website_id: campaign.website_id,
            },
            "publish-pages"
          );
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

    // Update subscription usage counters (pages + AI generations)
    {
      const { data: currentSub } = await supabase
        .from("subscriptions")
        .select("ai_generations_used, pages_used")
        .eq("user_id", user.id)
        .maybeSingle();

      if (currentSub) {
        const updates: Record<string, number> = {
          pages_used: (currentSub.pages_used || 0) + newSuccessCount,
        };
        if (aiGenerationsUsed > 0) {
          updates.ai_generations_used = (currentSub.ai_generations_used || 0) + aiGenerationsUsed;
        }
        await supabase.from("subscriptions")
          .update(updates)
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

    // Fallback queue for any pending pages that were not already queued during batch processing.
    if (campaign.publish_mode === "published" && campaign.website_id && successCount > 0 && publishQueuedCount === 0) {
      try {
        const { data: pendingPages } = await supabase
          .from("generated_pages")
          .select("id")
          .eq("campaign_id", campaign_id)
          .eq("status", "pending");

        if (pendingPages && pendingPages.length > 0) {
          const pageIds = pendingPages.map((p: any) => p.id);
          const publishUrl = `${supabaseUrl}/functions/v1/publish-pages`;
          const PUBLISH_CHUNK = 5;

          console.log(`[GENERATE-PAGES] Queueing fallback publish for ${pageIds.length} pages`);
          await logEvent(
            supabase,
            campaign_id,
            user.id,
            "auto_publish_started",
            `Queued fallback auto-publish for ${pageIds.length} pages to the connected website`
          );

          for (let i = 0; i < pageIds.length; i += PUBLISH_CHUNK) {
            const chunk = pageIds.slice(i, i + PUBLISH_CHUNK);
            triggerBackgroundFunction(
              publishUrl,
              {
                Authorization: authHeader,
                "Content-Type": "application/json",
              },
              {
                page_ids: chunk,
                publish_type: "page",
                website_id: campaign.website_id,
              },
              "publish-pages"
            );
          }
          publishQueuedCount += pageIds.length;
        }
      } catch (pubErr) {
        console.error("[GENERATE-PAGES] Auto-publish queue error:", pubErr);
        await logEvent(
          supabase,
          campaign_id,
          user.id,
          "auto_publish_error",
          `Auto-publish could not be queued: ${pubErr instanceof Error ? pubErr.message : "Unknown error"}`
        );
      }
    }

    if (campaign.website_id) {
      const sitemapUrl = `${supabaseUrl}/functions/v1/generate-sitemap`;
      triggerBackgroundFunction(
        sitemapUrl,
        {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        { website_id: campaign.website_id },
        "generate-sitemap"
      );

      try {
        const { data: webConfig } = await supabase
          .from("websites")
          .select("google_indexing_enabled")
          .eq("id", campaign.website_id)
          .maybeSingle();

        if (webConfig?.google_indexing_enabled) {
          const indexingUrl = `${supabaseUrl}/functions/v1/google-indexing`;
          triggerBackgroundFunction(
            indexingUrl,
            {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            { action: "auto-submit", website_id: campaign.website_id },
            "google-indexing"
          );
        }
      } catch (e) {
        console.error("Auto-indexing queue failed:", e);
      }
    }

    // Final summary log including AI autofill stats
    const aiFilledKeys = Object.keys(aiVarDefaults || {});
    if (aiFilledKeys.length > 0) {
      try {
        await logEvent(
          supabase,
          campaign_id,
          user.id,
          "generation_summary",
          `Generation complete: ${successCount} page(s) generated. AI auto-filled ${aiFilledKeys.length} variable(s) using niche/services context → ${aiFilledKeys.join(", ")}`,
        );
      } catch (_e) { /* best-effort */ }
    }

    return new Response(JSON.stringify({
      success: true,
      generated: successCount,
      failed: failedCount,
      total: csvRows.length,
      ai_generations_used: aiGenerationsUsed,
      ai_autofill: {
        count: aiFilledKeys.length,
        variables: aiFilledKeys,
      },
      job_id: jobId,
      publishing_queued: campaign.publish_mode === "published" && campaign.website_id && successCount > 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[GENERATE-PAGES] Fatal error:", err.message, err.stack);

    if (supabase && activeCampaignId) {
      const failedAt = new Date().toISOString();
      try {
        await supabase.from("campaigns").update({
          status: "failed",
          generation_completed_at: failedAt,
          is_paused: false,
        }).eq("id", activeCampaignId);

        const { data: latestActiveJob } = await supabase
          .from("generation_jobs")
          .select("id")
          .eq("campaign_id", activeCampaignId)
          .in("status", ["running", "pending", "paused"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestActiveJob?.id) {
          await updateJob(supabase, latestActiveJob.id, {
            status: "failed",
            completed_at: failedAt,
          });
        }
      } catch (cleanupErr) {
        console.error("[GENERATE-PAGES] Fatal cleanup failed:", cleanupErr);
      }
    }

    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
