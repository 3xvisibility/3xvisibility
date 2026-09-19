/**
 * Validates every JSON-LD block in a prerendered HTML file and reports
 * schema @type coverage — mirrors what a rich-results validator checks.
 *
 * Usage: node scripts/validate-jsonld.js dist/index.html
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const file = process.argv[2] || "dist/index.html";
if (!existsSync(resolve(file))) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const html = readFileSync(resolve(file), "utf8");
const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

let valid = 0;
let invalid = 0;
const types = [];

for (const m of blocks) {
  try {
    const parsed = JSON.parse(m[1]);
    valid++;
    if (Array.isArray(parsed["@type"])) types.push(...parsed["@type"]);
    else if (parsed["@type"]) types.push(parsed["@type"]);
  } catch (e) {
    invalid++;
    console.log(`  INVALID JSON-LD: ${e.message}`);
  }
}

console.log(`File: ${file}`);
console.log(`JSON-LD blocks: ${blocks.length} (valid: ${valid}, invalid: ${invalid})`);
console.log(`Schema types: ${[...new Set(types)].join(", ") || "(none)"}`);
console.log(invalid === 0 ? "✓ All structured data is valid JSON" : "✗ Some blocks are invalid");
process.exit(invalid > 0 ? 1 : 0);
