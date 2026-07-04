/**
 * End-to-end sample templates for the publish/verify regression suite.
 *
 * Each entry is a self-contained slice of a real-world template plus the native
 * Elementor widgets it MUST produce after `htmlToElementor`. The regression
 * test (`elementor-engine.publish-verify.test.ts`) converts every sample, then
 * runs the same readiness checks the WordPress connector performs after a
 * publish (valid `_elementor_data`, no HTML widget, >=1 editable widget) so a
 * mapping change that breaks 1:1 native output fails CI immediately.
 *
 * Keep each sample focused on the widgets it guards so a failure is easy to
 * attribute. Set `pro: true` for samples that rely on Elementor Pro-only
 * widgets (form / rating).
 */

export interface SampleTemplate {
  /** Stable id used in the test name. */
  id: string;
  /** Human-readable description of what the sample guards. */
  description: string;
  /** Source HTML fed into the converter. */
  html: string;
  /** Native widget types that MUST appear at least once. */
  expectWidgets: string[];
  /** Native widget types that MUST NOT appear (e.g. never fall back to "html"). */
  forbidWidgets?: string[];
  /** Enable Elementor Pro-only widgets for this sample. */
  pro?: boolean;
}

export const sampleTemplates: SampleTemplate[] = [
  {
    id: "hero-heading-cta",
    description: "hero: heading + paragraph + CTA button map to native widgets",
    html: `
      <section class="hero">
        <h1>Grow your business online</h1>
        <p>Launch high-converting landing pages in minutes with our builder.</p>
        <a class="btn" href="/start">Get started</a>
      </section>`,
    expectWidgets: ["heading", "button"],
  },
  {
    id: "feature-icon-box",
    description: "feature card: icon + heading + text map to a native icon-box",
    html: `
      <div class="feature-box">
        <i class="icon fas fa-bolt"></i>
        <h3>Lightning Fast</h3>
        <p>Optimized for speed out of the box.</p>
      </div>`,
    expectWidgets: ["icon-box"],
  },
  {
    id: "image-box-card",
    description: "media card: image + heading + text map to a native image-box",
    html: `
      <div class="card">
        <img src="https://example.com/support.jpg" alt="Support" />
        <h3>Premium Support</h3>
        <p>We are here around the clock.</p>
      </div>`,
    expectWidgets: ["image-box"],
  },
  {
    id: "social-icons-row",
    description: "footer social row maps to a native social-icons widget (not icon-list)",
    html: `
      <div class="social-links">
        <a href="https://facebook.com/acme"><i class="fab fa-facebook"></i></a>
        <a href="https://twitter.com/acme"><i class="fab fa-twitter"></i></a>
        <a href="https://instagram.com/acme"><i class="fab fa-instagram"></i></a>
      </div>`,
    expectWidgets: ["social-icons"],
    forbidWidgets: ["html"],
  },
  {
    id: "progress-skill-bar",
    description: "skill/progress bar maps to a native progress widget",
    html: `
      <div class="progress" role="progressbar" aria-valuenow="70" aria-valuemax="100">
        <span>Design</span>
      </div>`,
    expectWidgets: ["progress"],
  },
  {
    id: "spacer-block",
    description: "empty spacing div maps to a native spacer widget",
    html: `
      <section>
        <p>Above the gap.</p>
        <div class="spacer" style="height:60px"></div>
        <p>Below the gap.</p>
      </section>`,
    expectWidgets: ["spacer"],
  },
  {
    id: "divider-rule",
    description: "an <hr> maps to a native divider widget",
    html: `
      <section>
        <p>Section one copy.</p>
        <hr/>
        <p>Section two copy.</p>
      </section>`,
    expectWidgets: ["divider"],
  },
  {
    id: "video-embed",
    description: "a YouTube iframe maps to a native video widget",
    html: `
      <section>
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
      </section>`,
    expectWidgets: ["video"],
  },
  {
    id: "testimonial-card",
    description: "avatar + quote + name maps to a native testimonial widget",
    html: `
      <div class="testimonial">
        <img src="https://example.com/ana.jpg" alt="Ana" />
        <p class="content">Best decision we made this year.</p>
        <div class="name">Ana Ruiz</div>
        <div class="role">CTO, Nimbus</div>
      </div>`,
    expectWidgets: ["testimonial"],
  },
  {
    id: "contact-form-pro",
    description: "Pro: a contact form maps to a native form widget with fields",
    pro: true,
    html: `
      <form name="contact">
        <input type="text" name="name" placeholder="Your name" required />
        <input type="email" name="email" placeholder="Email" required />
        <textarea name="message" placeholder="Message"></textarea>
        <button type="submit">Send message</button>
      </form>`,
    expectWidgets: ["form"],
  },
  {
    id: "star-rating-pro",
    description: "Pro: a star rating maps to a native rating widget",
    pro: true,
    html: `
      <div class="star-rating" aria-label="4 out of 5">
        <i class="fas fa-star"></i>
        <i class="fas fa-star"></i>
        <i class="fas fa-star"></i>
        <i class="fas fa-star"></i>
        <i class="far fa-star"></i>
      </div>`,
    expectWidgets: ["rating"],
  },
  {
    id: "icon-list-features",
    description: "a bulleted feature list maps to a native icon-list widget",
    html: `
      <ul class="feature-list">
        <li>Unlimited pages</li>
        <li>Priority support</li>
        <li>Custom domains</li>
      </ul>`,
    expectWidgets: ["icon-list"],
    forbidWidgets: ["html"],
  },
  {
    id: "icon-list-from-divs",
    description: "a row of icon+text divs (no <ul>) still maps to a native icon-list",
    html: `
      <div class="benefits">
        <div class="benefit"><i class="fas fa-check"></i><span>Fast setup</span></div>
        <div class="benefit"><i class="fas fa-check"></i><span>Secure hosting</span></div>
        <div class="benefit"><i class="fas fa-check"></i><span>24/7 uptime</span></div>
      </div>`,
    expectWidgets: ["icon-list"],
    forbidWidgets: ["html"],
  },
  {
    id: "counter-stat",
    description: "a numeric stat block maps to a native counter widget",
    html: `
      <div class="counter">
        <span class="number">2500</span>
        <div class="title">Happy customers</div>
      </div>`,
    expectWidgets: ["counter"],
    forbidWidgets: ["html"],
  },
  {
    id: "accordion-faq",
    description: "an FAQ accordion maps to a native accordion widget",
    html: `
      <div class="accordion faq">
        <div class="accordion-item">
          <h3 class="title">What is your refund policy?</h3>
          <div class="content"><p>30-day money back guarantee.</p></div>
        </div>
        <div class="accordion-item">
          <h3 class="title">Do you offer support?</h3>
          <div class="content"><p>Yes, around the clock.</p></div>
        </div>
      </div>`,
    expectWidgets: ["accordion"],
    forbidWidgets: ["html"],
  },
  {
    id: "tabs-panels",
    description: "a tabbed section maps to a native tabs widget",
    html: `
      <div class="tabs">
        <div class="tab-title">Overview</div>
        <div class="tab-title">Pricing</div>
        <div class="tab-pane"><p>Everything you need to get started.</p></div>
        <div class="tab-pane"><p>Simple, transparent pricing.</p></div>
      </div>`,
    expectWidgets: ["tabs"],
    forbidWidgets: ["html"],
  },
  {
    id: "standalone-icon",
    description: "a lone decorative icon maps to a native icon widget",
    html: `<div class="icon-wrap"><i class="fas fa-rocket"></i></div>`,
    expectWidgets: ["icon"],
    forbidWidgets: ["html"],
  },
  {
    id: "progress-inline-width",
    description: "a progress bar using inline width style maps to a native progress widget",
    html: `
      <div class="skill-bar">
        <span>JavaScript</span>
        <div class="progress"><div class="bar" style="width: 85%"></div></div>
      </div>`,
    expectWidgets: ["progress"],
    forbidWidgets: ["html"],
  },
  {
    id: "progress-data-attr",
    description: "a progress bar using data-percent maps to a native progress widget",
    html: `
      <div class="meter" data-percent="42">
        <span>Storage used</span>
      </div>`,
    expectWidgets: ["progress"],
    forbidWidgets: ["html"],
  },
  {
    id: "spacer-empty-div",
    description: "an empty div with only height styling maps to a native spacer widget",
    html: `
      <section>
        <h2>Section title</h2>
        <div style="height:120px"></div>
        <p>Following content.</p>
      </section>`,
    expectWidgets: ["spacer"],
    forbidWidgets: ["html"],
  },
  {
    id: "form-all-field-types-pro",
    description: "Pro: a form with text/email/tel/select/textarea maps to a native form widget",
    pro: true,
    html: `
      <form name="lead">
        <input type="text" name="fullname" placeholder="Full name" required />
        <input type="email" name="email" placeholder="Email" required />
        <input type="tel" name="phone" placeholder="Phone" />
        <select name="topic">
          <option>Sales</option>
          <option>Support</option>
        </select>
        <textarea name="details" placeholder="Details"></textarea>
        <button type="submit">Request a demo</button>
      </form>`,
    expectWidgets: ["form"],
    forbidWidgets: ["html"],
  },
  {
    id: "rating-aria-pro",
    description: "Pro: a rating using aria-valuenow maps to a native rating widget",
    pro: true,
    html: `<div class="rating" role="img" aria-valuenow="3" aria-valuemax="5">3 stars</div>`,
    expectWidgets: ["rating"],
    forbidWidgets: ["html"],
  },
  {
    id: "rating-data-attr-pro",
    description: "Pro: a rating using data-rating maps to a native rating widget",
    pro: true,
    html: `<div class="star-rating" data-rating="4.5"></div>`,
    expectWidgets: ["rating"],
    forbidWidgets: ["html"],
  },
  {
    id: "edge-mixed-section",
    description: "edge case: a mixed section stays native for every part (no HTML fallback)",
    html: `
      <section class="content">
        <h2>Why choose us</h2>
        <p>We help teams ship faster.</p>
        <hr/>
        <ul class="points">
          <li>Reliable</li>
          <li>Affordable</li>
        </ul>
        <a class="btn" href="/pricing">See pricing</a>
      </section>`,
    expectWidgets: ["heading", "divider", "icon-list", "button"],
    forbidWidgets: ["html"],
  },
  {
    id: "edge-card-grid",
    description: "edge case: a grid of feature cards maps each card to its own native widget",
    html: `
      <div class="grid">
        <div class="feature-box"><i class="fas fa-bolt"></i><h3>Fast</h3><p>Speedy delivery.</p></div>
        <div class="feature-box"><i class="fas fa-lock"></i><h3>Secure</h3><p>Encrypted by default.</p></div>
        <div class="feature-box"><i class="fas fa-cog"></i><h3>Flexible</h3><p>Fully configurable.</p></div>
      </div>`,
    expectWidgets: ["icon-box"],
    forbidWidgets: ["html"],
  },
  {
    id: "edge-empty-wrappers",
    description: "edge case: deeply nested empty wrappers around one heading still yield a native heading",
    html: `
      <div><div><div class="inner">
        <h2>Deeply nested title</h2>
      </div></div></div>`,
    expectWidgets: ["heading"],
    forbidWidgets: ["html"],
  },
];
