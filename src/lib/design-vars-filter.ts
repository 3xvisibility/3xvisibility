/**
 * Design / styling variable names that should NEVER appear as template variables.
 * These are CSS/styling properties, not content data.
 */
const DESIGN_VARS = new Set([
  "font_family","font_size","font_weight","font_color","font_style",
  "text_color","text_size","text_weight","text_transform","text_align",
  "background","background_color","background_image","background_gradient",
  "bg_color","bg_image","bg_gradient",
  "primary_color","accent_color","secondary_color","color","heading_color",
  "border_color","border_radius","border_width","border_style",
  "shadow","box_shadow","text_shadow",
  "margin","padding","gap","spacing",
  "width","height","max_width","min_height",
  "opacity","z_index","display","position",
  "line_height","letter_spacing","word_spacing",
  "gradient","overlay","overlay_color","overlay_opacity",
  "radius","rounded","transition","animation",
  "icon_color","icon_size","btn_color","btn_bg","button_color","button_bg",
  "header_bg","footer_bg","section_bg","card_bg","hero_bg",
  "link_color","hover_color",
  "container_width","container_padding","section_padding",
  "heading_size","body_size","cta_color","cta_bg",
  "font","typography","theme_color","theme",
]);

/**
 * Returns true if a variable name (without braces) is a design/styling variable.
 */
export function isDesignVariable(varName: string): boolean {
  return DESIGN_VARS.has(varName.replace(/[{}]/g, "").toLowerCase().trim());
}

/**
 * Filters an array of variable strings, removing any design/styling variables.
 * Variables can be with or without braces: "{font_color}" or "font_color".
 */
export function filterDesignVars(vars: string[]): string[] {
  return vars.filter(v => !isDesignVariable(v));
}
