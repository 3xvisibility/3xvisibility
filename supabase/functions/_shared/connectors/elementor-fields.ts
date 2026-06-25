// Editable-field mapping layer for Elementor templates.
//
// Walks an Elementor JSON tree, detects each widget's editable text settings,
// and produces a stable list of editable fields. Content replacement updates
// ONLY those editable settings (by widget id + setting key), leaving every
// other setting — layout, spacing, typography, colors, responsive — identical.

import type { ElementorElement } from "./elementor-engine.ts";
import {
  analyzeTemplateBudget,
  type BudgetMap,
  type LengthBudget,
} from "../template-length-budget.ts";

export type FieldKind =
  | "heading"
  | "text"
  | "button"
  | "iconbox_title"
  | "iconbox_desc"
  | "counter_title"
  | "counter_number"
  | "testimonial_content"
  | "testimonial_name"
  | "testimonial_job"
  | "list_item"
  | "accordion_title"
  | "accordion_content";

export interface EditableField {
  /** Stable, human-readable key, e.g. "heading_1", "button_2". */
  key: string;
  /** Elementor widget id this field lives on. */
  widgetId: string;
  /** Elementor widget type, e.g. "heading", "button". */
  widgetType: string;
  /** Setting key on the widget (or repeater item) holding the value. */
  settingKey: string;
  /** For repeater widgets (accordion/icon-list), the item index. */
  itemIndex?: number;
  kind: FieldKind;
  /** Original text shipped with the template. */
  originalText: string;
}

interface SimpleSpec {
  settingKey: string;
  kind: FieldKind;
}

/** Plain (non-repeater) editable settings per widget type. */
const SIMPLE_FIELDS: Record<string, SimpleSpec[]> = {
  heading: [{ settingKey: "title", kind: "heading" }],
  "text-editor": [{ settingKey: "editor", kind: "text" }],
  button: [{ settingKey: "text", kind: "button" }],
  "icon-box": [
    { settingKey: "title_text", kind: "iconbox_title" },
    { settingKey: "description_text", kind: "iconbox_desc" },
  ],
  "image-box": [
    { settingKey: "title_text", kind: "iconbox_title" },
    { settingKey: "description_text", kind: "iconbox_desc" },
  ],
  counter: [
    { settingKey: "title", kind: "counter_title" },
    { settingKey: "ending_number", kind: "counter_number" },
  ],
  testimonial: [
    { settingKey: "testimonial_content", kind: "testimonial_content" },
    { settingKey: "testimonial_name", kind: "testimonial_name" },
    { settingKey: "testimonial_job", kind: "testimonial_job" },
  ],
};

/** Repeater editable settings per widget type: [repeaterKey, itemFields]. */
const REPEATER_FIELDS: Record<string, { repeater: string; items: SimpleSpec[] }> = {
  "icon-list": { repeater: "icon_list", items: [{ settingKey: "text", kind: "list_item" }] },
  accordion: {
    repeater: "tabs",
    items: [
      { settingKey: "tab_title", kind: "accordion_title" },
      { settingKey: "tab_content", kind: "accordion_content" },
    ],
  },
  tabs: {
    repeater: "tabs",
    items: [
      { settingKey: "tab_title", kind: "accordion_title" },
      { settingKey: "tab_content", kind: "accordion_content" },
    ],
  },
};

const KIND_PREFIX: Record<FieldKind, string> = {
  heading: "heading",
  text: "text",
  button: "button",
  iconbox_title: "feature_title",
  iconbox_desc: "feature_desc",
  counter_title: "counter_title",
  counter_number: "counter_number",
  testimonial_content: "testimonial_content",
  testimonial_name: "testimonial_name",
  testimonial_job: "testimonial_job",
  list_item: "list_item",
  accordion_title: "faq_question",
  accordion_content: "faq_answer",
};

