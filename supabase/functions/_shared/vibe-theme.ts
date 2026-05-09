// Vibe theme system — generates a CSS override block that is appended after
// the base PGP styles so it wins the cascade. Lets users customize the
// marketplace template look per campaign without forking templates.
//
// Three independent dimensions:
//   1. palette  — accent gradient + button/eyebrow/heading tint
//   2. typography — heading + body font family (loaded from Google Fonts)
//   3. density  — section padding, card padding, font scale
//
// All overrides are scoped to `.pgp-page` so they never leak to host CSS.

export type VibePalette =
  | "lovable" | "sunset" | "ocean" | "forest" | "mono" | "royal" | "candy" | "noir";
export type VibeTypography =
  | "modern" | "editorial" | "playful" | "tech" | "classic";
export type VibeDensity = "compact" | "comfortable" | "spacious";

export interface VibeTheme {
  palette?: VibePalette;
  typography?: VibeTypography;
  density?: VibeDensity;
  /** Optional brand CSS variable overrides (e.g. `{ "brand-color": "#ff0066" }`).
   * Emitted as `--brand-color: #ff0066;` declarations on `.pgp-page` so they
   * cascade into existing styles and any custom CSS authored below. */
  customVars?: Record<string, string>;
  /** Optional raw CSS appended at the very end of the override block (highest
   * specificity wins). Sanitized to strip `</style>` and HTML comments to
   * prevent breakouts. Authors should scope rules to `.pgp-page` themselves. */
  customCss?: string;
  /** Shopify theme-alignment tuning. When the page is published into a
   * Shopify theme, sections often live inside a `page-width` wrapper. These
   * knobs let the campaign opt into a full-bleed wrapper, override the
   * container max-width to match the merchant's theme, and fine-tune
   * heading scale / body line-height / section padding so generated content
   * feels native rather than transplanted. All fields are optional and
   * skipped when unset. */
  shopify?: {
    /** When true, removes the inner max-width and lets `.pgp-page` stretch
     * edge-to-edge (Shopify themes that already provide a full-bleed
     * section wrapper). Defaults to false. */
    fullBleed?: boolean;
    /** Override the inner container max-width, e.g. `"1200px"`, `"72rem"`.
     * Ignored when `fullBleed` is true. */
    containerMaxWidth?: string;
    /** Heading size multiplier (0.8 – 1.5). 1 = no change. Scales h1..h3. */
    headingScale?: number;
    /** Body line-height (1.3 – 2.0). Defaults to theme value when unset. */
    bodyLineHeight?: number;
    /** Section padding multiplier (0.5 – 1.5). 1 = density default. */
    sectionPaddingScale?: number;
    /** Horizontal page gutter (e.g. `"1.5rem"`, `"clamp(1rem,4vw,3rem)"`).
     * Applied as left/right padding on the wrapper. */
    horizontalPadding?: string;
  };
}

/** Strip dangerous sequences from user-supplied CSS so it can't break out of
 * the `<style>` block or inject scripts. We don't sanitize CSS properties
 * themselves — the browser ignores anything invalid. */
function sanitizeUserCss(input: string): string {
  return String(input || "")
    .replace(/<\/style/gi, "<\\/style")
    .replace(/<!--/g, "")
    .replace(/-->/g, "")
    .replace(/<script/gi, "<\\script")
    .trim();
}

/** Format `customVars` map into `--key: value;` declarations. Keys are
 * coerced to safe CSS identifiers (lowercase, alphanumeric + dash). */
function formatCustomVars(vars?: Record<string, string>): string {
  if (!vars) return "";
  const entries = Object.entries(vars).filter(([k, v]) => k && v != null && String(v).trim() !== "");
  if (entries.length === 0) return "";
  const decls = entries.map(([k, v]) => {
    const safeKey = String(k).trim().replace(/^--/, "").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60);
    const safeVal = String(v).replace(/[;{}<>]/g, "").trim().slice(0, 200);
    return `--${safeKey}:${safeVal}`;
  }).join(";");
  return `.pgp-page{${decls}}`;
}

interface PaletteSpec {
  // Two-stop gradient used for buttons, headings, accents.
  gradStart: string;
  gradMid: string;
  gradEnd: string;
  // Soft glow rgb (no alpha) for box shadows.
  glowRgb: string;
  // Hero overlay tint (RGBA stops).
  heroOverlay: string;
}

