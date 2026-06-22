// Native Elementor JSON variable resolver.
//
// Walks an Elementor `_elementor_data` structure (an array of section/column/
// widget elements) and replaces `{variable}` placeholders inside every string
// setting with resolved AI / row content. The Elementor structure itself is
// kept 100% intact so the published page is pixel-identical to the source
// template and remains fully editable inside Elementor on the target site.

export type ElementorNode = {
  id?: string;
  elType?: string;
  widgetType?: string;
  settings?: Record<string, unknown>;
  elements?: ElementorNode[];
  [key: string]: unknown;
};

const PLACEHOLDER_RE = /\{([a-z0-9_]+)\}/gi;

/** Extract every distinct `{variable}` name found anywhere in an Elementor tree. */
export function extractElementorVariables(data: unknown): string[] {
  const found = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      let m: RegExpExecArray | null;
      PLACEHOLDER_RE.lastIndex = 0;
      while ((m = PLACEHOLDER_RE.exec(value)) !== null) found.add(m[1].toLowerCase());
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (value && typeof value === "object") {
      Object.values(value as Record<string, unknown>).forEach(visit);
    }
  };
  visit(data);
  return [...found];
}

function resolvePlaceholders(
  text: string,
  values: Record<string, string>,
): string {
  return text.replace(PLACEHOLDER_RE, (full, name: string) => {
    const key = String(name).toLowerCase();
    const val = values[key];
    return val !== undefined && val !== null && String(val).trim() !== ""
      ? String(val)
      : full; // leave unresolved placeholders untouched
  });
}

const URL_KEYS = new Set(["url", "src", "href", "link"]);

/**
 * Deep-clone an Elementor tree and replace `{variable}` placeholders inside all
 * string settings using the provided row/AI values. Detected `__dynamic__`
 * settings blocks whose placeholder resolves are baked into the static setting
 * and removed so the page is self-contained and editable without extra plugins.
 */
export function deepReplaceElementorVariables(
  data: unknown,
  values: Record<string, string>,
  opts: { fallbackImage?: string } = {},
): unknown {
  const lowerValues: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v !== undefined && v !== null) lowerValues[k.toLowerCase()] = String(v);
  }

  const transform = (value: unknown, keyHint?: string): unknown => {
    if (typeof value === "string") {
      let out = resolvePlaceholders(value, lowerValues);
      // Replace leftover placeholder image URLs with a fallback image if given.
      if (
        opts.fallbackImage &&
        keyHint &&
        URL_KEYS.has(keyHint.toLowerCase()) &&
        (PLACEHOLDER_RE.test(out) || out.trim() === "")
      ) {
        PLACEHOLDER_RE.lastIndex = 0;
        out = opts.fallbackImage;
      }
      return out;
    }
    if (Array.isArray(value)) {
      return value.map((v) => transform(v));
    }
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      // Bake resolved Elementor dynamic tags into static values, then drop them.
      if (obj.__dynamic__ && typeof obj.__dynamic__ === "object") {
        const dyn = obj.__dynamic__ as Record<string, unknown>;
        for (const dynKey of Object.keys(dyn)) {
          const raw = dyn[dynKey];
          if (typeof raw === "string") {
            const resolved = resolvePlaceholders(raw, lowerValues);
            if (!PLACEHOLDER_RE.test(resolved)) {
              obj[dynKey] = resolved;
              delete dyn[dynKey];
            }
            PLACEHOLDER_RE.lastIndex = 0;
          }
        }
        if (Object.keys(dyn).length === 0) delete obj.__dynamic__;
      }
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        result[k] = transform(v, k);
      }
      return result;
    }
    return value;
  };

  const cloned = JSON.parse(JSON.stringify(data));
  return transform(cloned);
}

/** Normalize stored elementor_data (string or array/object) into a JSON string. */
export function stringifyElementorData(data: unknown): string {
  if (typeof data === "string") return data;
  return JSON.stringify(data);
}
