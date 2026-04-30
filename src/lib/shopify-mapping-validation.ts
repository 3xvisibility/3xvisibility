/**
 * Shopify field-mapping validation.
 *
 * Validates two things:
 *  1. The mapping itself (token shape, allowed status values, numeric fields).
 *  2. The mapping resolved against an actual data row (required fields populated,
 *     numeric fields parseable, image URLs valid).
 *
 * Used by:
 *  - ShopifyFieldMappingEditor (live warnings while the user types)
 *  - publish-pages edge function (hard errors that mark the page failed
 *    instead of letting Shopify reject the request)
 */

export type Severity = "error" | "warning";

export interface MappingIssue {
  field: string;
  severity: Severity;
  message: string;
}

export interface ShopifyFieldMapLike {
  title?: string;
  body_html?: string;
  handle?: string;
  vendor?: string;
  product_type?: string;
  tags?: string;
  price?: string;
  sku?: string;
  images?: string;
  seo_title?: string;
  seo_description?: string;
  status?: string;
}

export interface ShopifyVariantMapLike {
  option1?: string;
  option2?: string;
  option3?: string;
  compare_at_price?: string;
  inventory_quantity?: string;
  weight?: string;
  weight_unit?: string;
  barcode?: string;
}

export interface ShopifyMetafieldMapLike {
  namespace: string;
  key: string;
  type: string;
  value: string;
}

const TOKEN_RE = /\{([a-zA-Z0-9_.]+)\}/g;
const ALLOWED_STATUS = new Set(["active", "draft", "archived"]);
const ALLOWED_WEIGHT_UNIT = new Set(["g", "kg", "oz", "lb"]);
const ALLOWED_META_TYPES = new Set([
  "single_line_text_field",
  "multi_line_text_field",
  "number_integer",
  "number_decimal",
  "boolean",
  "url",
  "json",
  "date",
  "date_time",
  "color",
  "rating",
  "weight",
  "volume",
  "dimension",
]);

function extractTokens(s: string | undefined): string[] {
  if (!s) return [];
  const out: string[] = [];
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(s)) !== null) out.push(m[1]);
  return out;
}

function hasUnclosedBrace(s: string | undefined): boolean {
  if (!s) return false;
  let depth = 0;
  for (const ch of s) {
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (depth < 0) return true;
  }
  return depth !== 0;
}

/**
 * Validate the mapping definition itself (independent of any data row).
 * Catches typos, unknown variables, malformed tokens, invalid enum values, etc.
 */
export function validateMapping(opts: {
  fieldMap: ShopifyFieldMapLike;
  variantMap: ShopifyVariantMapLike;
  metafields: ShopifyMetafieldMapLike[];
  /** Available variable names (without braces). If provided, unknown tokens become warnings. */
  knownVariables?: string[];
}): MappingIssue[] {
  const issues: MappingIssue[] = [];
  const { fieldMap, variantMap, metafields, knownVariables } = opts;
  const knownSet = knownVariables ? new Set(knownVariables) : null;

  const checkTokens = (field: string, value: string | undefined) => {
    if (!value) return;
    if (hasUnclosedBrace(value)) {
      issues.push({ field, severity: "error", message: "Unclosed { } in template — fix the braces." });
    }
    if (!knownSet) return;
    for (const tok of extractTokens(value)) {
      const root = tok.split(".")[0];
      if (!knownSet.has(root) && !knownSet.has(tok)) {
        issues.push({
          field,
          severity: "warning",
          message: `Unknown variable {${tok}} — will resolve to an empty string at publish time.`,
        });
      }
    }
  };

  // Required: title
  if (!fieldMap.title || !fieldMap.title.trim()) {
    issues.push({ field: "title", severity: "error", message: "Product title mapping is required." });
  }

  // Token validity for every field
  (Object.keys(fieldMap) as (keyof ShopifyFieldMapLike)[]).forEach((k) =>
    checkTokens(String(k), fieldMap[k]),
  );
  (Object.keys(variantMap) as (keyof ShopifyVariantMapLike)[]).forEach((k) =>
    checkTokens(`variant.${String(k)}`, variantMap[k]),
  );

  // Status enum
  if (fieldMap.status && !fieldMap.status.includes("{")) {
    if (!ALLOWED_STATUS.has(fieldMap.status.trim().toLowerCase())) {
      issues.push({
        field: "status",
        severity: "error",
        message: `Status must be one of: ${[...ALLOWED_STATUS].join(", ")}.`,
      });
    }
  }

  // Numeric literals (price, compare_at_price, inventory, weight)
  const numericChecks: { field: string; value?: string; integer?: boolean }[] = [
    { field: "price", value: fieldMap.price },
    { field: "variant.compare_at_price", value: variantMap.compare_at_price },
    { field: "variant.inventory_quantity", value: variantMap.inventory_quantity, integer: true },
    { field: "variant.weight", value: variantMap.weight },
  ];
  for (const { field, value, integer } of numericChecks) {
    if (!value || value.includes("{")) continue;
    const n = integer ? Number.parseInt(value, 10) : Number.parseFloat(value);
    if (!Number.isFinite(n) || (integer && !/^-?\d+$/.test(value.trim()))) {
      issues.push({
        field,
        severity: "error",
        message: `Must be a ${integer ? "whole number" : "number"} (got "${value}").`,
      });
    }
  }

  // Weight unit enum
  if (variantMap.weight_unit && !variantMap.weight_unit.includes("{")) {
    if (!ALLOWED_WEIGHT_UNIT.has(variantMap.weight_unit.trim().toLowerCase())) {
      issues.push({
        field: "variant.weight_unit",
        severity: "error",
        message: `Weight unit must be one of: ${[...ALLOWED_WEIGHT_UNIT].join(", ")}.`,
      });
    }
  }

  // Handle: lower-case, hyphen-friendly only (when literal)
  if (fieldMap.handle && !fieldMap.handle.includes("{")) {
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(fieldMap.handle.trim())) {
      issues.push({
        field: "handle",
        severity: "warning",
        message: "Literal handles should be lowercase letters, numbers and hyphens only.",
      });
    }
  }

  // Metafields
  metafields.forEach((m, i) => {
    const where = `metafields[${i}]`;
    if (!m.namespace || !/^[a-zA-Z0-9_-]{2,20}$/.test(m.namespace)) {
      issues.push({
        field: `${where}.namespace`,
        severity: "error",
        message: "Namespace must be 2-20 chars: letters, digits, _ or -.",
      });
    }
    if (!m.key || !/^[a-zA-Z0-9_-]{2,30}$/.test(m.key)) {
      issues.push({
        field: `${where}.key`,
        severity: "error",
        message: "Key must be 2-30 chars: letters, digits, _ or -.",
      });
    }
    if (!ALLOWED_META_TYPES.has(m.type)) {
      issues.push({
        field: `${where}.type`,
        severity: "warning",
        message: `Unrecognized metafield type "${m.type}". Shopify may reject it.`,
      });
    }
    checkTokens(`${where}.value`, m.value);
  });

  return issues;
}

