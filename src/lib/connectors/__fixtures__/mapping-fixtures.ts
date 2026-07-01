/**
 * Reusable HTML/DOM fixtures for the Elementor mapping engine.
 *
 * Each fixture pairs a snippet of source HTML with the mapping expectations it
 * should satisfy after `htmlToElementor`. Adding a new regression case is as
 * simple as appending an entry here — the fixture-driven test in
 * `elementor-engine.fixtures.test.ts` iterates over every entry automatically.
 *
 * Keep fixtures small and focused on ONE edge case each so failures are easy
 * to attribute. Group related cases with the `group` field.
 */

export interface WidgetExpectation {
  /** Native widget type produced by the engine, e.g. "image-box". */
  type: string;
  /** Minimum number of this widget expected anywhere in the tree. Default 1. */
  atLeast?: number;
  /** Exact number of this widget expected. Overrides `atLeast` when set. */
  exactly?: number;
  /**
   * Optional substrings that must appear in the FIRST matching widget's
   * stringified settings (handy for verifying title/content extraction).
   */
  settingsInclude?: string[];
}

export interface ContainerExpectation {
  /** Minimum number of grid containers (container_type === "grid"). */
  gridAtLeast?: number;
  /** Exact number of grid containers. Overrides `gridAtLeast` when set. */
  gridExactly?: number;
  /** Minimum number of flex-row containers (flex_direction === "row"). */
  rowAtLeast?: number;
}

export interface MappingFixture {
  /** Stable, unique id used in the test name. */
  id: string;
  /** Bucket for organizing related fixtures. */
  group: "grid" | "card" | "testimonial" | "mixed";
  /** Human-readable description of what the fixture guards against. */
  description: string;
  /** Source HTML fed into `htmlToElementor`. */
  html: string;
  /** Widget-level expectations. */
  widgets?: WidgetExpectation[];
  /** Container/layout expectations. */
  containers?: ContainerExpectation;
  /**
   * Marks a fixture whose expectations describe DESIRED behavior the engine
   * does not yet produce. The runner asserts these currently fail (via
   * `it.fails`), so when a future mapping change makes them pass, vitest flags
   * the fixture and the `knownGap` flag can be removed — turning it into a
   * normal regression guard.
   */
  knownGap?: boolean;
}

/* ------------------------------- grid cases ------------------------------ */

const gridFixtures: MappingFixture[] = [
  {
    id: "grid-4col-cards",
    group: "grid",
    description: "4-column CSS grid stays a single native grid container",
    html: `
      <section>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px">
          <div class="card"><h3>A</h3><p>Alpha body copy here.</p></div>
          <div class="card"><h3>B</h3><p>Beta body copy here.</p></div>
          <div class="card"><h3>C</h3><p>Gamma body copy here.</p></div>
          <div class="card"><h3>D</h3><p>Delta body copy here.</p></div>
        </div>
      </section>`,
    containers: { gridAtLeast: 1 },
  },
  {
    id: "grid-auto-fill-minmax",
    group: "grid",
    description: "auto-fill minmax grid is still detected as a grid container",
    html: `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px">
        <div class="card"><h4>One</h4><p>First.</p></div>
        <div class="card"><h4>Two</h4><p>Second.</p></div>
        <div class="card"><h4>Three</h4><p>Third.</p></div>
      </div>`,
    containers: { gridAtLeast: 1 },
  },
  {
    id: "grid-not-from-flex-column",
    group: "grid",
    description: "a flex column layout must NOT become a grid container",
    html: `
      <div style="display:flex;flex-direction:column;gap:12px">
        <div><p>Stacked one</p></div>
        <div><p>Stacked two</p></div>
      </div>`,
    containers: { gridExactly: 0 },
  },
  {
    id: "grid-nested-no-extra-wrappers",
    group: "grid",
    description: "grid inside a styled section does not accumulate redundant wrappers",
    html: `
      <section style="padding:40px;background:#f7f7f7">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
          <div class="card"><h3>Left</h3><p>Left column copy.</p></div>
          <div class="card"><h3>Right</h3><p>Right column copy.</p></div>
        </div>
      </section>`,
    containers: { gridAtLeast: 1 },
  },
];

/* ------------------------------- card cases ------------------------------ */

