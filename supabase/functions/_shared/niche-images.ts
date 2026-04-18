// Shared helper to generate niche-relevant images via Lovable AI image model
// and replace generic placeholder URLs (picsum.photos) and {{AI_IMAGE:...}} blocks
// in generated HTML templates.

const IMAGE_MODEL = "google/gemini-2.5-flash-image";

async function generateImage(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      console.error("Image gen failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    return url || null;
  } catch (e) {
    console.error("Image gen error:", e);
    return null;
  }
}

/**
 * Build a list of contextual image prompts based on the business context
 * and the sections that exist in the HTML.
 */
function buildImagePrompts(
  context: { niche?: string; businessType?: string; keywords?: string },
  count: number,
): string[] {
  const niche = context.niche?.trim() || context.keywords?.split(",")[0]?.trim() || "modern business";
  const type = context.businessType?.trim() || "landing page";
  const base = `Professional, high-quality photograph for a ${type} about "${niche}". Clean composition, natural lighting, modern editorial style, no text overlays, no watermarks, photorealistic.`;

  const variants = [
    `Hero shot — ${base} Wide cinematic banner showing the core subject of "${niche}" in action.`,
    `Service / product detail — ${base} Close-up showing the "${niche}" service or product being delivered or used.`,
    `Happy customer / result — ${base} Authentic person experiencing or benefiting from "${niche}".`,
    `Workspace / environment — ${base} The professional environment, tools, or setting where "${niche}" happens.`,
    `Detail / texture shot — ${base} Atmospheric supporting image relevant to "${niche}".`,
  ];
  return variants.slice(0, Math.max(1, Math.min(count, variants.length)));
}

/**
 * Replace generic picsum.photos URLs and {{AI_IMAGE:...}} blocks in the
 * given HTML with niche-relevant AI-generated images. Reuses generated
 * images in a round-robin if there are more placeholders than prompts.
 */
export async function injectNicheImages(
  html: string,
  context: { niche?: string; businessType?: string; keywords?: string },
  apiKey: string,
): Promise<string> {
  if (!html) return html;

  // Count distinct picsum URLs (cap at a reasonable number to control cost / payload)
  const picsumMatches = [...html.matchAll(/https:\/\/picsum\.photos\/[^"\s')]+/g)];
  const aiImageMatches = [...html.matchAll(/\{\{AI_IMAGE:([^}]+)\}\}/g)];

  const totalPlaceholders = picsumMatches.length + aiImageMatches.length;
  if (totalPlaceholders === 0) return html;

  // Generate up to 3 base images for the niche to keep latency / payload reasonable
  const promptCount = Math.min(3, Math.max(1, totalPlaceholders));
  const prompts = buildImagePrompts(context, promptCount);

  console.log(`Generating ${prompts.length} niche image(s) for: ${context.niche || context.businessType || context.keywords}`);

  const generated: string[] = [];
  for (const p of prompts) {
    const url = await generateImage(p, apiKey);
    if (url) generated.push(url);
  }

  if (generated.length === 0) {
    console.warn("No niche images generated, leaving placeholders intact");
    return html;
  }

  let out = html;
  let i = 0;

  // Replace each unique picsum URL with a generated one (round-robin)
  const seen = new Map<string, string>();
  for (const m of picsumMatches) {
    const original = m[0];
    if (!seen.has(original)) {
      seen.set(original, generated[i % generated.length]);
      i++;
    }
  }
  for (const [orig, replacement] of seen.entries()) {
    out = out.split(orig).join(replacement);
  }

  // Replace {{AI_IMAGE:...}} blocks individually so each gets a distinct image
  out = out.replace(/\{\{AI_IMAGE:[^}]+\}\}/g, () => {
    const url = generated[i % generated.length];
    i++;
    return url;
  });

  return out;
}
