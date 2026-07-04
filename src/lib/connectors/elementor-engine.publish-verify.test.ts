import { describe, it, expect } from "vitest";
import {
  htmlToElementor,
  buildElementorMeta,
  type ElementorElement,
} from "./elementor-engine";
import { sampleTemplates } from "./__fixtures__/sample-templates";

/**
 * Publish + verification regression suite.
 *
 * For every sample template this suite:
 *   1. Runs the Elementor conversion (`htmlToElementor` / `buildElementorMeta`).
 *   2. Runs the SAME readiness checks the WordPress connector performs after a
 *      publish, so we catch a 1:1 regression before it ever reaches a live site:
 *        - `_elementor_data` is present and round-trips as valid JSON
 *        - every node is a native Elementor element (NO "html" widget)
 *        - the page has >=1 editable widget (editor-ready)
 *        - every widget has a stable id + widgetType (editable in the editor)
 *   3. Asserts the specific native widget types each sample must produce.
 *
 * This mirrors `PublishResponse.elementor_data_valid` + `editor_ready` +
 * `editable_widgets` from the pgp-connector, without needing a live WordPress
 * site, so the mapping engine's native output stays verified in CI.
 */

interface PublishVerification {
  elementorDataValid: boolean;
  editorReady: boolean;
  editableWidgets: number;
  htmlWidgets: number;
  invalidNodes: number;
  widgetTypes: Record<string, number>;
}

/** Recursively walk a tree, mirroring the connector's post-publish checks. */
function verifyPublish(tree: ElementorElement[]): PublishVerification {
  const result: PublishVerification = {
    elementorDataValid: true,
    editorReady: false,
    editableWidgets: 0,
    htmlWidgets: 0,
    invalidNodes: 0,
    widgetTypes: {},
  };

  const walk = (list: ElementorElement[]) => {
    for (const node of list) {
      if (!node.id || !node.elType) result.invalidNodes++;
      if (node.elType === "widget") {
        const type = node.widgetType || "";
        if (!type) {
          result.invalidNodes++;
        } else {
          result.widgetTypes[type] = (result.widgetTypes[type] || 0) + 1;
          if (type === "html") result.htmlWidgets++;
          else result.editableWidgets++;
        }
      }
      if (node.elements?.length) walk(node.elements as ElementorElement[]);
    }
  };
  walk(tree);

  result.editorReady = result.editableWidgets >= 1 && result.htmlWidgets === 0;
  return result;
}

/** Render a compact, indented outline of the widget tree for failure diffs. */
function outlineTree(tree: ElementorElement[], depth = 0): string {
  const lines: string[] = [];
  for (const node of tree) {
    const pad = "  ".repeat(depth);
    const label =
      node.elType === "widget"
        ? `widget:${node.widgetType || "<missing-type>"}`
        : node.elType || "<missing-elType>";
    const id = node.id ? "" : " [MISSING id]";
    lines.push(`${pad}- ${label}${id}`);
    if (node.elements?.length) {
      lines.push(outlineTree(node.elements as ElementorElement[], depth + 1));
    }
  }
  return lines.join("\n");
}

/** Flatten every widgetType found in the tree, in document order. */
function collectWidgetTypes(tree: ElementorElement[]): string[] {
  const types: string[] = [];
  const walk = (list: ElementorElement[]) => {
    for (const node of list) {
      if (node.elType === "widget") types.push(node.widgetType || "<missing-type>");
      if (node.elements?.length) walk(node.elements as ElementorElement[]);
    }
  };
  walk(tree);
  return types;
}

/**
 * Build a detailed, human-readable failure report showing what the publish
 * verification expected vs. what the conversion actually produced — the native
 * widget tree, the flattened widget-type counts, and a snippet of the raw
 * `_elementor_data` meta so a regression is diagnosable straight from CI output.
 */
function failureReport(
  sample: (typeof sampleTemplates)[number],
  tree: ElementorElement[],
  verdict: PublishVerification,
  rawMeta: string,
): string {
  const metaSnippet = rawMeta.length > 800 ? `${rawMeta.slice(0, 800)}… (${rawMeta.length} chars)` : rawMeta;
  return [
    `\n──────── publish/verify diff for "${sample.id}" ────────`,
    sample.description,
    "",
    "EXPECTED native widget types (>=1 each):",
    `  ${sample.expectWidgets.join(", ") || "(none)"}`,
    sample.forbidWidgets?.length ? `FORBIDDEN widget types (0 each):\n  ${sample.forbidWidgets.join(", ")}` : "",
    "",
    "ACTUAL widget-type counts:",
    `  ${JSON.stringify(verdict.widgetTypes)}`,
    `ACTUAL widget types in order:`,
    `  ${collectWidgetTypes(tree).join(" → ") || "(none)"}`,
    "",
    "Verification verdict:",
    `  editableWidgets=${verdict.editableWidgets} htmlWidgets=${verdict.htmlWidgets} invalidNodes=${verdict.invalidNodes} editorReady=${verdict.editorReady}`,
    "",
    "ACTUAL native Elementor widget tree:",
    outlineTree(tree),
    "",
    "_elementor_data (raw meta):",
    `  ${metaSnippet}`,
    "──────────────────────────────────────────────────────\n",
  ]
    .filter(Boolean)
    .join("\n");
}

describe("elementor publish/verify regression on sample templates", () => {
  for (const sample of sampleTemplates) {
    describe(`${sample.id} — ${sample.description}`, () => {
      const tree = htmlToElementor(sample.html, { proWidgets: sample.pro === true });
      const verdict = verifyPublish(tree);
      const meta = buildElementorMeta(sample.html);
      const rawMeta = (meta._elementor_data as string) ?? "";
      const report = () => failureReport(sample, tree, verdict, rawMeta);

      it("produces a valid, JSON round-trippable _elementor_data payload", () => {
        expect(typeof rawMeta, report()).toBe("string");
        expect(rawMeta.length, report()).toBeGreaterThan(2);
        expect(() => JSON.parse(rawMeta), report()).not.toThrow();
        const parsed = JSON.parse(rawMeta);
        expect(Array.isArray(parsed), report()).toBe(true);
        expect(parsed.length, report()).toBeGreaterThan(0);
      });

      it("contains NO HTML widget (native-only publish guarantee)", () => {
        expect(verdict.htmlWidgets, report()).toBe(0);
      });

      it("is editor-ready with at least one editable native widget", () => {
        expect(verdict.editableWidgets, report()).toBeGreaterThanOrEqual(1);
        expect(verdict.editorReady, report()).toBe(true);
      });

      it("has only well-formed nodes (id + type present)", () => {
        expect(verdict.invalidNodes, report()).toBe(0);
      });

      it("produces the expected native widget types", () => {
        for (const type of sample.expectWidgets) {
          expect(verdict.widgetTypes[type] || 0, report()).toBeGreaterThanOrEqual(1);
        }
        for (const type of sample.forbidWidgets || []) {
          expect(verdict.widgetTypes[type] || 0, report()).toBe(0);
        }
      });
    });
  }

  it("Pro widgets stay OFF unless explicitly enabled", () => {
    const proSample = sampleTemplates.find((s) => s.id === "contact-form-pro")!;
    const nonProTree = htmlToElementor(proSample.html, { proWidgets: false });
    const verdict = verifyPublish(nonProTree);
    const report = failureReport(proSample, nonProTree, verdict, "");
    // Without Pro, a <form> falls back to native containers/widgets, never a raw
    // "form" widget that a non-Pro site could not render.
    expect(verdict.widgetTypes.form || 0, report).toBe(0);
    expect(verdict.htmlWidgets, report).toBe(0);
  });
});
