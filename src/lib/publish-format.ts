/**
 * v1 output mode.
 *
 * For version 1 the whole product ships a single output format: raw HTML/CSS/JS.
 * Every template — marketplace, imported from a URL, scanned from a connected
 * website, or designed in the builder — is kept as real code so the published
 * page is a 1:1 copy of the preview.
 *
 * Elementor and Shopify conversions still exist in the codebase but are hidden
 * and never selected while this flag is on. Flip it to `false` to bring the
 * platform pickers back.
 */
export const HTML_ONLY_MODE = true;

/** The only publish format used while {@link HTML_ONLY_MODE} is on. */
export const V1_PUBLISH_FORMAT = "html" as const;
