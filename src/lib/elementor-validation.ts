// Validation for native Elementor JSON template uploads.
// Used client-side (and reusable server-side) to reject malformed files
// with clear, user-friendly error messages.

export interface ElementorValidationResult {
  /** Normalized Elementor data array (the actual elements). */
  elementorData: unknown[];
  /** Detected variable placeholders ({variable}). */
  variables: string[];
  /** Optional name from the file. */
  name?: string;
  /** Pass-through extras when present. */
  raw: Record<string, unknown>;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function looksLikeElementorElement(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const n = node as Record<string, unknown>;
  // Elementor elements carry an elType (section/column/widget/container).
  return typeof n.elType === "string" || typeof n.widgetType === "string" || Array.isArray(n.elements);
}

/**
 * Validate and normalize a raw parsed JSON value into Elementor data.
 * Throws an Error with a clear message when the structure is invalid.
 */
export function validateElementorData(data: unknown): ElementorValidationResult {
  if (data === null || typeof data !== "object") {
    throw new Error("Invalid file: expected a JSON object or array of Elementor elements.");
  }

  const obj = (Array.isArray(data) ? {} : data) as Record<string, unknown>;

  // Accept: (a) our export with elementor_data, (b) raw Elementor export { content: [...] },
  //         (c) a bare array of elements.
  let elementorData: unknown =
    "elementor_data" in obj
      ? obj.elementor_data
      : Array.isArray((obj as Record<string, unknown>).content)
        ? (obj as Record<string, unknown>).content
        : Array.isArray(data)
          ? data
          : null;

  // elementor_data may itself be a JSON string.
  if (typeof elementorData === "string") {
    try {
      elementorData = JSON.parse(elementorData);
    } catch {
      throw new Error("Invalid Elementor data: the elementor_data field is not valid JSON.");
    }
  }

  if (!Array.isArray(elementorData)) {
    throw new Error(
      "Invalid Elementor template: missing a top-level element array (expected \"content\" or \"elementor_data\").",
    );
  }

  if (elementorData.length === 0) {
    throw new Error("Invalid Elementor template: the template contains no elements.");
  }

  if (!elementorData.some(looksLikeElementorElement)) {
    throw new Error(
      "Invalid Elementor template: elements do not look like Elementor nodes (missing elType/widgetType/elements).",
    );
  }

  const json = JSON.stringify(elementorData);
  const variables = [
    ...new Set((json.match(/\{([a-z0-9_]+)\}/gi) || []).map((m) => m.slice(1, -1).toLowerCase())),
  ];

  return {
    elementorData,
    variables,
    name: typeof obj.name === "string" ? obj.name : undefined,
    raw: obj,
  };
}

/**
 * Parse and validate a File as an Elementor template (client-side).
 */
export async function validateElementorFile(file: File): Promise<ElementorValidationResult> {
  if (file.size > MAX_BYTES) {
    throw new Error("File too large: Elementor templates must be under 5MB.");
  }
  if (!/\.json$/i.test(file.name) && file.type && !/json/i.test(file.type)) {
    throw new Error("Invalid file type: please upload a .json Elementor template.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("Failed to parse file: please ensure it is valid JSON.");
  }
  return validateElementorData(parsed);
}

/** True when the parsed JSON is (or contains) Elementor data. */
export function isElementorPayload(data: unknown): boolean {
  try {
    validateElementorData(data);
    return true;
  } catch {
    return false;
  }
}
