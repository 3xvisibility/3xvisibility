// Front-end metadata for the AI-vibe section variant picker.
// The actual CSS that powers each variant lives server-side in
// supabase/functions/_shared/section-variants.ts so it can be applied at
// generation time without bloating the client bundle. We only mirror the
// labels / values here.

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

export const HERO_VARIANTS: { value: HeroVariant; label: string; hint: string }[] = [
  { value: "gradient", label: "Gradient mesh",  hint: "Animated gradient + floating orbs (default)" },
  { value: "video",    label: "Video hero",     hint: "Full-bleed looping background video" },
  { value: "split",    label: "Split hero",     hint: "Text + image side-by-side" },
  { value: "minimal",  label: "Minimal",        hint: "Clean centered text, no overlay" },
  { value: "image",    label: "Image hero",     hint: "Strong photo with dark gradient overlay" },
];

export const GRID_VARIANTS: { value: GridVariant; label: string; hint: string }[] = [
  { value: "grid",     label: "Grid",      hint: "Equal cards in a grid (default)" },
  { value: "bento",    label: "Bento",     hint: "Mixed sizes, modern bento layout" },
  { value: "masonry",  label: "Masonry",   hint: "Pinterest-style staggered columns" },
  { value: "carousel", label: "Carousel",  hint: "Horizontal scroll, snap-to-card" },
];

export const CTA_VARIANTS: { value: CtaVariant; label: string; hint: string }[] = [
  { value: "band",    label: "Band",     hint: "Full-width image band (default)" },
  { value: "card",    label: "Card",     hint: "Floating glass card" },
  { value: "split",   label: "Split",    hint: "Headline left, button right" },
  { value: "stacked", label: "Stacked",  hint: "Centered, large vertical CTA" },
];

export const FAQ_VARIANTS: { value: FaqVariant; label: string; hint: string }[] = [
  { value: "accordion",  label: "Accordion",   hint: "Single column expandable (default)" },
  { value: "two-column", label: "Two columns", hint: "Side-by-side Q&A" },
  { value: "cards",      label: "Cards",       hint: "Each Q&A as its own card" },
];

export const DEFAULT_VARIANTS: Required<SectionVariants> = {
  hero: "gradient",
  grid: "grid",
  cta: "band",
  faq: "accordion",
};

export function summarizeVariants(v: SectionVariants): string {
  const parts: string[] = [];
  if (v.hero && v.hero !== "gradient") parts.push(`hero: ${v.hero}`);
  if (v.grid && v.grid !== "grid")     parts.push(`grid: ${v.grid}`);
  if (v.cta  && v.cta  !== "band")     parts.push(`cta: ${v.cta}`);
  if (v.faq  && v.faq  !== "accordion")parts.push(`faq: ${v.faq}`);
  return parts.length ? parts.join(" · ") : "default layout";
}
