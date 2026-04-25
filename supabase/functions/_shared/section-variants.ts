// Server-side CSS snippets that power the section variant toggles.
// Each variant returns a small extra CSS block + a body modifier class.
// The CSS is appended after the main <style> block in the template content
// and the modifier class is added to the page wrapper. This means existing
// `.pgp-*` markup keeps working — we only restyle / re-layout via class.

export type HeroVariant = "gradient" | "video" | "split" | "minimal" | "image";
export type GridVariant = "grid" | "bento" | "masonry" | "carousel";
export type CtaVariant = "band" | "card" | "split" | "stacked";
export type FaqVariant = "accordion" | "two-column" | "cards";

export interface SectionVariants {
  hero?: HeroVariant;
  grid?: GridVariant;
  cta?: CtaVariant;
  faq?: FaqVariant;
}

const HERO_CSS: Record<HeroVariant, string> = {
  gradient: "",
  video: `
.pgp-v-hero-video .pgp-hero{background:#0f172a !important}
.pgp-v-hero-video .pgp-hero::before,
.pgp-v-hero-video .pgp-hero::after{display:none}
.pgp-v-hero-video .pgp-hero::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,23,42,.45) 0%,rgba(15,23,42,.85) 100%);z-index:1;display:block;width:auto;height:auto;border-radius:0;filter:none;animation:none}
.pgp-v-hero-video .pgp-hero-overlay{background:radial-gradient(ellipse at center,transparent 0%,rgba(15,23,42,.55) 70%) !important}
.pgp-v-hero-video .pgp-hero-inner{padding-top:clamp(4rem,8vw,6rem);padding-bottom:clamp(4rem,8vw,6rem)}
`,
  split: `
.pgp-v-hero-split .pgp-hero{min-height:auto;text-align:left;border-radius:24px;background-image:none !important;background:linear-gradient(135deg,hsl(220 30% 12%),hsl(245 50% 18%)) !important}
.pgp-v-hero-split .pgp-hero::before{left:auto;right:-80px;top:-60px}
.pgp-v-hero-split .pgp-hero-inner{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(2rem,5vw,4rem);align-items:center;text-align:left;max-width:1180px;padding:clamp(3rem,6vw,5rem) clamp(1.5rem,3vw,3rem)}
.pgp-v-hero-split .pgp-hero-inner h1{margin-left:0}
.pgp-v-hero-split .pgp-hero-inner p{margin-left:0}
.pgp-v-hero-split .pgp-hero-cta{justify-content:flex-start}
@media(max-width:880px){.pgp-v-hero-split .pgp-hero-inner{grid-template-columns:1fr;text-align:center}.pgp-v-hero-split .pgp-hero-cta{justify-content:center}}
`,
  minimal: `
.pgp-v-hero-minimal .pgp-hero{background-image:none !important;background:transparent !important;box-shadow:none;min-height:auto;border-radius:0}
.pgp-v-hero-minimal .pgp-hero::before,.pgp-v-hero-minimal .pgp-hero::after{display:none}
.pgp-v-hero-minimal .pgp-hero-overlay{display:none}
.pgp-v-hero-minimal .pgp-hero-inner{color:inherit;padding:clamp(4rem,9vw,7rem) 1rem}
.pgp-v-hero-minimal .pgp-hero-inner h1{color:inherit;text-shadow:none;background:none;-webkit-background-clip:initial;background-clip:initial}
.pgp-v-hero-minimal .pgp-hero-inner p{color:inherit;opacity:.75}
`,
  image: `
.pgp-v-hero-image .pgp-hero{min-height:clamp(520px,80vh,720px)}
.pgp-v-hero-image .pgp-hero::before,.pgp-v-hero-image .pgp-hero::after{display:none}
.pgp-v-hero-image .pgp-hero-overlay{background:linear-gradient(180deg,rgba(0,0,0,.15) 0%,rgba(0,0,0,.78) 100%) !important}
`,
};

