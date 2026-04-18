// Replaces generic placeholder URLs (picsum.photos) and {{AI_IMAGE:...}} blocks
// in generated HTML templates with FREE Unsplash stock photos based on the
// business niche/keywords. NO AI credits are consumed.
//
// Unsplash Source API: https://source.unsplash.com/<size>/?<keywords>
// - Public, free, no auth required.
// - Returns a different relevant photo each call for the given query.

function buildUnsplashUrl(keywords: string, width = 1200, height = 600): string {
  const q = encodeURIComponent(
    keywords
      .split(/[\s,]+/)
      .filter(Boolean)
      .slice(0, 4)
      .join(",")
  );
  // Add a random seed to avoid the browser cache returning the same image for every slot
  const sig = Math.floor(Math.random() * 1_000_000);
  return `https://source.unsplash.com/${width}x${height}/?${q}&sig=${sig}`;
}

function buildKeywordPool(context: {
  niche?: string;
  businessType?: string;
  keywords?: string;
}): string[] {
  const niche = context.niche?.trim() || "";
  const type = context.businessType?.trim() || "";
  const kws = context.keywords?.trim() || "";
  const primary = [niche, type, kws].filter(Boolean).join(" ").trim() || "modern business";

  return [
    `${primary} hero professional`,
    `${primary} service`,
    `${primary} team workspace`,
    `${primary} product detail`,
    `${primary} happy customer`,
    `${primary} environment`,
  ];
}

/**
 * Replace generic picsum.photos URLs and {{AI_IMAGE:...}} blocks in the
 * given HTML with niche-relevant FREE Unsplash stock photos.
 *
 * Signature kept compatible with the previous AI-based version so callers
 * (generate-template, generate-seo-content) don't need to change.
 */
export async function injectNicheImages(
  html: string,
  context: { niche?: string; businessType?: string; keywords?: string },
  _apiKey: string,
): Promise<string> {
  if (!html) return html;

  const picsumMatches = [...html.matchAll(/https:\/\/picsum\.photos\/[^"\s')]+/g)];
  const aiImageMatches = [...html.matchAll(/\{\{AI_IMAGE:([^}]+)\}\}/g)];

  if (picsumMatches.length === 0 && aiImageMatches.length === 0) return html;

  const pool = buildKeywordPool(context);
  console.log(
    `Replacing ${picsumMatches.length + aiImageMatches.length} placeholder image(s) with Unsplash stock for: ${context.niche || context.businessType || context.keywords}`,
  );

  let out = html;
  let i = 0;

  // Replace each unique picsum URL with a unique Unsplash URL (so each slot gets a different photo)
  const seen = new Map<string, string>();
  for (const m of picsumMatches) {
    const original = m[0];
    if (!seen.has(original)) {
      // Try to honor any width/height in the original picsum URL (e.g., picsum.photos/800/400)
      const dim = original.match(/picsum\.photos\/(\d+)(?:\/(\d+))?/);
      const w = dim?.[1] ? Math.min(parseInt(dim[1], 10), 1600) : 1200;
      const h = dim?.[2] ? Math.min(parseInt(dim[2], 10), 1200) : Math.round(w * 0.55);
      const kw = pool[i % pool.length];
      seen.set(original, buildUnsplashUrl(kw, w, h));
      i++;
    }
  }
  for (const [orig, replacement] of seen.entries()) {
    out = out.split(orig).join(replacement);
  }

  // Replace {{AI_IMAGE:...}} blocks. The instruction inside the block becomes
  // additional keywords appended to the niche so the photo is more relevant.
  out = out.replace(/\{\{AI_IMAGE:([^}]+)\}\}/g, (_full, instruction: string) => {
    const extra = String(instruction).trim().slice(0, 80);
    const baseKw = pool[i % pool.length];
    i++;
    return buildUnsplashUrl(`${baseKw} ${extra}`.trim(), 1200, 700);
  });

  return out;
}
