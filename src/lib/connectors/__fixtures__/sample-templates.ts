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
];