const PALETTES: Record<VibePalette, PaletteSpec> = {
  lovable: { gradStart: "#6366f1", gradMid: "#8b5cf6", gradEnd: "#d946ef", glowRgb: "99,102,241",  heroOverlay: "linear-gradient(135deg,rgba(15,23,42,.78) 0%,rgba(76,29,149,.55) 50%,rgba(15,23,42,.7) 100%)" },
  sunset:  { gradStart: "#f97316", gradMid: "#ec4899", gradEnd: "#f43f5e", glowRgb: "249,115,22",  heroOverlay: "linear-gradient(135deg,rgba(76,5,25,.78) 0%,rgba(190,24,93,.55) 50%,rgba(76,5,25,.7) 100%)" },
  ocean:   { gradStart: "#0ea5e9", gradMid: "#06b6d4", gradEnd: "#14b8a6", glowRgb: "14,165,233",  heroOverlay: "linear-gradient(135deg,rgba(8,47,73,.78) 0%,rgba(15,118,110,.55) 50%,rgba(8,47,73,.7) 100%)" },
  forest:  { gradStart: "#10b981", gradMid: "#65a30d", gradEnd: "#059669", glowRgb: "16,185,129",  heroOverlay: "linear-gradient(135deg,rgba(6,46,30,.78) 0%,rgba(22,101,52,.55) 50%,rgba(6,46,30,.7) 100%)" },
  mono:    { gradStart: "#1f2937", gradMid: "#475569", gradEnd: "#0f172a", glowRgb: "100,116,139", heroOverlay: "linear-gradient(135deg,rgba(15,23,42,.86) 0%,rgba(30,41,59,.7) 50%,rgba(15,23,42,.82) 100%)" },
  royal:   { gradStart: "#f59e0b", gradMid: "#eab308", gradEnd: "#d97706", glowRgb: "245,158,11",  heroOverlay: "linear-gradient(135deg,rgba(20,16,55,.82) 0%,rgba(67,20,7,.6) 50%,rgba(20,16,55,.78) 100%)" },
  candy:   { gradStart: "#ec4899", gradMid: "#a855f7", gradEnd: "#3b82f6", glowRgb: "236,72,153",  heroOverlay: "linear-gradient(135deg,rgba(76,5,68,.78) 0%,rgba(76,29,149,.55) 50%,rgba(30,58,138,.7) 100%)" },
  noir:    { gradStart: "#dc2626", gradMid: "#7f1d1d", gradEnd: "#0f172a", glowRgb: "220,38,38",   heroOverlay: "linear-gradient(135deg,rgba(0,0,0,.88) 0%,rgba(76,5,5,.65) 50%,rgba(0,0,0,.85) 100%)" },
};

interface TypoSpec {
  // Google Fonts family name and weight string.
  headingFamily: string;
  headingImport: string;
  bodyFamily: string;
  bodyImport: string;
  headingWeight: number;
  letterSpacing: string;
}

const TYPOGRAPHY: Record<VibeTypography, TypoSpec> = {
  modern:    { headingFamily: "Inter", headingImport: "Inter:wght@600;700;800;900", bodyFamily: "Inter", bodyImport: "", headingWeight: 800, letterSpacing: "-.025em" },
  editorial: { headingFamily: "Playfair Display", headingImport: "Playfair+Display:wght@700;800;900", bodyFamily: "Source Sans 3", bodyImport: "Source+Sans+3:wght@400;600", headingWeight: 800, letterSpacing: "-.015em" },
  playful:   { headingFamily: "Quicksand", headingImport: "Quicksand:wght@600;700", bodyFamily: "Nunito", bodyImport: "Nunito:wght@400;600;700", headingWeight: 700, letterSpacing: "-.01em" },
  tech:      { headingFamily: "Space Grotesk", headingImport: "Space+Grotesk:wght@600;700", bodyFamily: "JetBrains Mono", bodyImport: "JetBrains+Mono:wght@400;500", headingWeight: 700, letterSpacing: "-.02em" },
  classic:   { headingFamily: "Merriweather", headingImport: "Merriweather:wght@700;900", bodyFamily: "Lora", bodyImport: "Lora:wght@400;500;600", headingWeight: 800, letterSpacing: "-.01em" },
};

interface DensitySpec {
  sectionY: string;     // section vertical padding
  cardPad: string;      // card padding
  gap: string;          // grid gap
  baseFontPx: number;   // body font scaling
}

const DENSITY: Record<VibeDensity, DensitySpec> = {
  compact:     { sectionY: "clamp(2.25rem,5vw,4.5rem)",  cardPad: "1.4rem", gap: "1rem",   baseFontPx: 15 },
  comfortable: { sectionY: "clamp(3.5rem,8vw,7rem)",     cardPad: "2rem",   gap: "1.5rem", baseFontPx: 16 },
  spacious:    { sectionY: "clamp(5rem,11vw,10rem)",     cardPad: "2.6rem", gap: "2rem",   baseFontPx: 17 },
};

/**
 * Build a `<style>` block that overrides the base marketplace BASE_STYLES
 * tokens. Returns an empty string when the theme is the default (`lovable`,
 * `modern`, `comfortable`) so we don't ship unnecessary bytes.
 */
