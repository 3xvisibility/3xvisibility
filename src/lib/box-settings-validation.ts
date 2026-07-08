// Shared validation for boxed content-width + gutter settings across the single
// editor (ContainerWidthControl) and the bulk dialog (BulkBoxSettingsDialog).
//
// Rules mirror the server clamps: width 320–1920px, gutter 0–200px. In addition
// we guard against *conflicting* values where the horizontal gutters would eat
// so much of the box that the remaining content is unusably narrow.

export const MIN_WIDTH = 320;
export const MAX_WIDTH = 1920;
export const MAX_GUTTER = 200;
/** Minimum usable content width after subtracting both side gutters. */
export const MIN_CONTENT = 200;

/** Representative viewport widths used to evaluate fluid (blank) breakpoints. */
export const CANVAS: Record<DeviceKey, number> = {
  desktop: 1440,
  tablet: 834,
  mobile: 390,
};

export type DeviceKey = "desktop" | "tablet" | "mobile";

export interface BoxValues {
  /** Effective desktop box width in px (null when boxing is disabled/inherited). */
  desktopWidth: number | null;
  tabletWidth: number | null;
  mobileWidth: number | null;
  gutterDesktop: number | null;
  gutterTablet: number | null;
  gutterMobile: number | null;
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

const DEVICE_LABEL: Record<DeviceKey, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

/**
 * Validate a set of box values. `boxingEnabled` is false when the item is set to
 * "Full width" or "Inherit" — in that case widths are irrelevant but gutters are
 * still checked against the device viewport.
 */
export function validateBoxSettings(values: BoxValues, boxingEnabled: boolean): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const widths: Record<DeviceKey, number | null> = {
    desktop: values.desktopWidth,
    tablet: values.tabletWidth,
    mobile: values.mobileWidth,
  };
  const gutters: Record<DeviceKey, number | null> = {
    desktop: values.gutterDesktop,
    tablet: values.gutterTablet,
    mobile: values.gutterMobile,
  };

  (Object.keys(CANVAS) as DeviceKey[]).forEach((d) => {
    const w = widths[d];
    const g = gutters[d];
    const label = DEVICE_LABEL[d];

    // Width bounds (only when a fixed width is provided).
    if (w != null) {
      if (w < MIN_WIDTH) errors.push(`${label} width must be at least ${MIN_WIDTH}px.`);
      else if (w > MAX_WIDTH) errors.push(`${label} width can't exceed ${MAX_WIDTH}px.`);
    }

    // Gutter bounds.
    if (g != null) {
      if (g < 0) errors.push(`${label} gutter must be 0 or more.`);
      else if (g > MAX_GUTTER) errors.push(`${label} gutter can't exceed ${MAX_GUTTER}px.`);
    }

    // Conflict: gutters eat too much of the box.
    if (g != null && g > 0) {
      // For fixed-width boxes use that width; for fluid, use the device canvas.
      const basis = boxingEnabled && w != null ? w : CANVAS[d];
      const remaining = basis - g * 2;
      if (remaining < MIN_CONTENT) {
        errors.push(
          `${label}: a ${g}px gutter leaves only ${Math.max(remaining, 0)}px of content on a ${basis}px band — keep at least ${MIN_CONTENT}px (reduce the gutter or increase the width).`,
        );
      } else if (remaining < MIN_CONTENT * 1.5) {
        warnings.push(`${label}: content will be quite narrow (${remaining}px) with a ${g}px gutter.`);
      }
    }
  });

  // Responsive sanity: smaller breakpoints shouldn't be wider than desktop.
  if (boxingEnabled && widths.desktop != null) {
    if (widths.tablet != null && widths.tablet > widths.desktop) {
      warnings.push("Tablet width is larger than desktop width — unusual, double-check.");
    }
    if (widths.mobile != null && widths.mobile > widths.desktop) {
      warnings.push("Mobile width is larger than desktop width — unusual, double-check.");
    }
  }
  if (widths.mobile != null && widths.tablet != null && widths.mobile > widths.tablet) {
    warnings.push("Mobile width is larger than tablet width — unusual, double-check.");
  }

  return { errors, warnings };
}

/** Parse an optional integer from a text field; blank/invalid → null. */
export function parseOptInt(val: string): number | null {
  const t = val.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}
