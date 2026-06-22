#!/usr/bin/env bun
/**
 * sync-locales.ts
 *
 * Keeps every locale JSON in sync with the English source of truth (en.json),
 * then regenerates the TypeScript locale files + translations.ts.
 *
 * For each locale in src/i18n/locales-json/, any key present in en.json but
 * missing from that locale is added using the English value as a fallback
 * placeholder. This guarantees full key parity so the build never fails on
 * "missing key(s) in primary languages" and the UI never shows raw keys.
 *
 * Usage:  bun scripts/sync-locales.ts
 * Run after editing en.json (add/rename keys).
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = path.resolve(import.meta.dir, "..");
const JSON_DIR = path.join(ROOT, "src/i18n/locales-json");

function readJson(filePath: string): Record<string, string> {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJsonSorted(filePath: string, obj: Record<string, string>) {
  const sorted: Record<string, string> = {};
  for (const k of Object.keys(obj).sort((a, b) => a.localeCompare(b))) sorted[k] = obj[k];
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2) + "\n");
}

const en = readJson(path.join(JSON_DIR, "en.json"));
const enKeys = Object.keys(en);

const jsonFiles = fs.readdirSync(JSON_DIR).filter((f) => f.endsWith(".json") && f !== "en.json");

let totalAdded = 0;
for (const file of jsonFiles) {
  const filePath = path.join(JSON_DIR, file);
  const data = readJson(filePath);
  let added = 0;
  for (const key of enKeys) {
    if (!(key in data)) {
      data[key] = en[key]; // English fallback placeholder
      added++;
    }
  }
  if (added > 0) {
    writeJsonSorted(filePath, data);
    console.log(`✓ ${file}: added ${added} missing key(s)`);
    totalAdded += added;
  }
}

// Keep en.json itself sorted for stable diffs.
writeJsonSorted(path.join(JSON_DIR, "en.json"), en);

console.log(totalAdded === 0 ? "✓ All locales already in sync" : `✓ Backfilled ${totalAdded} key(s) total`);

// Regenerate the TypeScript locale files from the synced JSON.
console.log("\nRegenerating TypeScript locale files…");
execSync("bun scripts/generate-locales.ts", { cwd: ROOT, stdio: "inherit" });
