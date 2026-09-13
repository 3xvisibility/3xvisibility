/** Canonical public brand name — never translate or reverse this. */
export const BRAND_NAME = "3x Visibility";

/** Compact form still used in some technical / legacy contexts. */
export const BRAND_NAME_COMPACT = "3XVISIBILITY";

/** Official site host (not a display name). */
export const BRAND_DOMAIN = "3xvisibility.com";

/**
 * Matches the real brand and common translator mangling
 * (e.g. "VISIBILITÉ x3", "Visibility x3", "3X VISIBILITÉ").
 * Negative lookarounds keep domains/emails (3xvisibility.com) untouched.
 */
const BRAND_ALIAS_RE =
  /(?<![\w.-])(?:3[\s\-]?[x×][\s\-]?visibilit(?:y|é|e)|visibilit(?:y|é|e)[\s\-]?[x×]?[\s\-]?3|3xvisibility)(?![\w.-])/gi;

/** True when the whole string is only a brand-name token. */
export function isBrandOnlyText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /^(?:3[\s\-]?[x×][\s\-]?visibilit(?:y|é|e)|visibilit(?:y|é|e)[\s\-]?[x×]?[\s\-]?3|3xvisibility)$/i.test(
    t,
  );
}

/** Force any brand alias / mangled translation back to the canonical name. */
export function restoreBrandName(text: string): string {
  return text.replace(BRAND_ALIAS_RE, BRAND_NAME);
}