const GRID_CSS: Record<GridVariant, string> = {
  grid: "",
  bento: `
.pgp-v-grid-bento .pgp-grid{display:grid;grid-template-columns:repeat(6,1fr);grid-auto-rows:minmax(180px,auto);gap:1.25rem}
.pgp-v-grid-bento .pgp-grid > *:nth-child(6n+1){grid-column:span 4;grid-row:span 2}
.pgp-v-grid-bento .pgp-grid > *:nth-child(6n+2){grid-column:span 2}
.pgp-v-grid-bento .pgp-grid > *:nth-child(6n+3){grid-column:span 2}
.pgp-v-grid-bento .pgp-grid > *:nth-child(6n+4){grid-column:span 3}
.pgp-v-grid-bento .pgp-grid > *:nth-child(6n+5){grid-column:span 3}
.pgp-v-grid-bento .pgp-grid > *:nth-child(6n+6){grid-column:span 6}
.pgp-v-grid-bento .pgp-card{height:100%;display:flex;flex-direction:column;justify-content:space-between}
@media(max-width:900px){.pgp-v-grid-bento .pgp-grid{grid-template-columns:repeat(2,1fr)}.pgp-v-grid-bento .pgp-grid > *{grid-column:span 1 !important;grid-row:auto !important}}
@media(max-width:560px){.pgp-v-grid-bento .pgp-grid{grid-template-columns:1fr}}
`,
  masonry: `
.pgp-v-grid-masonry .pgp-grid{display:block;column-count:3;column-gap:1.5rem}
.pgp-v-grid-masonry .pgp-grid > *{break-inside:avoid;margin-bottom:1.5rem;display:block}
@media(max-width:900px){.pgp-v-grid-masonry .pgp-grid{column-count:2}}
@media(max-width:560px){.pgp-v-grid-masonry .pgp-grid{column-count:1}}
`,
  carousel: `
.pgp-v-grid-carousel .pgp-grid{display:flex;gap:1.25rem;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:1rem;grid-template-columns:none}
.pgp-v-grid-carousel .pgp-grid > *{flex:0 0 min(78vw,320px);scroll-snap-align:start}
.pgp-v-grid-carousel .pgp-grid::-webkit-scrollbar{height:6px}
.pgp-v-grid-carousel .pgp-grid::-webkit-scrollbar-thumb{background:rgba(128,128,128,.35);border-radius:3px}
`,
};

const CTA_CSS: Record<CtaVariant, string> = {
  band: "",
  card: `
.pgp-v-cta-card .pgp-cta-band{background-image:none !important;border-radius:24px;max-width:920px;margin:clamp(3rem,6vw,5rem) auto;padding:clamp(2.5rem,5vw,4rem);box-shadow:0 30px 80px rgba(0,0,0,.18);background:linear-gradient(135deg,hsl(245 60% 22%),hsl(265 55% 28%)) !important;position:relative;overflow:hidden}
.pgp-v-cta-card .pgp-cta-band .pgp-hero-overlay{display:none}
.pgp-v-cta-card .pgp-cta-band::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 20% 20%,rgba(255,255,255,.12),transparent 60%);pointer-events:none}
`,
  split: `
.pgp-v-cta-split .pgp-cta-band{background-image:none !important;background:linear-gradient(120deg,hsl(220 30% 14%),hsl(260 40% 22%)) !important}
.pgp-v-cta-split .pgp-cta-band .pgp-hero-overlay{display:none}
.pgp-v-cta-split .pgp-cta-inner{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:2rem;text-align:left;max-width:1100px}
.pgp-v-cta-split .pgp-cta-inner h2{flex:1 1 60%;margin:0}
.pgp-v-cta-split .pgp-cta-inner p{flex:1 1 100%;margin-bottom:0;opacity:.85}
.pgp-v-cta-split .pgp-cta-inner .pgp-btn{flex:0 0 auto}
@media(max-width:720px){.pgp-v-cta-split .pgp-cta-inner{text-align:center}.pgp-v-cta-split .pgp-cta-inner h2{flex-basis:100%}}
`,
  stacked: `
.pgp-v-cta-stacked .pgp-cta-band{padding:clamp(4rem,8vw,7rem) 1rem}
.pgp-v-cta-stacked .pgp-cta-inner h2{font-size:clamp(2rem,5vw,3.6rem);max-width:820px;margin:0 auto 1rem}
.pgp-v-cta-stacked .pgp-cta-inner .pgp-btn{font-size:1.05rem;padding:1rem 2.4rem}
`,
};

