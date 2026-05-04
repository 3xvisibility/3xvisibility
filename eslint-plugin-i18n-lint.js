/**
 * Custom ESLint plugin for i18n translation files.
 *
 * Rules:
 *  i18n-lint/no-double-braces     — flags {{var}} (should be {var})
 *  i18n-lint/placeholder-mismatch — flags when a translated value has different placeholders than EN
 *  i18n-lint/no-malformed-strings  — flags stray backslashes, empty long-key values, unbalanced braces
 */

// ── Helpers ────────────────────────────────────────────────────────────

/** Extract {placeholder} names from a translation value string */
function extractPlaceholders(value) {
  const matches = value.match(/\{([^}]+)\}/g) || [];
  return matches.map((m) => m.slice(1, -1)).sort();
}

/** Check if arrays have the same elements */
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

// ── Shared: collect EN keys from the first `en: { ... }` block ─────────

let enPlaceholders = null; // Map<key, string[]>

function buildEnMap(sourceCode) {
  if (enPlaceholders) return enPlaceholders;
  enPlaceholders = new Map();
  const text = sourceCode.getText();

  // Match the en block
  const enMatch = text.match(/\ben\s*:\s*\{([\s\S]*?)\n\s*\},/);
  if (!enMatch) return enPlaceholders;

  const kvRegex = /"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = kvRegex.exec(enMatch[1])) !== null) {
    enPlaceholders.set(m[1], extractPlaceholders(m[2]));
  }
  return enPlaceholders;
}

// ── Plugin ─────────────────────────────────────────────────────────────

const plugin = {
  meta: { name: "eslint-plugin-i18n-lint", version: "1.0.0" },
  rules: {
    /** Flag {{double_braces}} in translation values */
    "no-double-braces": {
      meta: {
        type: "problem",
        docs: { description: "Disallow {{var}} in translations — use {var} instead" },
        messages: {
          doubleBraces: 'Use single braces {{"{{placeholder}}"}} → {{"{placeholder}"}}'
        },
        schema: [],
      },
      create(context) {
        return {
          Property(node) {
            if (
              node.value?.type === "Literal" &&
              typeof node.value.value === "string" &&
              /\{\{[^}]+\}\}/.test(node.value.value)
            ) {
              const matches = node.value.value.match(/\{\{([^}]+)\}\}/g) || [];
              for (const match of matches) {
                context.report({
                  node: node.value,
                  messageId: "doubleBraces",
                  data: { placeholder: match.slice(2, -2) },
                });
              }
            }
          },
        };
      },
    },

    /** Flag when translated value has different placeholders than EN source */
    "placeholder-mismatch": {
      meta: {
        type: "problem",
        docs: { description: "Translation placeholders must match the EN source" },
        messages: {
          mismatch: 'Placeholder mismatch for "{{key}}": EN has [{{expected}}] but this has [{{actual}}]',
        },
        schema: [],
      },
      create(context) {
        const filename = context.filename || context.getFilename();
        // Only run on translation files
        if (!filename.includes("i18n/")) return {};

        return {
          Property(node) {
            if (
              node.key?.type === "Literal" &&
              typeof node.key.value === "string" &&
              node.value?.type === "Literal" &&
              typeof node.value.value === "string"
            ) {
              const key = node.key.value;
              const value = node.value.value;
              const enMap = buildEnMap(context.sourceCode || context.getSourceCode());
              const enPh = enMap.get(key);

              // Only check if we have an EN reference and this isn't the EN block itself
              if (!enPh || enPh.length === 0) return;

              const thisPh = extractPlaceholders(value);
              if (thisPh.length === 0 && value === "") return; // empty value — caught elsewhere

              if (!arraysEqual(enPh, thisPh)) {
                context.report({
                  node: node.value,
                  messageId: "mismatch",
                  data: {
                    key,
                    expected: enPh.join(", "),
                    actual: thisPh.length ? thisPh.join(", ") : "(none)",
                  },
                });
              }
            }
          },
        };
      },
    },

    /** Flag malformed string patterns: stray backslashes, unbalanced braces */
    "no-malformed-strings": {
      meta: {
        type: "problem",
        docs: { description: "Catch stray backslashes and unbalanced braces in translations" },
        messages: {
          strayBackslash: 'Invalid escape sequence "\\{{char}}" in translation "{{key}}"',
          unbalancedBraces: 'Unbalanced braces in "{{key}}": {{opens}} opening vs {{closes}} closing',
          emptyValue: 'Empty value for key "{{key}}" — likely truncated',
        },
        schema: [],
      },
      create(context) {
        const filename = context.filename || context.getFilename();
        if (!filename.includes("i18n/")) return {};

        const VALID_ESCAPES = new Set([..."nrtbfv0'\"\\/"]);

        return {
          Property(node) {
            if (
              node.key?.type === "Literal" &&
              typeof node.key.value === "string" &&
              node.value?.type === "Literal" &&
              typeof node.value.value === "string"
            ) {
              const key = node.key.value;
              const raw = node.value.raw || JSON.stringify(node.value.value);

              // Check stray backslashes in the raw string
              const escapeRegex = /\\(.)/g;
              let m;
              while ((m = escapeRegex.exec(raw)) !== null) {
                const ch = m[1];
                if (ch === "u" || ch === "x") continue; // unicode/hex
                if (!VALID_ESCAPES.has(ch)) {
                  context.report({
                    node: node.value,
                    messageId: "strayBackslash",
                    data: { char: ch, key },
                  });
                }
              }

              // Check unbalanced braces
              const value = node.value.value;
              const opens = (value.match(/\{/g) || []).length;
              const closes = (value.match(/\}/g) || []).length;
              if (opens !== closes) {
                context.report({
                  node: node.value,
                  messageId: "unbalancedBraces",
                  data: { key, opens: String(opens), closes: String(closes) },
                });
              }

              // Empty value on descriptive key
              if (value === "" && key.length > 10) {
                context.report({
                  node: node.value,
                  messageId: "emptyValue",
                  data: { key },
                });
              }
            }
          },
        };
      },
    },
  },
};

export default plugin;
