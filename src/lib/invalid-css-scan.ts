/**
 * Invalid CSS scanner for generated page content.
 *
 * Scans a page's stored HTML (inline `style="..."` attributes and `<style>`
 * blocks) for malformed CSS declarations that are known to break rendering
 * after publish — e.g. `margin:0px px 0px px`, values with a unit but no
 * number, `NaN`/`undefined`/`null` tokens, or empty box shorthands.
 *
 * Pure/isomorphic: no DOM required, safe to run in the browser and in tests.
 */

export interface CssIssue {
  /** The offending declaration or snippet, e.g. `margin:0px px 0px px`. */
  snippet: string;
  /** Short human-readable reason. */
  reason: string;
}

export interface PageScanResult {
  /** Total number of invalid declarations found. */
  count: number;
  /** De-duplicated list of issues (capped for display). */
  issues: CssIssue[];
}

// Properties whose values we validate as space-separated length boxes.
const BOX_PROPS = /^(margin|padding|border-width|border-radius|inset|gap|grid-gap)(-\w+)?$/i;

// A single valid CSS length/number token: 0, 12px, 1.5rem, .5em, 100%, auto, etc.
const VALID_TOKEN =
  /^(auto|inherit|initial|unset|normal|none|0|[-+]?(\d*\.\d+|\d+)(px|em|rem|%|vw|vh|vmin|vmax|ch|fr|pt|cm|mm|in|pc|ex|deg|s|ms)?)$/i;

// A bare unit with no leading number, e.g. "px", "rem" — always invalid.
const BARE_UNIT = /^(px|em|rem|%|vw|vh|vmin|vmax|ch|fr|pt)$/i;

const BAD_TOKENS = /\b(NaN|undefined|null)\b/i;

function extractStyleStrings(html: string): string[] {
  const out: string[] = [];
  if (!html) return out;

  // inline style="..." attributes (single or double quoted)
  const inlineRe = /style\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let m: RegExpExecArray | null;
  while ((m = inlineRe.exec(html)) !== null) {
    out.push(m[1] ?? m[2] ?? "");
  }

  // <style>...</style> blocks
  const blockRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = blockRe.exec(html)) !== null) {
    out.push(m[1] ?? "");
  }

  return out;
}

/** Validate a single `property: value` declaration. Returns a reason if invalid. */
function checkDeclaration(prop: string, value: string): string | null {
  const p = prop.trim().toLowerCase();
  const v = value.trim();
  if (!p || v === "") return null;

  if (BAD_TOKENS.test(v)) return "contains NaN/undefined/null";

  // Empty or all-whitespace value already handled; check box shorthands strictly.
  if (BOX_PROPS.test(p)) {
    // Strip !important and collapse whitespace.
    const cleaned = v.replace(/!important/i, "").trim();
    if (cleaned === "") return "empty length value";
    const tokens = cleaned.split(/\s+/);
    for (const tok of tokens) {
      if (BARE_UNIT.test(tok)) return `bare unit "${tok}" without a number`;
      if (!VALID_TOKEN.test(tok)) return `invalid length token "${tok}"`;
    }
  }

  // Any property: catch dangling bare units like "0px px" anywhere.
  if (/\s(px|em|rem|%|vw|vh|vmin|vmax|ch|fr|pt)(\s|;|$)/.test(` ${v} `.replace(/([\d.])\s*(px|em|rem|%|vw|vh|vmin|vmax|ch|fr|pt)/gi, "$1$2"))) {
    // Only flag when a unit appears as its own token (no preceding digit).
    const hasBareUnit = v.split(/\s+/).some((tok) => BARE_UNIT.test(tok));
    if (hasBareUnit) return "dangling unit without a number";
  }

  return null;
}

export function scanCssIssues(html: string, maxIssues = 25): PageScanResult {
  const styles = extractStyleStrings(html);
  const issues: CssIssue[] = [];
  const seen = new Set<string>();
  let count = 0;

  for (const style of styles) {
    // For <style> blocks strip selectors/braces; for inline it's just declarations.
    const declBody = style.replace(/[^{}]*\{/g, ";").replace(/\}/g, ";");
    const decls = declBody.split(";");
    for (const decl of decls) {
      const idx = decl.indexOf(":");
      if (idx === -1) continue;
      const prop = decl.slice(0, idx);
      const value = decl.slice(idx + 1);
      const reason = checkDeclaration(prop, value);
      if (reason) {
        count++;
        const snippet = `${prop.trim()}:${value.trim()}`.slice(0, 120);
        const key = `${snippet}|${reason}`;
        if (!seen.has(key) && issues.length < maxIssues) {
          seen.add(key);
          issues.push({ snippet, reason });
        }
      }
    }
  }

  return { count, issues };
}

export function hasCssIssues(html: string): boolean {
  return scanCssIssues(html, 1).count > 0;
}