const FAQ_CSS: Record<FaqVariant, string> = {
  accordion: "",
  "two-column": `
.pgp-v-faq-2col .pgp-faq{max-width:1100px !important;display:grid;grid-template-columns:repeat(2,1fr);gap:1rem 2rem}
@media(max-width:760px){.pgp-v-faq-2col .pgp-faq{grid-template-columns:1fr}}
`,
  cards: `
.pgp-v-faq-cards .pgp-faq{max-width:1100px !important;display:grid;grid-template-columns:repeat(2,1fr);gap:1.25rem}
.pgp-v-faq-cards .pgp-faq details{background:linear-gradient(145deg,rgba(255,255,255,.04),rgba(128,128,128,.06));border:1px solid rgba(128,128,128,.18);border-radius:16px;padding:1.25rem 1.5rem;backdrop-filter:blur(10px)}
.pgp-v-faq-cards .pgp-faq summary{font-weight:600}
@media(max-width:760px){.pgp-v-faq-cards .pgp-faq{grid-template-columns:1fr}}
`,
};

export function buildVariantCss(variants: SectionVariants): string {
  const parts: string[] = [];
  if (variants.hero) parts.push(HERO_CSS[variants.hero] || "");
  if (variants.grid) parts.push(GRID_CSS[variants.grid] || "");
  if (variants.cta)  parts.push(CTA_CSS[variants.cta]   || "");
  if (variants.faq)  parts.push(FAQ_CSS[variants.faq]   || "");
  const css = parts.filter(Boolean).join("\n");
  if (!css.trim()) return "";
  return `<style data-pgp-variants="1">${css}</style>`;
}

export function variantBodyClasses(variants: SectionVariants): string[] {
  const cls: string[] = [];
  if (variants.hero && variants.hero !== "gradient") cls.push(`pgp-v-hero-${variants.hero === "two-column" ? "2col" : variants.hero}`);
  if (variants.grid && variants.grid !== "grid")     cls.push(`pgp-v-grid-${variants.grid}`);
  if (variants.cta  && variants.cta  !== "band")     cls.push(`pgp-v-cta-${variants.cta}`);
  if (variants.faq  && variants.faq  !== "accordion") {
    const slug = variants.faq === "two-column" ? "2col" : variants.faq;
    cls.push(`pgp-v-faq-${slug}`);
  }
  return cls;
}

export function applyVariantsToTemplate(html: string, variants: SectionVariants): string {
  let out = html.replace(/<style\b[^>]*data-pgp-variants="1"[^>]*>[\s\S]*?<\/style>/gi, "").trim();

  out = out.replace(/\bpgp-v-[a-z0-9-]+\b/g, "").replace(/class="\s+/g, 'class="').replace(/\s+"/g, '"');

  const css = buildVariantCss(variants);
  const classes = variantBodyClasses(variants).join(" ").trim();

  if (classes) {
    if (/class="[^"]*\bpgp-page\b[^"]*"/i.test(out)) {
      out = out.replace(/class="([^"]*\bpgp-page\b[^"]*)"/i, (_m, c) => `class="${c} ${classes}"`);
    } else {
      out = `<div class="pgp-page ${classes}">\n${out}\n</div>`;
    }
  }

  if (css) {
    const firstStyleEnd = out.search(/<\/style>/i);
    if (firstStyleEnd !== -1) {
      const insertAt = firstStyleEnd + "</style>".length;
      out = out.slice(0, insertAt) + "\n" + css + out.slice(insertAt);
    } else {
      out = `${css}\n${out}`;
    }
  }

  return out;
}
