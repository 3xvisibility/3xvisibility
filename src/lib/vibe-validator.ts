// Heuristic validator that detects when a chosen vibe (palette / typography /
// density) is likely to clash with the selected template's existing styling.
//
// We don't run a real CSS engine — instead we sniff the template HTML for
// signals (hardcoded colors, fixed font families, pgp-marketplace classes,
// dark hero overlays, ecommerce/professional category) and compare them to
// the requested vibe. Each rule emits a `VibeWarning` with a severity and
// optional `suggest` patch the user can one-click apply.
//
// Designed to be cheap (string scan only), safe (never blocks the user — only
// warns), and explainable (every warning includes a human-readable `reason`).

import type { VibePalette, VibeTypography, VibeDensity } from "./vibe-theme";

export type VibeSeverity = "info" | "warning" | "danger";

export interface VibeWarning {
  /** Stable id for de-duping / dismissing. */
  id: string;
  severity: VibeSeverity;
  /** What the user sees first. Short, plain English. */
  title: string;
  /** Why this combination is risky. Single sentence is ideal. */
  reason: string;
  /** Optional suggested override the user can apply with one click. Only the
   * fields that should change are populated. */
  suggest?: Partial<{
    palette: VibePalette;
    typography: VibeTypography;
    density: VibeDensity;
  }>;
  /** Human-readable label for the suggestion button (e.g. "Switch to Mono"). */
  suggestLabel?: string;
}

export interface VibeValidationInput {
  templateContent?: string | null;
  /** Optional category — populated for marketplace templates, missing for
   * user-authored ones (we then rely solely on content sniffing). */
  templateCategory?: string | null;
  /** Optional tags from the marketplace meta. */
  templateTags?: string[] | null;
  palette: VibePalette;
  typography: VibeTypography;
  density: VibeDensity;
}

export interface VibeValidationResult {
  warnings: VibeWarning[];
  /** True when at least one `danger` warning fired. The wizard surfaces a
   * stronger banner in this case. */
  hasBlockingIssue: boolean;
}

// ── Signal extraction ──────────────────────────────────────────────────────
// Quick string-level heuristics. Lowercased once for cheap matching.

interface TemplateSignals {
  usesPgpClasses: boolean;
  /** Template hardcodes a font-family declaration (Google Font import, etc). */
  hardcodesFont: boolean;
  /** Template uses dark hero overlays / dark theme cues. */
  hasDarkHero: boolean;
  /** Template targets ecommerce/transactional flows where playful fonts feel off. */
  isEcommerce: boolean;
  /** Template targets formal verticals (law, finance, professional). */
  isFormal: boolean;
  /** Template targets food/restaurant/wedding — image-heavy editorial vibe. */
  isHospitality: boolean;
  /** Template is information dense (blog, course, listing) — compact reads worse. */
  isContentHeavy: boolean;
  /** Estimated content length — longer templates suffer more from compact density. */
  contentLengthBucket: "short" | "medium" | "long";
}

