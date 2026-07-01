import { describe, it, expect } from "vitest";
import { htmlToElementor, type ElementorElement } from "./elementor-engine";
import { mappingFixtures } from "./__fixtures__/mapping-fixtures";

/**
 * Fixture-driven regression suite for the Elementor mapping engine.
 *
 * This test iterates over every entry in `mapping-fixtures.ts`, so adding a new
 * grid/card/testimonial edge case only requires appending a fixture there — no
 * new test code needed. Assertions are declarative (widget counts + settings
 * substrings + container layouts) to keep them robust against internal engine
 * refactors.
 */

/** Count every native widget type produced across the tree. */
function widgetCounts(tree: ElementorElement[]): Record<string, number> {
  const counts: Record<string, number> = {};
  const walk = (list: ElementorElement[]) => {
    for (const n of list) {
      if (n.elType === "widget" && n.widgetType) {
        counts[n.widgetType] = (counts[n.widgetType] || 0) + 1;
      }
      if (n.elements?.length) walk(n.elements as ElementorElement[]);
    }
  };
  walk(tree);
  return counts;
}

/** Count containers by layout type across the tree. */
function containerLayouts(tree: ElementorElement[]): { grid: number; row: number } {
  const out = { grid: 0, row: 0 };
  const walk = (list: ElementorElement[]) => {
    for (const n of list) {
      if (n.elType === "container") {
        const s = n.settings || {};
        if (s.container_type === "grid") out.grid++;
        else if (s.flex_direction === "row") out.row++;
      }
      if (n.elements?.length) walk(n.elements as ElementorElement[]);
    }
  };
  walk(tree);
  return out;
}

/** First widget of a type, for settings-substring checks. */
function findWidget(tree: ElementorElement[], type: string): ElementorElement | undefined {
  for (const n of tree) {
    if (n.elType === "widget" && n.widgetType === type) return n;
    if (n.elements?.length) {
      const nested = findWidget(n.elements as ElementorElement[], type);
      if (nested) return nested;
    }
  }
  return undefined;
}

const byGroup = mappingFixtures.reduce<Record<string, typeof mappingFixtures>>((acc, f) => {
  (acc[f.group] ||= []).push(f);
  return acc;
}, {});

for (const [group, fixtures] of Object.entries(byGroup)) {
  describe(`elementor mapping fixtures: ${group}`, () => {
    for (const fx of fixtures) {
      const runner = fx.knownGap ? it.fails : it;
      runner(`${fx.id} — ${fx.description}`, () => {
        const tree = htmlToElementor(fx.html);
        const counts = widgetCounts(tree);
        const layouts = containerLayouts(tree);

        for (const w of fx.widgets ?? []) {
          const actual = counts[w.type] ?? 0;
          if (typeof w.exactly === "number") {
            expect(actual, `widget "${w.type}" count`).toBe(w.exactly);
          } else {
            expect(actual, `widget "${w.type}" count`).toBeGreaterThanOrEqual(w.atLeast ?? 1);
          }
          if (w.settingsInclude?.length) {
            const found = findWidget(tree, w.type);
            const serialized = JSON.stringify(found?.settings ?? {});
            for (const needle of w.settingsInclude) {
              expect(serialized, `widget "${w.type}" settings`).toContain(needle);
            }
          }
        }

        const c = fx.containers;
        if (c) {
          if (typeof c.gridExactly === "number") {
            expect(layouts.grid, "grid container count").toBe(c.gridExactly);
          } else if (typeof c.gridAtLeast === "number") {
            expect(layouts.grid, "grid container count").toBeGreaterThanOrEqual(c.gridAtLeast);
          }
          if (typeof c.rowAtLeast === "number") {
            expect(layouts.row, "flex-row container count").toBeGreaterThanOrEqual(c.rowAtLeast);
          }
        }
      });
    }
  });
}