const cardFixtures: MappingFixture[] = [
  {
    id: "card-image-box",
    group: "card",
    description: "image + heading + text maps to image-box with the title text",
    html: `
      <div class="card">
        <img src="https://example.com/p.jpg" alt="Pic" />
        <h3>Premium Support</h3>
        <p>We are here around the clock.</p>
      </div>`,
    widgets: [{ type: "image-box", atLeast: 1, settingsInclude: ["Premium Support"] }],
  },
  {
    id: "card-icon-box",
    group: "card",
    description: "icon + heading + text maps to icon-box with the title text",
    html: `
      <div class="feature-box">
        <i class="icon fas fa-bolt"></i>
        <h4>Lightning Fast</h4>
        <p>Optimized for speed.</p>
      </div>`,
    widgets: [{ type: "icon-box", atLeast: 1, settingsInclude: ["Lightning Fast"] }],
  },
  {
    id: "card-icon-list-plain-divs",
    group: "card",
    description: "repeating icon+text rows built from plain divs map to icon-list",
    html: `
      <div class="features">
        <div><i class="icon fa fa-check"></i><span>SSL included</span></div>
        <div><i class="icon fa fa-check"></i><span>Free CDN</span></div>
        <div><i class="icon fa fa-check"></i><span>Auto backups</span></div>
        <div><i class="icon fa fa-check"></i><span>Staging sites</span></div>
      </div>`,
    widgets: [{ type: "icon-list", atLeast: 1 }],
  },
  {
    id: "card-image-box-svg-icon",
    group: "card",
    description: "svg icon + heading + text still maps to icon-box, not image-box",
    html: `
      <div class="feature-box">
        <svg viewBox="0 0 24 24" class="icon"><path d="M4 4h16v16H4z"/></svg>
        <h4>Secure by Default</h4>
        <p>Hardened out of the box.</p>
      </div>`,
    widgets: [{ type: "icon-box", atLeast: 1 }],
  },
];

/* --------------------------- testimonial cases --------------------------- */

const testimonialFixtures: MappingFixture[] = [
  {
    id: "testimonial-full",
    group: "testimonial",
    description: "avatar + quote + name + role maps to a single testimonial widget",
    html: `
      <div class="testimonial">
        <img src="https://example.com/a.jpg" alt="Ana" />
        <p class="content">Best decision we made this year.</p>
        <div class="name">Ana Ruiz</div>
        <div class="role">CTO, Nimbus</div>
      </div>`,
    widgets: [
      { type: "testimonial", exactly: 1, settingsInclude: ["Ana Ruiz", "Best decision"] },
    ],
  },
  {
    id: "testimonial-grid-three",
    group: "testimonial",
    description: "a 3-up testimonial grid produces three testimonial widgets",
    html: `
      <section>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px">
          <div class="testimonial"><p class="content">Superb.</p><div class="name">Lee</div></div>
          <div class="testimonial"><p class="content">Flawless.</p><div class="name">Mia</div></div>
          <div class="testimonial"><p class="content">Love it.</p><div class="name">Ravi</div></div>
        </div>
      </section>`,
    widgets: [{ type: "testimonial", exactly: 3 }],
    containers: { gridAtLeast: 1 },
  },
  {
    id: "testimonial-blockquote",
    group: "testimonial",
    description: "blockquote-based testimonial with cite maps to testimonial widget",
    html: `
      <div class="testimonial">
        <blockquote>The onboarding was seamless and fast.</blockquote>
        <cite class="name">Jordan Blake</cite>
      </div>`,
    widgets: [{ type: "testimonial", atLeast: 1, settingsInclude: ["Jordan Blake"] }],
  },
];

/* ------------------------------ mixed cases ------------------------------ */

const mixedFixtures: MappingFixture[] = [
  {
    id: "mixed-services-grid-of-icon-boxes",
    group: "mixed",
    description: "services section: grid container wrapping three icon-boxes",
    html: `
      <section>
        <h2>Our Services</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px">
          <div class="feature-box"><i class="icon fa fa-pen"></i><h4>Design</h4><p>Beautiful pages.</p></div>
          <div class="feature-box"><i class="icon fa fa-gauge"></i><h4>Speed</h4><p>Fast loads.</p></div>
          <div class="feature-box"><i class="icon fa fa-headset"></i><h4>Support</h4><p>Always on.</p></div>
        </div>
      </section>`,
    widgets: [{ type: "icon-box", atLeast: 3 }],
    containers: { gridAtLeast: 1 },
    // KNOWN GAP: the engine currently collapses the whole grid into a single
    // icon-box instead of one per card. Remove `knownGap` once fixed.
    knownGap: true,
  },
  {
    id: "mixed-image-cards-grid",
    group: "mixed",
    description: "grid of image cards maps each card to an image-box",
    html: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card"><img src="https://example.com/1.jpg" alt="1"/><h3>Alpha</h3><p>One.</p></div>
        <div class="card"><img src="https://example.com/2.jpg" alt="2"/><h3>Beta</h3><p>Two.</p></div>
      </div>`,
    widgets: [{ type: "image-box", atLeast: 2 }],
    containers: { gridAtLeast: 1 },
  },
];

export const mappingFixtures: MappingFixture[] = [
  ...gridFixtures,
  ...cardFixtures,
  ...testimonialFixtures,
  ...mixedFixtures,
];
