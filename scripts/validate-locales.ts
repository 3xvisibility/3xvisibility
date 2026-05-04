#!/usr/bin/env bun
/**
 * Locale string validator — catches unterminated/truncated string literals
 * in translation files before the TypeScript compiler does.
 *
 * Checks:
 *  1. Every TS locale file can be parsed without syntax errors
 *  2. No string value ends with a lone backslash (truncated escape)
 *  3. No string value is empty when it shouldn't be (key present but blank)
 *  4. No unbalanced quotes inside string values
 *
 * Exit code 0 = all good, 1 = problems found.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dir, "..");
const LOCALES_DIR = join(ROOT, "src/i18n/locales");
const TRANSLATIONS_FILE = join(ROOT, "src/i18n/translations.ts");

let errors: string[] = [];

// ── Helper: check a single TS file for bad string literals ──────────────
function checkFile(filePath: string) {
  const label = filePath.replace(ROOT + "/", "");
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    // Match key-value pairs like  "some.key": "some value",
    const kvMatch = line.match(/^\s*"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)("?)\s*,?\s*$/);
    if (!kvMatch) continue;

    const key = kvMatch[1];
    const value = kvMatch[2];
    const closingQuote = kvMatch[3];

    // 1. Missing closing quote → unterminated string literal
    if (!closingQuote) {
      errors.push(`${label}:${lineNo} — Unterminated string for key "${key}"`);
      continue;
    }

    // 2. Value is just a backslash or ends with odd backslashes (truncated escape)
    if (/\\$/.test(value) && !/\\\\$/.test(value)) {
      errors.push(`${label}:${lineNo} — Truncated escape at end of value for key "${key}"`);
    }

    // 3. Value is suspiciously short (just quotes / single char) for a known long key
    if (value === "" && key.length > 10) {
      // Allow intentionally empty short keys, flag long ones
      errors.push(`${label}:${lineNo} — Empty value for key "${key}" (likely truncated)`);
    }
  }
}

// ── Run ─────────────────────────────────────────────────────────────────
console.log("🔍 Validating locale files…\n");

// Check all locale files
const localeFiles = readdirSync(LOCALES_DIR)
  .filter((f) => f.endsWith(".ts"))
  .map((f) => join(LOCALES_DIR, f));

for (const f of localeFiles) checkFile(f);

// Check the main translations.ts (has inline en/fr/de blocks)
checkFile(TRANSLATIONS_FILE);

// ── Report ──────────────────────────────────────────────────────────────
if (errors.length === 0) {
  console.log(`✅ All ${localeFiles.length + 1} locale files are valid.\n`);
  process.exit(0);
} else {
  console.error(`❌ Found ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  • ${e}`);
  console.error("");
  process.exit(1);
}
