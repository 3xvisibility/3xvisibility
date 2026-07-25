/**
 * Server-side mirror of src/lib/variable-format.ts. Keep the two files in
 * sync: edge functions can't import from `src/`.
 */

export type VariableFormat = "url" | "email" | "phone" | "color" | "number" | "text";

export interface FormatIssue {
  name: string;
  value: string;
  expected: VariableFormat;
  reason: string;
}

const URL_HINT = /(^|_)(url|link|href|website|site|homepage)(_|$)/i;
const EMAIL_HINT = /(^|_)(email|mail|inbox)(_|$)/i;
const PHONE_HINT = /(^|_)(phone|tel|mobile|whatsapp|contact_number)(_|$)/i;
const COLOR_HINT = /(^|_)(hex|color|colour|bg_color|text_color)(_|$)/i;
const NUMBER_HINT = /(^|_)(count|qty|quantity|price|amount|year|age|rating)(_|$)/i;
const CTA_URL_HINT = /^cta_(url|link|href)(_\d+)?$/i;
const CTA_LABEL_HINT = /^cta_(label|text|button)(_\d+)?$/i;

export function detectVariableFormat(name: string): VariableFormat {
  const n = name.trim();
  if (!n) return "text";
  if (CTA_URL_HINT.test(n) || URL_HINT.test(n)) return "url";
  if (EMAIL_HINT.test(n)) return "email";
  if (PHONE_HINT.test(n)) return "phone";
  if (COLOR_HINT.test(n)) return "color";
  if (NUMBER_HINT.test(n)) return "number";
  if (CTA_LABEL_HINT.test(n)) return "text";
  return "text";
}

export function validateVariableValue(name: string, rawValue: string): FormatIssue | null {
  const value = (rawValue ?? "").trim();
  if (!value) return null;
  const expected = detectVariableFormat(name);
  switch (expected) {
    case "url": {
      if (/^#[\w-]+$/.test(value)) return null;
      if (/^\/(?!\/)[^\s]*$/.test(value)) return null;
      if (/^\/\/[^\s]+$/.test(value)) return null;
      try {
        const u = new URL(value);
        if (!/^https?:$/i.test(u.protocol)) {
          return { name, value, expected, reason: `Only http(s) URLs are allowed (got ${u.protocol.replace(":", "")})` };
        }
        if (!u.hostname || !/\./.test(u.hostname)) {
          return { name, value, expected, reason: "URL is missing a valid hostname (e.g. example.com)" };
        }
        return null;
      } catch {
        return { name, value, expected, reason: "Not a valid URL — use https://example.com, /path, #anchor, or //cdn.host/…" };
      }
    }
    case "email": {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
      return ok ? null : { name, value, expected, reason: "Not a valid email address (expected name@domain.tld)" };
    }
    case "phone": {
      const digits = value.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 15) {
        return { name, value, expected, reason: "Phone number should contain 7–15 digits" };
      }
      if (!/^\+?[\d\s().-]+$/.test(value)) {
        return { name, value, expected, reason: "Phone number contains unsupported characters" };
      }
      return null;
    }
    case "color": {
      const ok = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) ||
        /^(rgb|rgba|hsl|hsla)\s*\([^)]+\)$/i.test(value);
      return ok ? null : { name, value, expected, reason: "Expected a hex (#3B82F6) or rgb()/hsl() color value" };
    }
    case "number": {
      const ok = /^-?\d+(\.\d+)?$/.test(value);
      return ok ? null : { name, value, expected, reason: "Expected a numeric value" };
    }
    default:
      return null;
  }
}

export function validateVariableFormats(
  placeholderNames: Iterable<string>,
  vars: Record<string, string>,
): FormatIssue[] {
  const issues: FormatIssue[] = [];
  const lookup: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) lookup[k.toLowerCase()] = v ?? "";
  const seen = new Set<string>();
  for (const raw of placeholderNames) {
    const name = raw.toLowerCase();
    if (seen.has(name)) continue;
    seen.add(name);
    if (!(name in lookup)) continue;
    const issue = validateVariableValue(name, lookup[name]);
    if (issue) issues.push(issue);
  }
  return issues;
}
