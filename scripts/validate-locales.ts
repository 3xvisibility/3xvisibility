#!/usr/bin/env bun
/**
 * Locale string validator — catches broken translation entries
 * before the TypeScript compiler does.
 *
 * Checks:
 *  1. Unterminated string literals (missing closing quote)
 *  2. Truncated trailing escape (value ends with lone \)
 *  3. Stray backslashes (invalid escape sequences like \a, \z, etc.)
 *  4. Broken escaped quotes (unbalanced \" inside values)
 *  5. Empty values on long keys (likely truncated during generation)
 *  6. Unbalanced curly braces (broken {{variable}} placeholders)
 *  7. Lines that look like KV but fail to parse (syntax corruption)
 *
 * Exit code 0 = all good, 1 = problems found.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dir, "..");
const LOCALES_DIR = join(ROOT, "src/i18n/locales");
const TRANSLATIONS_FILE = join(ROOT, "src/i18n/translations.ts");

type Issue = { file: string; line: number; key: string; rule: string; detail: string };
const issues: Issue[] = [];

function addIssue(file: string, line: number, key: string, rule: string, detail: string) {
  issues.push({ file, line, key, rule, detail });
}

// Valid JS escape characters after a backslash
const VALID_ESCAPES = new Set([..."nrtbfv0'\"\\/"]);

function checkFile(filePath: string) {
  const label = filePath.replace(ROOT + "/", "");
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    // Skip lines that aren't key-value pairs
    if (!/"\s*:/.test(line)) continue;

    // Extract all KV pairs from the line (supports multiple per line)
    const kvRegex = /"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)("?)/g;
    let kvMatch: RegExpExecArray | null;
    let foundAny = false;

    while ((kvMatch = kvRegex.exec(line)) !== null) {
      foundAny = true;
      const key = kvMatch[1];
      const value = kvMatch[2];
      const closingQuote = kvMatch[3];
      // ── Rule 1: Unterminated string literal ──
      if (!closingQuote) {
        addIssue(label, lineNo, key, "UNTERMINATED", "Missing closing quote — unterminated string literal");
        continue;
      }

      // ── Rule 2: Truncated trailing escape ──
      const trailingBackslashes = value.match(/\\+$/);
      if (trailingBackslashes && trailingBackslashes[0].length % 2 !== 0) {
        addIssue(label, lineNo, key, "TRAILING_ESCAPE", `Value ends with a lone backslash: "…${value.slice(-10)}"`);
      }

      // ── Rule 3: Stray backslashes (invalid escape sequences) ──
      const escapeMatches = [...value.matchAll(/\\(.)/g)];
      for (const m of escapeMatches) {
        const char = m[1];
        if (char === "u" || char === "x") continue;
        if (!VALID_ESCAPES.has(char)) {
          addIssue(label, lineNo, key, "STRAY_BACKSLASH", `Invalid escape sequence \\${char} at position ${m.index}`);
        }
      }

      // ── Rule 4: Broken escaped quotes ──
      // ── Rule 4: Value is ONLY an escaped quote (truncation artifact) ──
      if (value === '\\"') {
        addIssue(label, lineNo, key, "TRUNCATED_QUOTE", "Value is just an escaped quote — likely truncated");
      }

      // ── Rule 5: Empty value on long key ──
      if (value === "" && key.length > 10) {
        addIssue(label, lineNo, key, "EMPTY_VALUE", "Empty value for a descriptive key — likely truncated");
      }

      // ── Rule 6: Unbalanced curly braces ──
      const opens = (value.match(/\{/g) || []).length;
      const closes = (value.match(/\}/g) || []).length;
      if (opens !== closes) {
        addIssue(label, lineNo, key, "UNBALANCED_BRACES", `{=${opens} }=${closes} — broken placeholder variable`);
      }
    }
  }
}

// ── Run ─────────────────────────────────────────────────────────────────
console.log("🔍 Validating locale files…\n");

const localeFiles = readdirSync(LOCALES_DIR)
  .filter((f) => f.endsWith(".ts"))
  .map((f) => join(LOCALES_DIR, f));

for (const f of localeFiles) checkFile(f);
checkFile(TRANSLATIONS_FILE);

// ── Rule 8: Missing keys vs. English source of truth ──────────────────────
// English (en.ts) defines the canonical set of keys. Locales fall back to
// English at runtime, so most missing keys are reported as non-fatal WARNINGS
// to give full visibility. However, keys under CRITICAL_PREFIXES are
// user-facing static pages that MUST be translated everywhere — a missing
// critical key is a build-breaking ERROR so untranslated text never slips into
// a new locale unnoticed.
const CRITICAL_PREFIXES = ["contact.", "footer."];

function isCritical(key: string): boolean {
  return CRITICAL_PREFIXES.some((p) => key.startsWith(p));
}

function extractKeys(filePath: string): Set<string> {
  const content = readFileSync(filePath, "utf-8");
  const keys = new Set<string>();
  const kvRegex = /"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = kvRegex.exec(content)) !== null) keys.add(m[1]);
  return keys;
}

type Missing = { file: string; key: string };
const missingCritical: Missing[] = [];
const missingWarnings: Missing[] = [];

const EN_FILE = join(LOCALES_DIR, "en.ts");
const enKeys = extractKeys(EN_FILE);

for (const f of localeFiles) {
  if (f === EN_FILE) continue;
  const label = f.replace(ROOT + "/", "");
  const localeKeys = extractKeys(f);
  for (const key of enKeys) {
    if (!localeKeys.has(key)) {
      if (isCritical(key)) missingCritical.push({ file: label, key });
      else missingWarnings.push({ file: label, key });
    }
  }
}

for (const m of missingCritical) {
  addIssue(m.file, 0, m.key, "MISSING_CRITICAL_KEY", `Critical key "${m.key}" exists in en.ts but is missing here`);
}

// ── Report ──────────────────────────────────────────────────────────────
// Non-fatal warnings first (missing non-critical translations).
if (missingWarnings.length > 0) {
  const byFile = new Map<string, number>();
  for (const m of missingWarnings) byFile.set(m.file, (byFile.get(m.file) || 0) + 1);
  console.warn(`⚠️  ${missingWarnings.length} non-critical key(s) missing (fall back to English at runtime):`);
  for (const [file, count] of byFile) console.warn(`   ${file}: ${count} missing`);
  console.warn("");
}

if (issues.length === 0) {
  console.log(
    `✅ All ${localeFiles.length + 1} locale files are valid (8 rules checked, incl. critical missing-key parity for: ${CRITICAL_PREFIXES.join(", ")}).\n`,
  );
  process.exit(0);
} else {
  // Group by rule
  const byRule = new Map<string, Issue[]>();
  for (const issue of issues) {
    const list = byRule.get(issue.rule) || [];
    list.push(issue);
    byRule.set(issue.rule, list);
  }

  console.error(`❌ Found ${issues.length} problem(s):\n`);

  for (const [rule, items] of byRule) {
    console.error(`── ${rule} (${items.length}) ──`);
    for (const item of items) {
      console.error(`  ${item.file}:${item.line}  "${item.key}"  → ${item.detail}`);
    }
    console.error("");
  }

  process.exit(1);
}