function asText(v: unknown): string {
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

/**
 * Extract every editable field from an Elementor JSON tree, in document order.
 * Keys are deduplicated per kind: heading_1, heading_2, ...
 */
export function extractEditableFields(tree: ElementorElement[]): EditableField[] {
  const fields: EditableField[] = [];
  const counts: Record<string, number> = {};

  const nextKey = (kind: FieldKind): string => {
    const prefix = KIND_PREFIX[kind];
    counts[prefix] = (counts[prefix] ?? 0) + 1;
    return `${prefix}_${counts[prefix]}`;
  };

  const visit = (el: ElementorElement) => {
    if (el.elType === "widget" && el.widgetType) {
      const simple = SIMPLE_FIELDS[el.widgetType];
      if (simple) {
        for (const spec of simple) {
          const val = asText(el.settings?.[spec.settingKey]);
          if (val.trim()) {
            fields.push({
              key: nextKey(spec.kind),
              widgetId: el.id,
              widgetType: el.widgetType,
              settingKey: spec.settingKey,
              kind: spec.kind,
              originalText: val,
            });
          }
        }
      }
      const rep = REPEATER_FIELDS[el.widgetType];
      if (rep) {
        const items = (el.settings?.[rep.repeater] as Array<Record<string, unknown>>) ?? [];
        items.forEach((item, idx) => {
          for (const spec of rep.items) {
            const val = asText(item?.[spec.settingKey]);
            if (val.trim()) {
              fields.push({
                key: nextKey(spec.kind),
                widgetId: el.id,
                widgetType: el.widgetType!,
                settingKey: spec.settingKey,
                itemIndex: idx,
                kind: spec.kind,
                originalText: val,
              });
            }
          }
        });
      }
    }
    for (const child of el.elements ?? []) visit(child);
  };

  for (const el of tree) visit(el);
  return fields;
}

/** Default content map (field key -> original text). */
export function defaultContentFor(fields: EditableField[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields) out[f.key] = f.originalText;
  return out;
}

/**
 * Per-field length budget (with hard caps applied) keyed by field key.
 * Reuses analyzeTemplateBudget so caps stay consistent with generation.
 */
export function limitsFor(fields: EditableField[]): BudgetMap {
  const defaults = defaultContentFor(fields);
  // analyzeTemplateBudget applies the role-based hard caps by field name.
  const budget = analyzeTemplateBudget(defaults);
  return budget;
}

/**
 * Replace ONLY editable fields in a deep-cloned tree. Any field key present in
 * `content` overwrites its widget setting; everything else is untouched.
 * Returns a new tree (input is not mutated).
 */
export function applyEditableContent(
  tree: ElementorElement[],
  fields: EditableField[],
  content: Record<string, string>,
): ElementorElement[] {
  const clone: ElementorElement[] = JSON.parse(JSON.stringify(tree));
  const byId = new Map<string, ElementorElement>();
  const index = (el: ElementorElement) => {
    byId.set(el.id, el);
    for (const c of el.elements ?? []) index(c);
  };
  for (const el of clone) index(el);

  for (const f of fields) {
    if (!(f.key in content)) continue;
    const value = content[f.key];
    if (value == null) continue;
    const widget = byId.get(f.widgetId);
    if (!widget || !widget.settings) continue;

    if (f.itemIndex == null) {
      // counter numbers stay numeric
      if (f.kind === "counter_number") {
        const n = parseInt(asText(value).replace(/[^\d]/g, ""), 10);
        if (!Number.isNaN(n)) widget.settings[f.settingKey] = n;
      } else {
        widget.settings[f.settingKey] = value;
      }
    } else {
      const repeaterKey = REPEATER_FIELDS[f.widgetType]?.repeater;
      if (!repeaterKey) continue;
      const items = widget.settings[repeaterKey] as Array<Record<string, unknown>> | undefined;
      if (items && items[f.itemIndex]) items[f.itemIndex][f.settingKey] = value;
    }
  }
  return clone;
}

export type { BudgetMap, LengthBudget };
