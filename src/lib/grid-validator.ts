// Grid layout validation + live debug overlay helpers.
//
// Two responsibilities:
//  1. `analyzeElementorGrids` — static analysis of Elementor JSON to catch grid
//     containers that would RESERVE empty rows (the classic `repeat(2, 1fr)` /
//     `grid_rows_grid > 1` bug that leaves large blank whitespace bands). Used
//     by the pre-publish validator.
//  2. `GRID_DEBUG_SCRIPT` — a self-contained script injected into a preview
//     iframe that outlines every CSS grid, counts its ACTUAL rendered rows and
//     measures their heights, and flags reserved/empty rows in real time.

export interface GridWarning {
  /** Human-readable widget/element identifier. */
  path: string;
  /** Widget type (e.g. "container"). */
  widgetType: string;
  /** Why this grid is problematic. */
  reason: string;
  /** The offending track definition, when known. */
  detail?: string;
}

/** Pull a numeric "rows" count out of an Elementor grid_rows_grid setting. */
function readGridRows(setting: unknown): number | null {
  if (setting == null) return null;
  if (typeof setting === "number") return setting;
  if (typeof setting === "object") {
    const s = setting as { size?: unknown; sizes?: unknown[] };
    if (Array.isArray(s.sizes) && s.sizes.length > 1) return s.sizes.length;
    if (typeof s.size === "number") return s.size;
  }
  return null;
}

/**
 * Walk an Elementor JSON tree and collect every grid container that reserves
 * empty rows. A grid is flagged when it declares more than one explicit row
 * (`grid_rows_grid` > 1) OR uses grid display without `grid_auto_flow`, both of
 * which produce a fixed empty second row and unwanted whitespace.
 */
export function analyzeElementorGrids(tree: unknown): GridWarning[] {
  const warnings: GridWarning[] = [];
  if (!Array.isArray(tree)) return warnings;

  const walk = (el: any, path: string) => {
    if (!el || typeof el !== "object") return;
    const settings = el.settings ?? {};
    const isGrid =
      settings.container_type === "grid" ||
      settings.display === "grid" ||
      settings._display === "grid" ||
      settings.grid_columns_grid != null ||
      settings.grid_rows_grid != null;

    if (isGrid) {
      const rows = readGridRows(settings.grid_rows_grid);
      const label = settings._element_id || el.widgetType || el.elType || "container";
      const fullPath = `${path} › ${label}`;
      if (rows != null && rows > 1) {
        warnings.push({
          path: fullPath,
          widgetType: el.widgetType || el.elType || "container",
          reason: `Grid reserves ${rows} explicit rows — empty rows create blank whitespace.`,
          detail: `grid_rows_grid = ${rows}`,
        });
      } else if (settings.grid_auto_flow == null && rows == null) {
        warnings.push({
          path: fullPath,
          widgetType: el.widgetType || el.elType || "container",
          reason: "Grid has no auto-flow set — Elementor may reserve an empty second row.",
          detail: "grid_auto_flow missing",
        });
      }
    }

    for (const child of el.elements ?? []) walk(child, path === "root" ? (el.widgetType || el.elType || "root") : `${path}`);
  };

  (tree as any[]).forEach((el, i) => walk(el, `section ${i + 1}`));
  return warnings;
}

/**
 * Injected into a preview iframe. Outlines each CSS grid, badges it with the
 * actual rendered row count + per-row heights, and highlights any reserved
 * empty rows (rows whose children collectively have zero content height).
 * Idempotent — safe to call repeatedly. Call `__lovGridDebug(on)` to toggle.
 */
export const GRID_DEBUG_SCRIPT = String.raw`
(function () {
  if (window.__lovGridDebugInstalled) { return; }
  window.__lovGridDebugInstalled = true;
  var STYLE_ID = "__lov-grid-debug-style";
  var enabled = false;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = [
      ".lov-grid-outline{outline:2px dashed rgba(139,92,246,.9)!important;outline-offset:-2px!important;position:relative!important;}",
      ".lov-grid-badge{position:absolute;top:0;left:0;z-index:2147483647;background:#7c3aed;color:#fff;font:600 11px/1.3 ui-monospace,monospace;padding:3px 6px;border-radius:0 0 6px 0;pointer-events:none;white-space:pre;box-shadow:0 1px 4px rgba(0,0,0,.3);}",
      ".lov-grid-badge.warn{background:#dc2626;}",
      ".lov-grid-emptyrow{outline:2px solid rgba(220,38,38,.7)!important;background:repeating-linear-gradient(45deg,rgba(220,38,38,.12),rgba(220,38,38,.12) 6px,transparent 6px,transparent 12px)!important;}"
    ].join("");
    document.head.appendChild(s);
  }

  function clear() {
    document.querySelectorAll(".lov-grid-badge").forEach(function (b) { b.remove(); });
    document.querySelectorAll(".lov-grid-outline").forEach(function (e) { e.classList.remove("lov-grid-outline"); });
    document.querySelectorAll(".lov-grid-emptyrow").forEach(function (e) { e.classList.remove("lov-grid-emptyrow"); });
  }

  function analyze() {
    clear();
    if (!enabled) return { grids: 0, warnings: 0 };
    ensureStyle();
    var grids = 0, warnings = 0;
    var all = document.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var cs = getComputedStyle(el);
      if (cs.display !== "grid" && cs.display !== "inline-grid") continue;
      grids++;
      var rowTracks = (cs.gridTemplateRows || "").split(" ").filter(function (t) { return t && t !== "none"; });
      var rowCount = rowTracks.length || 1;
      var rowHeights = rowTracks.map(function (t) { return Math.round(parseFloat(t)) || 0; });
      // Detect reserved empty rows: explicit tracks beyond the number of visible children rows.
      var kids = Array.prototype.filter.call(el.children, function (c) {
        var r = c.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      var cols = (cs.gridTemplateColumns || "").split(" ").filter(function (t) { return t && t !== "none"; }).length || 1;
      var neededRows = Math.max(1, Math.ceil(kids.length / cols));
      var reserved = rowCount - neededRows;
      var isWarn = reserved > 0;
      if (isWarn) warnings++;

      if (getComputedStyle(el).position === "static") { el.style.position = "relative"; }
      el.classList.add("lov-grid-outline");

      var badge = document.createElement("div");
      badge.className = "lov-grid-badge" + (isWarn ? " warn" : "");
      badge.textContent =
        (isWarn ? "⚠ " : "▦ ") + cols + "×" + rowCount +
        " rows [" + rowHeights.join(",") + "px]" +
        (isWarn ? "\n" + reserved + " empty reserved row(s)" : "");
      el.appendChild(badge);
    }
    window.parent && window.parent.postMessage({ __lovGrid: true, grids: grids, warnings: warnings }, "*");
    return { grids: grids, warnings: warnings };
  }

  window.__lovGridDebug = function (on) {
    enabled = !!on;
    return analyze();
  };
})();
`;
