// Template customizer — lets users tweak hero copy, accent color and section
// order (and the per-platform theme skin) of a design-system (`pgp-*`) template
// before publishing. All transforms are PURE and idempotent: the editor keeps
// the ORIGINAL content untouched and recomputes the output from the current
// control values on every render / save, so nothing drifts.

import {
  reskinContent,
  defaultSkinVariant,
  type TemplatePlatform,
} from "@/lib/marketplace-templates";

export interface HeroFields {
  badge: string;
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  hasHero: boolean;
}

export interface SectionInfo {
  /** Stable index into the original section list (used to express ordering). */
  index: number;
  label: string;
  kind: string;
}

export interface CustomizerState {
  platform: TemplatePlatform;
  variant: string;
  accent: string; // "" = no override
  hero: HeroFields;
  /** Permutation of original section indices, e.g. [0,2,1,3]. */
  order: number[];
}

const EMPTY_HERO: HeroFields = {
  badge: "",
  title: "",
  subtitle: "",
  primaryCta: "",
  secondaryCta: "",
  hasHero: false,
};

const parse = (html: string): Document =>
  new DOMParser().parseFromString(html, "text/html");

/** True when the content uses the `pgp-*` design system (visually editable). */
export function isCustomizable(content: string): boolean {
  return /class="[^"]*\bpgp-page\b/.test(content);
}

/** Detect the embedded platform skin, falling back to generic. */
export function detectPlatform(content: string): TemplatePlatform {
  const m = content.match(/pgp-skin-(wordpress|shopify|prestashop)/);
  return (m?.[1] as TemplatePlatform) ?? "generic";
}

/** Detect the active skin variant marker, if any. */
export function detectVariant(content: string, platform: TemplatePlatform): string {
  if (platform === "generic") return "";
  const m = content.match(/data-skin-variant="([^"]+)"/);
  return m?.[1] || defaultSkinVariant(platform);
}

const text = (el: Element | null): string => (el?.textContent ?? "").trim();

/** Pull the editable hero fields from a `.pgp-hero` block. */
export function extractHero(content: string): HeroFields {
  const doc = parse(content);
  const hero = doc.querySelector(".pgp-hero");
  if (!hero) return { ...EMPTY_HERO };
  return {
    hasHero: true,
    badge: text(hero.querySelector(".pgp-eyebrow-light")),
    title: text(hero.querySelector("h1")),
    subtitle: text(hero.querySelector("p")),
    primaryCta: text(hero.querySelector(".pgp-btn-primary")),
    secondaryCta: text(hero.querySelector(".pgp-btn-ghost")),
  };
}

const sectionLabel = (el: Element, i: number): { label: string; kind: string } => {
  if (el.classList.contains("pgp-hero")) return { label: "Hero", kind: "hero" };
  if (el.classList.contains("pgp-trust")) return { label: "Trust bar", kind: "trust" };
  if (el.classList.contains("pgp-cta-band")) return { label: "Call to action", kind: "cta" };
  if (el.id === "contact") return { label: "Contact", kind: "contact" };
  const h2 = text(el.querySelector(".pgp-section-head h2, h2"));
  if (h2) return { label: h2.slice(0, 40), kind: "section" };
  if (el.querySelector(".pgp-gallery")) return { label: "Gallery", kind: "gallery" };
  if (el.querySelector(".pgp-faq")) return { label: "FAQ", kind: "faq" };
  if (el.querySelector(".pgp-carousel")) return { label: "Testimonials", kind: "testimonials" };
  return { label: `Section ${i + 1}`, kind: "section" };
};

/** The reorderable top-level blocks inside `.pgp-wrap`. */
export function extractSections(content: string): SectionInfo[] {
  const doc = parse(content);
  const wrap = doc.querySelector(".pgp-wrap") ?? doc.querySelector(".pgp-page");
  if (!wrap) return [];
  return Array.from(wrap.children).map((el, i) => {
    const { label, kind } = sectionLabel(el, i);
    return { index: i, label, kind };
  });
}

/** Build the full initial control state from a template's content. */
export function initState(content: string): CustomizerState {
  const platform = detectPlatform(content);
  const sections = extractSections(content);
  return {
    platform,
    variant: detectVariant(content, platform),
    accent: "",
    hero: extractHero(content),
    order: sections.map((s) => s.index),
  };
}

const ACCENT_STYLE_MARK = "data-customizer-accent";

const accentStyle = (accent: string): string => {
  // Scoped, !important overrides so the accent wins over base + skin + vibe.
  const r = ".pgp-page";
  return `<style ${ACCENT_STYLE_MARK}="1">
${r} .pgp-btn-primary{background:${accent} !important;background-image:none !important;color:#fff !important}
${r} .pgp-btn-primary:hover{filter:brightness(.94) !important}
${r} .pgp-btn-outline{border-color:${accent} !important;color:${accent} !important}
${r} .pgp-eyebrow,${r} .pgp-eyebrow-light{color:${accent} !important}
${r} .pgp-section-head h2{background:none !important;-webkit-text-fill-color:${accent} !important;color:${accent} !important}
${r} .pgp-trust .num{background:none !important;-webkit-text-fill-color:${accent} !important;color:${accent} !important}
${r} .pgp-card .pgp-icon{color:${accent} !important}
</style>`;
};

const setHeroText = (el: Element | null, value: string) => {
  if (el) el.textContent = value;
};

/**
 * Recompute the final template HTML from the original content + control state.
 * Pure & idempotent — safe to call on every keystroke for live preview.
 */
export function buildOutput(original: string, state: CustomizerState): string {
  // 1. Apply the platform skin variant (string-level, idempotent).
  let html = original;
  if (state.platform !== "generic") {
    html = reskinContent(html, state.platform, state.variant);
  }

  // 2. DOM edits for hero copy, section order, accent.
  const doc = parse(html);
  const page = doc.querySelector(".pgp-page");
  if (page) {
    const hero = page.querySelector(".pgp-hero");
    if (hero && state.hero.hasHero) {
      setHeroText(hero.querySelector(".pgp-eyebrow-light"), state.hero.badge);
      setHeroText(hero.querySelector("h1"), state.hero.title);
      setHeroText(hero.querySelector("p"), state.hero.subtitle);
      setHeroText(hero.querySelector(".pgp-btn-primary"), state.hero.primaryCta);
      setHeroText(hero.querySelector(".pgp-btn-ghost"), state.hero.secondaryCta);
    }

    const wrap = page.querySelector(".pgp-wrap") ?? page;
    const children = Array.from(wrap.children);
    if (
      state.order.length === children.length &&
      state.order.some((idx, i) => idx !== i)
    ) {
      state.order.forEach((idx) => {
        const node = children[idx];
        if (node) wrap.appendChild(node);
      });
    }

    page.querySelectorAll(`style[${ACCENT_STYLE_MARK}]`).forEach((s) => s.remove());
    if (state.accent) {
      const tmp = parse(accentStyle(state.accent));
      const styleEl = tmp.querySelector("style");
      if (styleEl) page.appendChild(styleEl);
    }
  }

  return doc.body.innerHTML;
}
