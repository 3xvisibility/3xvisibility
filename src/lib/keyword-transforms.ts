/**
 * Keyword Transformations — PGP-compatible variable modifiers.
 *
 * Syntax: {variable_name:transform} or {variable_name:transform(arg)}
 *
 * Supported transforms:
 *   uppercase / upper       → FULL UPPERCASE
 *   lowercase / lower       → full lowercase
 *   capitalize / title      → Title Case
 *   capitalize_first        → First letter only
 *   slug                    → url-safe-slug
 *   extract(n)              → Extract nth part (comma/pipe separated)
 *   extract(n, delim)       → Extract nth part with custom delimiter
 *   trim                    → Remove leading/trailing whitespace
 *   prefix(text)            → Prepend text
 *   suffix(text)            → Append text
 *   replace(find, repl)     → Simple string replace
 *   truncate(n)             → First n characters
 *   words(n)                → First n words
 *   default(fallback)       → Use fallback if empty
 *   urlencode               → URL-encoded
 *   strip_html              → Remove HTML tags
 *   reverse                 → Reverse string
 *   count_words             → Word count as number string
 *   initials                → First letter of each word (J.D.)
 */

export type TransformFn = (value: string, args: string[]) => string;

const TRANSFORMS: Record<string, TransformFn> = {
  uppercase: (v) => v.toUpperCase(),
  upper: (v) => v.toUpperCase(),
  lowercase: (v) => v.toLowerCase(),
  lower: (v) => v.toLowerCase(),
  capitalize: (v) =>
    v.replace(/\b\w/g, (c) => c.toUpperCase()),
  title: (v) =>
    v.replace(/\b\w/g, (c) => c.toUpperCase()),
  capitalize_first: (v) =>
    v.charAt(0).toUpperCase() + v.slice(1),
  slug: (v) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
  extract: (v, args) => {
    const index = parseInt(args[0] || "0", 10);
    const delimiter = args[1] || ",";
    const parts = v.split(delimiter).map((s) => s.trim());
    return parts[index] ?? v;
  },
  trim: (v) => v.trim(),
  prefix: (v, args) => (args[0] || "") + v,
  suffix: (v, args) => v + (args[0] || ""),
  replace: (v, args) => v.replaceAll(args[0] || "", args[1] || ""),
  truncate: (v, args) => {
    const n = parseInt(args[0] || "50", 10);
    return v.length > n ? v.slice(0, n) + "…" : v;
  },
  words: (v, args) => {
    const n = parseInt(args[0] || "5", 10);
    return v.split(/\s+/).slice(0, n).join(" ");
  },
  default: (v, args) => v.trim() || args[0] || "",
  urlencode: (v) => encodeURIComponent(v),
  strip_html: (v) => v.replace(/<[^>]*>/g, ""),
  reverse: (v) => v.split("").reverse().join(""),
  count_words: (v) => String(v.split(/\s+/).filter(Boolean).length),
  initials: (v) =>
    v
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase())
      .join(".") + ".",
};

/**
 * Parse a transform expression like "extract(1, |)" into { name, args }.
 */
function parseTransform(expr: string): { name: string; args: string[] } {
  const match = expr.match(/^(\w+)(?:\((.+)\))?$/);
  if (!match) return { name: expr, args: [] };
  const name = match[1].toLowerCase();
  const args = match[2]
    ? match[2].split(",").map((a) => a.trim().replace(/^['"]|['"]$/g, ""))
    : [];
  return { name, args };
}

/**
 * Apply a chain of transforms to a value.
 * Chain syntax: {variable:transform1:transform2(arg)}
 */
export function applyTransforms(value: string, transformChain: string): string {
  const transforms = transformChain.split(":").filter(Boolean);
  let result = value;
  for (const t of transforms) {
    const { name, args } = parseTransform(t);
    const fn = TRANSFORMS[name];
    if (fn) {
      result = fn(result, args);
    }
  }
  return result;
}

/**
 * Process all {variable:transform} patterns in a template string.
 * First applies transforms, then falls back to plain {variable} replacement.
 */
export function resolveTransformedVariables(
  template: string,
  vars: Record<string, string>
): string {
  // Match {variable_name:transform} or {variable_name:transform(args):transform2}
  return template.replace(
    /\{([a-z_][a-z0-9_]*):((?:[a-z_]+(?:\([^)]*\))?:?)+)\}/gi,
    (_match, varName: string, transformChain: string) => {
      const value = vars[varName] ?? vars[varName.toLowerCase()] ?? "";
      return applyTransforms(value, transformChain);
    }
  );
}

/**
 * Get list of all available transform names for documentation/UI.
 */
export function getAvailableTransforms(): { name: string; description: string; example: string }[] {
  return [
    { name: "uppercase", description: "Convert to UPPERCASE", example: "{city:uppercase} → NEW YORK" },
    { name: "lowercase", description: "Convert to lowercase", example: "{city:lowercase} → new york" },
    { name: "capitalize", description: "Title Case each word", example: "{city:capitalize} → New York" },
    { name: "capitalize_first", description: "Capitalize first letter only", example: "{text:capitalize_first}" },
    { name: "slug", description: "URL-safe slug", example: "{title:slug} → my-page-title" },
    { name: "extract(n)", description: "Extract nth part (0-indexed, comma-separated)", example: "{location:extract(0)} → City from 'City, State'" },
    { name: "extract(n, delim)", description: "Extract with custom delimiter", example: "{data:extract(1, |)}" },
    { name: "trim", description: "Remove whitespace", example: "{text:trim}" },
    { name: "prefix(text)", description: "Prepend text", example: "{slug:prefix(/services/)} → /services/plumbing" },
    { name: "suffix(text)", description: "Append text", example: "{city:suffix( Area)} → New York Area" },
    { name: "replace(find, replace)", description: "Replace text", example: "{text:replace(old, new)}" },
    { name: "truncate(n)", description: "Limit to n characters", example: "{description:truncate(100)}" },
    { name: "words(n)", description: "First n words", example: "{text:words(10)}" },
    { name: "default(fallback)", description: "Fallback if empty", example: "{phone:default(N/A)}" },
    { name: "urlencode", description: "URL-encode value", example: "{query:urlencode}" },
    { name: "strip_html", description: "Remove HTML tags", example: "{content:strip_html}" },
    { name: "initials", description: "First letter of each word", example: "{name:initials} → J.D." },
  ];
}