function interpolate(template: string | undefined, row: Record<string, unknown>): string {
  if (!template) return "";
  return template.replace(/\{([a-zA-Z0-9_.]+)\}/g, (_m, key) => {
    const path = String(key).split(".");
    let cur: unknown = row;
    for (const p of path) {
      if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p];
      } else return "";
    }
    return cur == null ? "" : String(cur);
  });
}

/**
 * Validate the mapping when applied to a specific row.
 * Errors here mean publishing this row will be rejected — caller should mark the
 * page failed before touching Shopify.
 */
export function validateResolved(opts: {
  fieldMap: ShopifyFieldMapLike;
  variantMap: ShopifyVariantMapLike;
  metafields: ShopifyMetafieldMapLike[];
  row: Record<string, unknown>;
}): MappingIssue[] {
  const { fieldMap, variantMap, metafields, row } = opts;
  const issues: MappingIssue[] = [];

  const title = interpolate(fieldMap.title, row).trim();
  if (!title) {
    issues.push({ field: "title", severity: "error", message: "Resolved product title is empty." });
  } else if (title.length > 255) {
    issues.push({ field: "title", severity: "error", message: "Product title exceeds 255 chars." });
  }

  const price = interpolate(fieldMap.price, row).trim();
  if (price) {
    const n = Number.parseFloat(price);
    if (!Number.isFinite(n) || n < 0) {
      issues.push({ field: "price", severity: "error", message: `Resolved price "${price}" is not a valid non-negative number.` });
    }
  }

  const inv = interpolate(variantMap.inventory_quantity, row).trim();
  if (inv && (!/^-?\d+$/.test(inv) || !Number.isFinite(Number.parseInt(inv, 10)))) {
    issues.push({ field: "variant.inventory_quantity", severity: "error", message: `Resolved inventory "${inv}" is not a whole number.` });
  }

  const weight = interpolate(variantMap.weight, row).trim();
  if (weight && !Number.isFinite(Number.parseFloat(weight))) {
    issues.push({ field: "variant.weight", severity: "error", message: `Resolved weight "${weight}" is not a number.` });
  }

  const status = interpolate(fieldMap.status, row).trim().toLowerCase();
  if (status && !ALLOWED_STATUS.has(status)) {
    issues.push({ field: "status", severity: "error", message: `Resolved status "${status}" is not allowed.` });
  }

  const images = interpolate(fieldMap.images, row).trim();
  if (images) {
    const urls = images.split(",").map((s) => s.trim()).filter(Boolean);
    for (const u of urls) {
      try {
        const parsed = new URL(u);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error("scheme");
        }
      } catch {
        issues.push({ field: "images", severity: "error", message: `Image URL "${u}" is not a valid http(s) URL.` });
      }
    }
  }

  return issues;
}
