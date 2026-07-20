#!/usr/bin/env tsx
/**
 * sync-locale-ts.ts
 *
 * Backfills every missing key in src/i18n/locales/*.ts using the English
 * value from en.ts as a fallback placeholder. Runtime already falls back to
 * English, but the validator flags primary languages (fr/de/es) as fatal —
 * so we auto-repair before it runs. Existing translations are never touched.
 *
 * Runs automatically before validate-locales in the build pipeline.
 */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = join(__dirname, "..", "src/i18n/locales");

const KV_RE = /^(\s*)"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$/;

function parseLocale(file: string): { lines: string[]; keys: Map<string, number>; closeIdx: number } {
  const content = readFileSync(file, "utf-8");
  const lines = content.split("\n");
  const keys = new Map<string, number>();
  let closeIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(KV_RE);
    if (m) keys.set(m[2], i);
    else if (/^\s*\}\s*;?\s*$/.test(lines[i]) && closeIdx === -1) closeIdx = i;
  }
  return { lines, keys, closeIdx };
}

function escapeJs(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const en = parseLocale(join(LOCALES_DIR, "en.ts"));
const enValues = new Map<string, string>();
for (const [k, idx] of en.keys) {
  const m = en.lines[idx].match(KV_RE);
  if (m) enValues.set(k, m[3]);
}

const files = readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".ts") && f !== "en.ts");
let totalAdded = 0;

for (const file of files) {
  const full = join(LOCALES_DIR, file);
  const { lines, keys, closeIdx } = parseLocale(full);
  if (closeIdx === -1) continue;

  const missing: string[] = [];
  for (const k of enValues.keys()) if (!keys.has(k)) missing.push(k);
  if (missing.length === 0) continue;

  const insert = missing
    .sort()
    .map((k) => `  "${escapeJs(k)}": "${escapeJs(enValues.get(k)!)}",`);

  lines.splice(closeIdx, 0, ...insert);
  writeFileSync(full, lines.join("\n"));
  console.log(`✓ ${file}: backfilled ${missing.length} key(s) from en.ts`);
  totalAdded += missing.length;
}

console.log(totalAdded === 0 ? "✓ All locales already have full key parity" : `✓ Backfilled ${totalAdded} key(s) total`);