export function buildVibeOverrideStyles(theme?: VibeTheme | null): string {
  if (!theme) return "";
  const palette = theme.palette ?? "lovable";
  const typography = theme.typography ?? "modern";
  const density = theme.density ?? "comfortable";

  const customVarsBlock = formatCustomVars(theme.customVars);
  const customCssClean = sanitizeUserCss(theme.customCss || "");
  const hasCustom = !!(customVarsBlock || customCssClean);
  const isDefault = palette === "lovable" && typography === "modern" && density === "comfortable";

  // Skip when fully default AND no custom overrides — saves bytes.
  if (isDefault && !hasCustom) return "";

  const p = PALETTES[palette] ?? PALETTES.lovable;
  const t = TYPOGRAPHY[typography] ?? TYPOGRAPHY.modern;
  const d = DENSITY[density] ?? DENSITY.comfortable;

  const fontImports = [t.headingImport, t.bodyImport].filter(Boolean)
    .map((spec) => `@import url('https://fonts.googleapis.com/css2?family=${spec}&display=swap');`)
    .join("\n");

  // Base preset block — only emitted when the preset isn't fully default.
  // Otherwise we still emit a minimal wrapper so custom overrides ship.
  const presetBlock = isDefault ? "" : `${fontImports}
.pgp-page{font-size:${d.baseFontPx}px}
.pgp-page,.pgp-page p,.pgp-page li,.pgp-page span,.pgp-page a,.pgp-page input,.pgp-page textarea,.pgp-page button{font-family:'${t.bodyFamily}',inherit,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.pgp-page h1,.pgp-page h2,.pgp-page h3,.pgp-page h4,.pgp-page h5,.pgp-page h6{font-family:'${t.headingFamily}','${t.bodyFamily}',inherit,sans-serif;font-weight:${t.headingWeight};letter-spacing:${t.letterSpacing}}
.pgp-page .pgp-section{padding:${d.sectionY} 0}
.pgp-page .pgp-card{padding:${d.cardPad}}
.pgp-page .pgp-grid{gap:${d.gap}}
.pgp-page .pgp-eyebrow{background:linear-gradient(135deg,rgba(${p.glowRgb},.14),rgba(${p.glowRgb},.06));border-color:rgba(${p.glowRgb},.25)}
.pgp-page .pgp-eyebrow::before{background:linear-gradient(135deg,${p.gradStart},${p.gradEnd});box-shadow:0 0 10px rgba(${p.glowRgb},.6)}
.pgp-page .pgp-section-head h2{background:linear-gradient(135deg,currentColor 0%,currentColor 60%,rgba(128,128,128,.65) 100%);-webkit-background-clip:text;background-clip:text}
.pgp-page .pgp-card::before{background:linear-gradient(135deg,rgba(${p.glowRgb},.4),transparent 40%,transparent 60%,rgba(${p.glowRgb},.3))}
.pgp-page .pgp-card:hover{box-shadow:0 24px 60px rgba(${p.glowRgb},.18),0 8px 20px rgba(0,0,0,.08);border-color:rgba(${p.glowRgb},.35)}
.pgp-page .pgp-card .pgp-icon{background:linear-gradient(135deg,rgba(${p.glowRgb},.18),rgba(${p.glowRgb},.1));border-color:rgba(${p.glowRgb},.25);box-shadow:0 8px 20px rgba(${p.glowRgb},.18)}
.pgp-page .pgp-btn-primary{background:linear-gradient(135deg,${p.gradStart} 0%,${p.gradMid} 50%,${p.gradEnd} 100%);box-shadow:0 12px 30px rgba(${p.glowRgb},.4),inset 0 1px 0 rgba(255,255,255,.25)}
.pgp-page .pgp-btn-primary:hover{box-shadow:0 18px 40px rgba(${p.glowRgb},.55),inset 0 1px 0 rgba(255,255,255,.3)}
.pgp-page .pgp-hero-overlay,.pgp-page .pgp-cta-band .pgp-hero-overlay{background:${p.heroOverlay}}
.pgp-page .pgp-hero::before{background:radial-gradient(circle,rgba(${p.glowRgb},.55),transparent 70%)}
.pgp-page .pgp-hero::after{background:radial-gradient(circle,rgba(${p.glowRgb},.45),transparent 70%)}
.pgp-page .pgp-cta-band::before{background:radial-gradient(circle,rgba(${p.glowRgb},.5),transparent 70%)}
.pgp-page .pgp-cta-band::after{background:radial-gradient(circle,rgba(${p.glowRgb},.45),transparent 70%)}
.pgp-page .pgp-trust .num,.pgp-page .pgp-price{background:linear-gradient(135deg,${p.gradStart},${p.gradEnd});-webkit-background-clip:text;background-clip:text;color:transparent}
.pgp-page .pgp-tcard{transition:transform .3s ease,box-shadow .3s ease}
.pgp-page .pgp-tcard:hover{box-shadow:0 20px 50px rgba(${p.glowRgb},.18)}
.pgp-page .pgp-tcard footer img{border-color:rgba(${p.glowRgb},.35);box-shadow:0 4px 12px rgba(${p.glowRgb},.2)}
.pgp-page .pgp-faq details:hover{border-color:rgba(${p.glowRgb},.35)}
.pgp-page .pgp-faq details[open]{background:linear-gradient(145deg,rgba(${p.glowRgb},.06),rgba(${p.glowRgb},.03));border-color:rgba(${p.glowRgb},.4)}
.pgp-page .pgp-faq summary::after{background:linear-gradient(135deg,rgba(${p.glowRgb},.18),rgba(${p.glowRgb},.1))}
.pgp-page .pgp-info-row .pgp-info-icon{background:linear-gradient(135deg,rgba(${p.glowRgb},.18),rgba(${p.glowRgb},.1));border-color:rgba(${p.glowRgb},.25);box-shadow:0 4px 12px rgba(${p.glowRgb},.15)}
.pgp-page .pgp-form-group input:focus,.pgp-page .pgp-form-group textarea:focus{border-color:rgba(${p.glowRgb},.6);background:rgba(${p.glowRgb},.04);box-shadow:0 0 0 4px rgba(${p.glowRgb},.12)}
.pgp-page .pgp-carousel::-webkit-scrollbar-thumb{background:linear-gradient(90deg,${p.gradStart},${p.gradEnd})}
@keyframes pgp-pulse-glow-vibe{0%,100%{box-shadow:0 0 0 0 rgba(${p.glowRgb},.35),0 12px 32px rgba(0,0,0,.18)}50%{box-shadow:0 0 0 14px rgba(${p.glowRgb},0),0 18px 40px rgba(0,0,0,.22)}}
.pgp-page .pgp-hero-cta .pgp-btn-primary{animation:pgp-pulse-glow-vibe 3.5s ease-in-out infinite}`;

  // Custom vars + raw CSS appear LAST so they win the cascade.
  const customBlock = [
    customVarsBlock,
    customCssClean,
  ].filter(Boolean).join("\n");

  const customMarker = hasCustom ? ' data-pgp-vibe-custom="1"' : '';
  return `<style data-pgp-vibe="${palette}-${typography}-${density}"${customMarker}>
${presetBlock}
${customBlock ? `/* --- campaign brand overrides --- */\n${customBlock}` : ""}
</style>`;
}

