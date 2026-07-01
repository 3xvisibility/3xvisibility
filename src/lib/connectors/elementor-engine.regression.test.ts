import { describe, it, expect } from "vitest";
import {
  htmlToElementor,
  buildElementorDebugReport,
  type ElementorElement,
} from "./elementor-engine";

/** Walk the whole tree and count every native widget type produced. */
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

/** Count containers by layout type across the whole tree. */
function containerLayouts(tree: ElementorElement[]): { grid: number; row: number; column: number } {
  const out = { grid: 0, row: 0, column: 0 };
  const walk = (list: ElementorElement[]) => {
    for (const n of list) {
      if (n.elType === "container") {
        const s = n.settings || {};
        if (s.container_type === "grid") out.grid++;
        else if (s.flex_direction === "row") out.row++;
        else out.column++;
      }
      if (n.elements?.length) walk(n.elements as ElementorElement[]);
    }
  };
  walk(tree);
  return out;
}

/** Find the first widget of a given type anywhere in the tree. */
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

describe("elementor-engine regression: grid layouts", () => {
  it("maps a CSS grid (display:grid) to a native grid container", () => {
    const html = `
      <section>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px">
          <div class="card"><h3>One</h3><p>First card body text.</p></div>
          <div class="card"><h3>Two</h3><p>Second card body text.</p></div>
          <div class="card"><h3>Three</h3><p>Third card body text.</p></div>
        </div>
      </section>`;
    const tree = htmlToElementor(html);
    const layouts = containerLayouts(tree);
    expect(layouts.grid).toBeGreaterThanOrEqual(1);
  });

  it("does NOT create a grid container for a plain flex row", () => {
    const html = `
      <section>
        <div style="display:flex;flex-direction:row;gap:16px">
          <div><p>Left</p></div>
          <div><p>Right</p></div>
        </div>
      </section>`;
    const tree = htmlToElementor(html);
    const layouts = containerLayouts(tree);
    expect(layouts.grid).toBe(0);
  });
});

describe("elementor-engine regression: card / icon / image combinations", () => {
  it("maps an image + title/text card to a native image-box", () => {
    const html = `
      <div class="card">
        <img src="https://example.com/photo.jpg" alt="Photo" />
        <h3>Great Service</h3>
        <p>We deliver quality results every time.</p>
      </div>`;
    const tree = htmlToElementor(html);
    const counts = widgetCounts(tree);
    expect(counts["image-box"]).toBeGreaterThanOrEqual(1);
    const box = findWidget(tree, "image-box");
    expect(box?.settings?.title_text).toContain("Great Service");
  });

  it("maps an icon + title/text feature card to a native icon-box", () => {
    const html = `
      <div class="feature-box">
        <i class="icon fas fa-rocket"></i>
        <h4>Fast Delivery</h4>
        <p>Ship your pages in seconds.</p>
      </div>`;
    const tree = htmlToElementor(html);
    const counts = widgetCounts(tree);
    expect(counts["icon-box"]).toBeGreaterThanOrEqual(1);
    const box = findWidget(tree, "icon-box");
    expect(box?.settings?.title_text).toContain("Fast Delivery");
  });

  it("maps a repeating icon+text feature list to a native icon-list", () => {
    const html = `
      <div class="features">
        <div><i class="icon fa fa-check"></i><span>Secure hosting</span></div>
        <div><i class="icon fa fa-check"></i><span>Free migrations</span></div>
        <div><i class="icon fa fa-check"></i><span>24/7 support</span></div>
        <div><i class="icon fa fa-check"></i><span>Daily backups</span></div>
      </div>`;
    const tree = htmlToElementor(html);
    const counts = widgetCounts(tree);
    expect(counts["icon-list"]).toBeGreaterThanOrEqual(1);
    const list = findWidget(tree, "icon-list");
    expect((list?.settings?.icon_list as unknown[])?.length).toBeGreaterThanOrEqual(4);
  });
});

describe("elementor-engine regression: testimonials", () => {
  it("maps a testimonial card to a native testimonial widget", () => {
    const html = `
      <div class="testimonial">
        <img src="https://example.com/avatar.jpg" alt="Jane" />
        <p class="content">This product changed how we work.</p>
        <div class="name">Jane Doe</div>
        <div class="role">CEO, Acme</div>
      </div>`;
    const tree = htmlToElementor(html);
    const counts = widgetCounts(tree);
    expect(counts["testimonial"]).toBe(1);
    const t = findWidget(tree, "testimonial");
    expect(t?.settings?.testimonial_name).toContain("Jane Doe");
    expect(t?.settings?.testimonial_content).toContain("changed how we work");
  });

  it("maps a grid of testimonials to individual testimonial widgets", () => {
    const html = `
      <section>
        <div style="display:grid;grid-template-columns:1fr 1fr">
          <div class="testimonial"><p class="content">Amazing tool.</p><div class="name">Sam</div></div>
          <div class="testimonial"><p class="content">Highly recommend.</p><div class="name">Alex</div></div>
        </div>
      </section>`;
    const tree = htmlToElementor(html);
    const counts = widgetCounts(tree);
    expect(counts["testimonial"]).toBe(2);
  });
});

describe("elementor-engine regression: debug report integrity", () => {
  it("produces a valid, parseable elementor data payload with a widget summary", () => {
    const html = `
      <section>
        <h2>Our Services</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr">
          <div class="feature-box"><i class="icon fa fa-star"></i><h4>Design</h4><p>Beautiful pages.</p></div>
          <div class="feature-box"><i class="icon fa fa-star"></i><h4>Speed</h4><p>Fast loads.</p></div>
          <div class="feature-box"><i class="icon fa fa-star"></i><h4>Support</h4><p>Always on.</p></div>
        </div>
      </section>`;
    const report = buildElementorDebugReport(html);
    expect(() => JSON.parse(report.elementorData)).not.toThrow();
    expect(report.widgetCount).toBeGreaterThan(0);
    expect(Object.keys(report.widgetSummary).length).toBeGreaterThan(0);
  });
});