function scanTemplate(input: VibeValidationInput): TemplateSignals {
  const html = (input.templateContent || "").toLowerCase();
  const cat = (input.templateCategory || "").toLowerCase();
  const tags = (input.templateTags || []).map((t) => t.toLowerCase());
  const tagSet = new Set(tags);

  const usesPgpClasses = /\bpgp-(page|hero|card|btn|section|grid)\b/.test(html);
  const hardcodesFont =
    /font-family\s*:\s*['"]?(?!inherit\b)/i.test(html) ||
    /fonts\.googleapis\.com\/css/i.test(html);
  const hasDarkHero =
    /pgp-hero-overlay/.test(html) ||
    /background:\s*linear-gradient\([^)]*rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\.[5-9]/i.test(html) ||
    /color\s*:\s*#fff|color\s*:\s*white\b/i.test(html);

  const isEcommerce =
    cat === "ecommerce" || cat === "shopify" || cat === "prestashop" ||
    tagSet.has("ecommerce") || tagSet.has("product") || tagSet.has("shop");
  const isFormal =
    cat === "professional" ||
    tagSet.has("law") || tagSet.has("legal") || tagSet.has("attorney") ||
    tagSet.has("finance") || tagSet.has("medical") || tagSet.has("dental");
  const isHospitality =
    tagSet.has("restaurant") || tagSet.has("food") || tagSet.has("dining") ||
    tagSet.has("hotel") || tagSet.has("wedding") || tagSet.has("venue");
  const isContentHeavy =
    cat === "marketing" || cat === "education" ||
    tagSet.has("blog") || tagSet.has("article") || tagSet.has("course") || tagSet.has("content");

  const len = html.length;
  const contentLengthBucket: TemplateSignals["contentLengthBucket"] =
    len > 14000 ? "long" : len > 6000 ? "medium" : "short";

  return {
    usesPgpClasses,
    hardcodesFont,
    hasDarkHero,
    isEcommerce,
    isFormal,
    isHospitality,
    isContentHeavy,
    contentLengthBucket,
  };
}

// ── Rules ──────────────────────────────────────────────────────────────────
// Each rule is a pure function that returns 0+ warnings. Rules are small and
// independent so we can add/remove them without churn.

type Rule = (s: TemplateSignals, v: VibeValidationInput) => VibeWarning[];

const RULES: Rule[] = [
  // 1. Playful typography on formal/ecommerce templates → reads unprofessional.
  (s, v) => {
    if (v.typography === "playful" && (s.isFormal || s.isEcommerce)) {
      return [{
        id: "playful-on-formal",
        severity: "warning",
        title: "Playful typography clashes with this template",
        reason: s.isFormal
          ? "Formal verticals (law, finance, medical) lose credibility with rounded display fonts."
          : "Shoppers expect a polished product look — playful fonts can hurt conversion.",
        suggest: { typography: s.isFormal ? "classic" : "modern" },
        suggestLabel: s.isFormal ? "Switch to Classic" : "Switch to Modern",
      }];
    }
    return [];
  },

  // 2. Editorial serif on Shopify/SaaS-style templates → mismatched UX language.
  (_s, v) => {
    const cat = (v.templateCategory || "").toLowerCase();
    if (v.typography === "editorial" && (cat === "saas" || cat === "shopify")) {
      return [{
        id: "editorial-on-saas",
        severity: "info",
        title: "Editorial serif on a product template",
        reason: "Magazine serifs can feel slow/decorative on SaaS or storefronts where speed-to-buy matters.",
        suggest: { typography: "modern" },
        suggestLabel: "Switch to Modern",
      }];
    }
    return [];
  },

  // 3. JetBrains Mono body on long-form / hospitality content → readability hit.
  (s, v) => {
    if (v.typography === "tech" && (s.isHospitality || s.isContentHeavy || s.contentLengthBucket === "long")) {
      return [{
        id: "tech-on-readable",
        severity: "warning",
        title: "Mono body font hurts readability here",
        reason: "JetBrains Mono is great for code but tiring for long body text or hospitality copy.",
        suggest: { typography: "modern" },
        suggestLabel: "Switch to Modern",
      }];
    }
    return [];
  },

  // 4. Compact density on content-heavy templates → cramped paragraphs.
  (s, v) => {
    if (v.density === "compact" && (s.isContentHeavy || s.contentLengthBucket === "long")) {
      return [{
        id: "compact-on-long",
        severity: "warning",
        title: "Compact density may cramp this template",
        reason: "This template has long-form content — tight spacing makes paragraphs harder to scan.",
        suggest: { density: "comfortable" },
        suggestLabel: "Switch to Comfortable",
      }];
    }
    return [];
  },

  // 5. Spacious density on dense ecommerce listings → wastes above-the-fold space.
  (s, v) => {
    if (v.density === "spacious" && s.isEcommerce && s.contentLengthBucket !== "long") {
      return [{
        id: "spacious-on-ecom",
        severity: "info",
        title: "Spacious density may push CTAs below the fold",
        reason: "Ecommerce templates convert best with the buy CTA visible without scrolling.",
        suggest: { density: "comfortable" },
        suggestLabel: "Switch to Comfortable",
      }];
    }
    return [];
  },

  // 6. Sunset/Candy palette on formal verticals → tonally wrong.
  (s, v) => {
    if ((v.palette === "sunset" || v.palette === "candy") && s.isFormal) {
      return [{
        id: "warm-on-formal",
        severity: "warning",
        title: "Bright palette undermines authority",
        reason: "Hot pink / orange palettes feel out of place on legal, medical, or financial pages.",
        suggest: { palette: "mono" },
        suggestLabel: "Switch to Mono",
      }];
    }
    return [];
  },

  // 7. Noir palette on hospitality/wedding templates → too aggressive.
  (s, v) => {
    if (v.palette === "noir" && s.isHospitality) {
      return [{
        id: "noir-on-hospitality",
        severity: "info",
        title: "Noir reads aggressive for hospitality",
        reason: "Hotels, weddings, and restaurants typically convert better with warmer or cleaner palettes.",
        suggest: { palette: "sunset" },
        suggestLabel: "Switch to Sunset",
      }];
    }
    return [];
  },

  // 8. Forest palette on tech/SaaS → atypical, but only an info-level note.
  (_s, v) => {
    const cat = (v.templateCategory || "").toLowerCase();
    if (v.palette === "forest" && cat === "saas") {
      return [{
        id: "forest-on-saas",
        severity: "info",
        title: "Green palette is unusual for SaaS",
        reason: "Most B2B SaaS pages convert better with cooler or more vibrant palettes — preview before shipping.",
        suggest: { palette: "ocean" },
        suggestLabel: "Try Ocean",
      }];
    }
    return [];
  },

  // 9. Template hardcodes a font family but typography mood overrides it →
  //    flag so the user understands why their custom CSS may not apply.
  (s, v) => {
    if (s.hardcodesFont && v.typography !== "modern" && !s.usesPgpClasses) {
      return [{
        id: "hardcoded-font-conflict",
        severity: "warning",
        title: "Template hardcodes a font — vibe override may not apply everywhere",
        reason: "This template ships its own font-family declarations. The vibe font will only apply where the template inherits from .pgp-page.",
      }];
    }
    return [];
  },

  // 10. Light palette on a dark-hero template — cosmetic mismatch.
  (s, v) => {
    if (s.hasDarkHero && v.palette === "mono") {
      return [{
        id: "mono-on-dark-hero",
        severity: "info",
        title: "Mono palette over a dark hero",
        reason: "The hero overlay is already dark — Mono accents may look flat against it. Royal or Ocean adds contrast.",
        suggest: { palette: "ocean" },
        suggestLabel: "Try Ocean",
      }];
    }
    return [];
  },
];

/**
 * Run all heuristic rules and return the merged warning list.
 * Pure function — safe to call on every keystroke (memo on the call site).
 */
export function validateVibeForTemplate(input: VibeValidationInput): VibeValidationResult {
  if (!input.templateContent && !input.templateCategory) {
    return { warnings: [], hasBlockingIssue: false };
  }
  const signals = scanTemplate(input);
  const warnings: VibeWarning[] = [];
  for (const rule of RULES) {
    try {
      warnings.push(...rule(signals, input));
    } catch {
      // Rules must never throw — defensive guard so a buggy rule can't break
      // the whole wizard.
    }
  }
  // De-dupe by id (rules may overlap in edge cases).
  const seen = new Set<string>();
  const deduped = warnings.filter((w) => (seen.has(w.id) ? false : (seen.add(w.id), true)));
  return {
    warnings: deduped,
    hasBlockingIssue: deduped.some((w) => w.severity === "danger"),
  };
}

/**
 * Iteratively apply every warning's `suggest` patch until validation
 * stabilises (no more `info|warning|danger` warnings produce a `suggest`).
 *
 * Why a loop: applying one fix can unmask a different rule (e.g. switching
 * to "modern" typography may surface a palette warning that was previously
 * dominated by the typography one). We cap iterations to prevent any
 * accidental cycle from spinning forever.
 *
 * Returns the final safe combination plus the list of changes applied. If
 * no warnings are present (or none have a suggestion), `changed` is false
 * and the original vibe is returned unchanged.
 */
export interface AutoFixResult {
  palette: VibePalette;
  typography: VibeTypography;
  density: VibeDensity;
  changed: boolean;
  /** Stable warning ids that were resolved by the auto-fix. */
  appliedFixes: string[];
  /** Warnings still present after the fix loop (no suggestion to apply). */
  remainingWarnings: VibeWarning[];
}

export function computeSafestVibe(input: VibeValidationInput): AutoFixResult {
  let palette = input.palette;
  let typography = input.typography;
  let density = input.density;
  const appliedFixes: string[] = [];
  const seenSuggestionKey = new Set<string>();

  // Hard cap — far above what any realistic chain needs.
  for (let i = 0; i < 8; i++) {
    const { warnings } = validateVibeForTemplate({
      ...input, palette, typography, density,
    });
    // Pick the first warning that has a suggestion AND would actually change
    // at least one dimension. Severity priority: danger → warning → info.
    const sorted = [...warnings].sort((a, b) => {
      const order: Record<VibeSeverity, number> = { danger: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
    const next = sorted.find((w) => {
      if (!w.suggest) return false;
      const willChange =
        (w.suggest.palette && w.suggest.palette !== palette) ||
        (w.suggest.typography && w.suggest.typography !== typography) ||
        (w.suggest.density && w.suggest.density !== density);
      // Avoid revisiting the same suggestion in a cycle.
      const key = `${w.id}:${w.suggest.palette || ""}:${w.suggest.typography || ""}:${w.suggest.density || ""}`;
      return !!willChange && !seenSuggestionKey.has(key);
    });
    if (!next || !next.suggest) break;
    if (next.suggest.palette) palette = next.suggest.palette;
    if (next.suggest.typography) typography = next.suggest.typography;
    if (next.suggest.density) density = next.suggest.density;
    appliedFixes.push(next.id);
    seenSuggestionKey.add(`${next.id}:${next.suggest.palette || ""}:${next.suggest.typography || ""}:${next.suggest.density || ""}`);
  }

  const finalCheck = validateVibeForTemplate({ ...input, palette, typography, density });
  return {
    palette,
    typography,
    density,
    changed: palette !== input.palette || typography !== input.typography || density !== input.density,
    appliedFixes,
    remainingWarnings: finalCheck.warnings,
  };
}

