// ─────────────────────────────────────────────────────────────────────────
// Video brand palette — EDIT THIS FILE to change colors. No need to touch
// MainVideo.tsx or any scene. All scenes import `C` (re-exported from
// MainVideo) which points here.
//
// Tips:
//  - `primary`, `primaryGlow`, `accent` drive logos, gradients and highlights.
//  - The rgba "tint" helpers below are derived from primary/accent so soft
//    glows and grids stay in sync automatically. If you change primary/accent,
//    update PRIMARY_RGB / ACCENT_RGB to the matching "r,g,b" values.
// ─────────────────────────────────────────────────────────────────────────

// RGB channels of `primary` and `accent` (used for translucent tints/glows).
export const PRIMARY_RGB = "94,218,12"; // #5EDA0C
export const ACCENT_RGB = "158,245,74"; // #9EF54A

export const C = {
  bg: "#070B14",
  bgSoft: "#0C1322",
  card: "#111B30",
  border: `rgba(${ACCENT_RGB},0.20)`,
  primary: "#5EDA0C",
  primaryGlow: "#8CF745",
  accent: "#9EF54A",
  text: "#E6EDF7",
  muted: "#7A8AA6",
  success: "#34D399",
};

// Convenience translucent tints derived from the palette.
export const tintPrimary = (alpha: number) => `rgba(${PRIMARY_RGB},${alpha})`;
export const tintAccent = (alpha: number) => `rgba(${ACCENT_RGB},${alpha})`;
