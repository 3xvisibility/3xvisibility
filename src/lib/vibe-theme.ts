// Front-end mirror of supabase/functions/_shared/vibe-theme.ts.
// Kept in sync intentionally — we can't import from supabase/functions in the
// browser bundle (Deno-targeted). Only the picker metadata is exposed here;
// the actual CSS override is built server-side at generation time.

export type VibePalette =
  | "lovable" | "sunset" | "ocean" | "forest" | "mono" | "royal" | "candy" | "noir";
export type VibeTypography =
  | "modern" | "editorial" | "playful" | "tech" | "classic";
export type VibeDensity = "compact" | "comfortable" | "spacious";

export interface VibeTheme {
  palette?: VibePalette;
  typography?: VibeTypography;
  density?: VibeDensity;
  /** Per-campaign brand CSS variable overrides. Emitted as `--key: value;`
   * declarations on `.pgp-page` so they override defaults and feed any
   * authored custom CSS. */
  customVars?: Record<string, string>;
  /** Per-campaign raw CSS appended after the preset block. Sanitized server
   * side; authors should scope rules to `.pgp-page`. */
  customCss?: string;
}

/** Parse a textarea where each line is `key: value` or `key=value` (lines
 * starting with `#` or `//` are treated as comments). Used by the wizard UI. */
export function parseCustomVarsInput(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!text) return out;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    const m = line.match(/^([A-Za-z0-9_-]+)\s*[:=]\s*(.+?)\s*;?$/);
    if (!m) continue;
    out[m[1]] = m[2];
  }
  return out;
}

/** Inverse of `parseCustomVarsInput`. */
export function stringifyCustomVars(vars?: Record<string, string>): string {
  if (!vars) return "";
  return Object.entries(vars).map(([k, v]) => `${k}: ${v}`).join("\n");
}

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
  { value: "compact",     label: "Compact",     hint: "Tight, more content per screen" },
  { value: "comfortable", label: "Comfortable", hint: "Balanced (default)" },
  { value: "spacious",    label: "Spacious",    hint: "Generous whitespace, premium" },
];

export const DEFAULT_VIBE: Required<Pick<VibeTheme, "palette" | "typography" | "density">> = {
  palette: "lovable",
  typography: "modern",
  density: "comfortable",
};
