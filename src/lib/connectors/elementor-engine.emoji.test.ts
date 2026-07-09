import { describe, it, expect, afterEach } from "vitest";
import {
  htmlToElementor,
  setEmojiIconOverrides,
  getDefaultEmojiIconMap,
  type ElementorElement,
} from "./elementor-engine";

/** Collect every icon token (`selected_icon.value`) produced across the tree. */
function iconValues(tree: ElementorElement[]): string[] {
  const out: string[] = [];
  const walk = (list: ElementorElement[]) => {
    for (const n of list) {
      const sel = (n.settings?.selected_icon ?? null) as { value?: string } | null;
      if (sel?.value) out.push(sel.value);
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

/** Concatenate all text-editor / heading text in the tree. */
function allText(tree: ElementorElement[]): string {
  let out = "";
  const walk = (list: ElementorElement[]) => {
    for (const n of list) {
      const s = n.settings || {};
      out += ` ${(s.editor as string) || ""} ${(s.title as string) || ""} ${(s.title_text as string) || ""}`;
      if (n.elements?.length) walk(n.elements as ElementorElement[]);
    }
  };
  walk(tree);
  return out;
}

afterEach(() => {
  // Always reset overrides so tests stay isolated.
  setEmojiIconOverrides({});
});

describe("emoji-to-Elementor icon: list of common emojis", () => {
  // [emoji, expected fa token] — sampled across the built-in map.
  const cases: Array<[string, string]> = [
    ["🚀", "fa-rocket"],
    ["🔒", "fa-lock"],
    ["💳", "fa-credit-card"],
    ["🌍", "fa-globe"],
    ["🤝", "fa-handshake"],
    ["📈", "fa-chart-line"],
    ["🛒", "fa-cart-shopping"],
    ["💡", "fa-lightbulb"],
    ["🏆", "fa-trophy"],
    ["📞", "fa-phone"],
    ["🎯", "fa-bullseye"],
    ["🛡️", "fa-shield-halved"],
  ];

  it.each(cases)("maps %s to a native icon widget using %s", (emoji, token) => {
    const html = `
      <div class="feature-box">
        <div class="icon">${emoji}</div>
        <h4>Feature</h4>
        <p>Description text goes here.</p>
      </div>`;
    const tree = htmlToElementor(html);
    const icons = iconValues(tree);
    expect(icons.some((v) => v.includes(token))).toBe(true);
  });
});

describe("emoji-to-Elementor icon: different widget structures", () => {
  it("standalone emoji node becomes an icon widget", () => {
    const html = `<section><span>🚀</span></section>`;
    const tree = htmlToElementor(html);
    expect(findWidget(tree, "icon")).toBeDefined();
    expect(iconValues(tree).some((v) => v.includes("fa-rocket"))).toBe(true);
  });

  it("icon-box structure (icon + title + text) resolves the emoji icon", () => {
    const html = `
      <div class="feature-box">
        <i class="icon">🔒</i>
        <h4>Secure</h4>
        <p>Your data is protected.</p>
      </div>`;
    const tree = htmlToElementor(html);
    const box = findWidget(tree, "icon-box");
    expect(box).toBeDefined();
    const sel = box?.settings?.selected_icon as { value?: string } | undefined;
    expect(sel?.value).toContain("fa-lock");
  });

  it("grid of feature cards converts each emoji independently", () => {
    const html = `
      <section>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr">
          <div class="feature-box"><div class="icon">🚀</div><h4>Fast</h4><p>Speed.</p></div>
          <div class="feature-box"><div class="icon">🔒</div><h4>Safe</h4><p>Security.</p></div>
          <div class="feature-box"><div class="icon">🌍</div><h4>Global</h4><p>Reach.</p></div>
        </div>
      </section>`;
    const tree = htmlToElementor(html);
    const icons = iconValues(tree);
    expect(icons.some((v) => v.includes("fa-rocket"))).toBe(true);
    expect(icons.some((v) => v.includes("fa-lock"))).toBe(true);
    expect(icons.some((v) => v.includes("fa-globe"))).toBe(true);
  });
});

describe("emoji-to-Elementor icon: unmapped fallback", () => {
  it("keeps an unmapped standalone emoji as text instead of failing", () => {
    // A rare emoji not present in the built-in map.
    const rare = "🫥";
    const inMap = getDefaultEmojiIconMap().some(([g]) => g === rare);
    expect(inMap).toBe(false);
    const html = `<section><span>${rare}</span></section>`;
    const tree = htmlToElementor(html);
    expect(allText(tree)).toContain(rare);
  });
});

describe("emoji-to-Elementor icon: user overrides", () => {
  it("applies a custom override over the built-in mapping", () => {
    setEmojiIconOverrides({ "🚀": "fa-jet-fighter" });
    const html = `<section><span>🚀</span></section>`;
    const tree = htmlToElementor(html);
    expect(iconValues(tree).some((v) => v.includes("fa-jet-fighter"))).toBe(true);
    expect(iconValues(tree).some((v) => v.includes("fa-rocket"))).toBe(false);
  });

  it("an empty override unmaps an emoji so it stays as text", () => {
    setEmojiIconOverrides({ "🚀": "" });
    const html = `<section><span>🚀</span></section>`;
    const tree = htmlToElementor(html);
    expect(allText(tree)).toContain("🚀");
    expect(iconValues(tree).some((v) => v.includes("fa-rocket"))).toBe(false);
  });

  it("normalizes a raw token (no fa- prefix) in an override", () => {
    setEmojiIconOverrides({ "🚀": "rocket-launch" });
    const html = `<section><span>🚀</span></section>`;
    const tree = htmlToElementor(html);
    expect(iconValues(tree).some((v) => v.includes("fa-rocket-launch"))).toBe(true);
  });
});
