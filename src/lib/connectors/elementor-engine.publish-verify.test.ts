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

describe("elementor publish/verify regression on sample templates", () => {
  for (const sample of sampleTemplates) {
    describe(`${sample.id} — ${sample.description}`, () => {
      const tree = htmlToElementor(sample.html, { proWidgets: sample.pro === true });
      const verdict = verifyPublish(tree);

      it("produces a valid, JSON round-trippable _elementor_data payload", () => {
        const meta = buildElementorMeta(sample.html);
        const raw = meta._elementor_data as string;
        expect(typeof raw).toBe("string");
        expect(raw.length).toBeGreaterThan(2);
        expect(() => JSON.parse(raw)).not.toThrow();
        const parsed = JSON.parse(raw);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBeGreaterThan(0);
      });

      it("contains NO HTML widget (native-only publish guarantee)", () => {
        expect(verdict.htmlWidgets).toBe(0);
      });

      it("is editor-ready with at least one editable native widget", () => {
        expect(verdict.editableWidgets).toBeGreaterThanOrEqual(1);
        expect(verdict.editorReady).toBe(true);
      });

      it("has only well-formed nodes (id + type present)", () => {
        expect(verdict.invalidNodes).toBe(0);
      });

      it("produces the expected native widget types", () => {
        for (const type of sample.expectWidgets) {
          expect(
            verdict.widgetTypes[type] || 0,
            `expected native "${type}" widget for sample "${sample.id}" — got ${JSON.stringify(verdict.widgetTypes)}`,
          ).toBeGreaterThanOrEqual(1);
        }
        for (const type of sample.forbidWidgets || []) {
          expect(verdict.widgetTypes[type] || 0).toBe(0);
        }
      });
    });
  }

  it("Pro widgets stay OFF unless explicitly enabled", () => {
    const proSample = sampleTemplates.find((s) => s.id === "contact-form-pro")!;
    const nonProTree = htmlToElementor(proSample.html, { proWidgets: false });
    const verdict = verifyPublish(nonProTree);
    // Without Pro, a <form> falls back to native containers/widgets, never a raw
    // "form" widget that a non-Pro site could not render.
    expect(verdict.widgetTypes.form || 0).toBe(0);
    expect(verdict.htmlWidgets).toBe(0);
  });
});
