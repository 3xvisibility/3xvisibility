#!/usr/bin/env bun
/**
 * One-time extraction: reads the current TS locale files + inline translations
 * and writes them out as canonical JSON files under src/i18n/locales-json/.
 *
 * Usage:  bun scripts/extract-locales-to-json.ts
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dir, "..");
const LOCALES_DIR = path.join(ROOT, "src/i18n/locales");
const JSON_DIR = path.join(ROOT, "src/i18n/locales-json");

fs.mkdirSync(JSON_DIR, { recursive: true });

// ── 1. Extract from individual .ts locale files ──
const tsFiles = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith(".ts"));
for (const file of tsFiles) {
  const code = file.replace(".ts", "");
  const fullPath = path.join(LOCALES_DIR, file);
  const content = fs.readFileSync(fullPath, "utf-8");

  // Parse the object literal from the TS file
  // The files look like: const xx: Record<string, string> = { ... }; export default xx;
  const match = content.match(/=\s*\{([\s\S]*)\}\s*;/);
  if (!match) {
    console.warn(`⚠ Could not parse ${file}, skipping`);
    continue;
  }

  try {
    // Wrap in braces and eval-parse via JSON-ish conversion
    const objStr = `{${match[1]}}`;
    // Use Function constructor to safely evaluate the object literal
    const obj = new Function(`return (${objStr})`)();
    const sorted = Object.fromEntries(
      Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
    );
    fs.writeFileSync(
      path.join(JSON_DIR, `${code}.json`),
      JSON.stringify(sorted, null, 2) + "\n"
    );
    console.log(`✓ ${code}: ${Object.keys(sorted).length} keys`);
  } catch (e: any) {
    console.error(`✗ Failed to parse ${file}: ${e.message}`);
  }
}

// ── 2. Extract en, fr, de from translations.ts (inline) ──
const translationsPath = path.join(ROOT, "src/i18n/translations.ts");
const translationsContent = fs.readFileSync(translationsPath, "utf-8");

function extractInlineLocale(langCode: string, src: string): Record<string, string> | null {
  // Find the start of the locale block
  const patterns = [
    // For en which is inside `translations = { en: { ... }, fr: ...`
    new RegExp(`(?:^|\\s)${langCode}:\\s*\\{`, "m"),
  ];

  for (const pat of patterns) {
    const startMatch = pat.exec(src);
    if (!startMatch) continue;

    const startIdx = startMatch.index + startMatch[0].length;
    let depth = 1;
    let i = startIdx;
    while (i < src.length && depth > 0) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") depth--;
      i++;
    }
    const objBody = src.substring(startIdx, i - 1);

    try {
      const obj = new Function(`return ({${objBody}})`)();
      return obj;
    } catch (e: any) {
      console.error(`✗ Failed to eval inline ${langCode}: ${e.message}`);
      return null;
    }
  }
  return null;
}

for (const lang of ["en", "fr", "de"]) {
  // Skip if already extracted from a locale file
  if (fs.existsSync(path.join(JSON_DIR, `${lang}.json`))) {
    console.log(`⊘ ${lang}: already extracted from locale file, skipping inline`);
    continue;
  }

  const obj = extractInlineLocale(lang, translationsContent);
  if (obj) {
    const sorted = Object.fromEntries(
      Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))
    );
    fs.writeFileSync(
      path.join(JSON_DIR, `${lang}.json`),
      JSON.stringify(sorted, null, 2) + "\n"
    );
    console.log(`✓ ${lang} (inline): ${Object.keys(sorted).length} keys`);
  } else {
    console.warn(`⚠ Could not extract inline locale: ${lang}`);
  }
}

console.log("\nDone! JSON files written to src/i18n/locales-json/");