// Display labels for the wizard UI (shared between front-end and edge fns).
export const VIBE_PALETTES: { value: VibePalette; label: string; swatch: string }[] = [
  { value: "lovable", label: "Lovable",  swatch: "linear-gradient(135deg,#6366f1,#8b5cf6,#d946ef)" },
  { value: "sunset",  label: "Sunset",   swatch: "linear-gradient(135deg,#f97316,#ec4899,#f43f5e)" },
  { value: "ocean",   label: "Ocean",    swatch: "linear-gradient(135deg,#0ea5e9,#06b6d4,#14b8a6)" },
  { value: "forest",  label: "Forest",   swatch: "linear-gradient(135deg,#10b981,#65a30d,#059669)" },
  { value: "candy",   label: "Candy",    swatch: "linear-gradient(135deg,#ec4899,#a855f7,#3b82f6)" },
  { value: "royal",   label: "Royal",    swatch: "linear-gradient(135deg,#f59e0b,#eab308,#d97706)" },
  { value: "noir",    label: "Noir",     swatch: "linear-gradient(135deg,#dc2626,#7f1d1d,#0f172a)" },
  { value: "mono",    label: "Mono",     swatch: "linear-gradient(135deg,#1f2937,#475569,#0f172a)" },
];

export const VIBE_TYPOGRAPHIES: { value: VibeTypography; label: string; hint: string }[] = [
  { value: "modern",    label: "Modern",    hint: "Inter — clean SaaS look" },
  { value: "editorial", label: "Editorial", hint: "Playfair — magazine serif" },
  { value: "playful",   label: "Playful",   hint: "Quicksand — rounded, friendly" },
  { value: "tech",      label: "Tech",      hint: "Space Grotesk + Mono" },
  { value: "classic",   label: "Classic",   hint: "Merriweather — timeless" },
];

export const VIBE_DENSITIES: { value: VibeDensity; label: string; hint: string }[] = [
  { value: "compact",     label: "Compact",     hint: "Tight spacing, more content per screen" },
  { value: "comfortable", label: "Comfortable", hint: "Balanced (default)" },
  { value: "spacious",    label: "Spacious",    hint: "Generous whitespace, premium feel" },
];
