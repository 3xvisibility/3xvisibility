/**
 * Automated generator that ensures every locale file in src/i18n/locales/
 * contains the required sidebar.pgp* keys with correct formatting.
 *
 * Usage:  npx tsx scripts/ensure-pgp-keys.ts [--fix]
 *   --fix   Write corrected files (default: dry-run / report only)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, "../src/i18n/locales");

// Canonical translations per locale (ISO code → translations)
const PGP_TRANSLATIONS: Record<string, Record<string, string>> = {
  ar: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "الكلمات الرئيسية", "sidebar.pgpGenerate": "توليد", "sidebar.pgpTerms": "الشروط" },
  bn: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "কীওয়ার্ড", "sidebar.pgpGenerate": "জেনারেট", "sidebar.pgpTerms": "টার্মস" },
  cs: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Klíčová slova", "sidebar.pgpGenerate": "Generovat", "sidebar.pgpTerms": "Podmínky" },
  da: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Nøgleord", "sidebar.pgpGenerate": "Generer", "sidebar.pgpTerms": "Vilkår" },
  de: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Schlüsselwörter", "sidebar.pgpGenerate": "Generieren", "sidebar.pgpTerms": "Begriffe" },
  el: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Λέξεις-κλειδιά", "sidebar.pgpGenerate": "Δημιουργία", "sidebar.pgpTerms": "Όροι" },
  es: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Palabras clave", "sidebar.pgpGenerate": "Generar", "sidebar.pgpTerms": "Términos" },
  fi: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Avainsanat", "sidebar.pgpGenerate": "Luo", "sidebar.pgpTerms": "Ehdot" },
  fr: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Mots-clés", "sidebar.pgpGenerate": "Générer", "sidebar.pgpTerms": "Termes" },
  he: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "מילות מפתח", "sidebar.pgpGenerate": "יצירה", "sidebar.pgpTerms": "תנאים" },
  hi: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "कीवर्ड", "sidebar.pgpGenerate": "जनरेट", "sidebar.pgpTerms": "शर्तें" },
  hu: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Kulcsszavak", "sidebar.pgpGenerate": "Generálás", "sidebar.pgpTerms": "Feltételek" },
  id: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Kata Kunci", "sidebar.pgpGenerate": "Hasilkan", "sidebar.pgpTerms": "Ketentuan" },
  it: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Parole chiave", "sidebar.pgpGenerate": "Genera", "sidebar.pgpTerms": "Termini" },
  ja: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "キーワード", "sidebar.pgpGenerate": "生成", "sidebar.pgpTerms": "用語" },
  ko: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "키워드", "sidebar.pgpGenerate": "생성", "sidebar.pgpTerms": "용어" },
  ms: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Kata Kunci", "sidebar.pgpGenerate": "Jana", "sidebar.pgpTerms": "Terma" },
  nl: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Trefwoorden", "sidebar.pgpGenerate": "Genereren", "sidebar.pgpTerms": "Termen" },
  no: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Nøkkelord", "sidebar.pgpGenerate": "Generer", "sidebar.pgpTerms": "Vilkår" },
  pl: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Słowa kluczowe", "sidebar.pgpGenerate": "Generuj", "sidebar.pgpTerms": "Warunki" },
  pt: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Palavras-chave", "sidebar.pgpGenerate": "Gerar", "sidebar.pgpTerms": "Termos" },
  ro: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Cuvinte cheie", "sidebar.pgpGenerate": "Generare", "sidebar.pgpTerms": "Termeni" },
  ru: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Ключевые слова", "sidebar.pgpGenerate": "Генерация", "sidebar.pgpTerms": "Термины" },
  sv: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Nyckelord", "sidebar.pgpGenerate": "Generera", "sidebar.pgpTerms": "Villkor" },
  th: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "คำสำคัญ", "sidebar.pgpGenerate": "สร้าง", "sidebar.pgpTerms": "เงื่อนไข" },
  tr: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Anahtar Kelimeler", "sidebar.pgpGenerate": "Oluştur", "sidebar.pgpTerms": "Koşullar" },
  uk: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Ключові слова", "sidebar.pgpGenerate": "Генерація", "sidebar.pgpTerms": "Умови" },
  vi: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "Từ khóa", "sidebar.pgpGenerate": "Tạo", "sidebar.pgpTerms": "Điều khoản" },
  zh: { "sidebar.pgpSection": "Page Generator Pro", "sidebar.pgpKeywords": "关键词", "sidebar.pgpGenerate": "生成", "sidebar.pgpTerms": "条款" },
};

const REQUIRED_KEYS = ["sidebar.pgpSection", "sidebar.pgpKeywords", "sidebar.pgpGenerate", "sidebar.pgpTerms"];

const fix = process.argv.includes("--fix");

let issues = 0;
let fixed = 0;

for (const file of fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".ts"))) {
  const locale = file.replace(".ts", "");
  const filePath = path.join(LOCALES_DIR, file);
  const content = fs.readFileSync(filePath, "utf-8");

  const translations = PGP_TRANSLATIONS[locale];
  if (!translations) {
    console.warn(`⚠  No PGP translations defined for locale "${locale}" — skipping`);
    continue;
  }

  // Check which keys are missing or outside the object literal
  const missing: string[] = [];
  for (const key of REQUIRED_KEYS) {
    // Must appear as "key": "value" BEFORE the closing };
    const regex = new RegExp(`"${key.replace(".", "\\.")}"\\s*:\\s*"[^"]*"`);
    const closingIndex = content.lastIndexOf("};");
    const objectBody = content.slice(0, closingIndex);
    if (!regex.test(objectBody)) {
      missing.push(key);
    }
  }

  if (missing.length === 0) continue;

  issues++;
  console.log(`❌ ${file}: missing/misplaced keys: ${missing.join(", ")}`);

  if (!fix) continue;

  // Strategy: Remove any stray pgp keys after }; then inject all 4 keys before };
  let patched = content;

  // 1. Remove any existing pgp keys (wherever they appear)
  for (const key of REQUIRED_KEYS) {
    const escapedKey = key.replace(".", "\\.");
    patched = patched.replace(new RegExp(`\\s*"${escapedKey}"\\s*:\\s*"[^"]*"\\s*,?`, "g"), "");
  }

  // 2. Build the line to insert
  const pairs = REQUIRED_KEYS.map((k) => `"${k}": "${translations[k]}"`).join(", ");
  const insertLine = `  ${pairs},`;

  // 3. Insert before the closing };
  const closingIdx = patched.lastIndexOf("};");
  if (closingIdx === -1) {
    console.error(`  ⚠  Could not find closing }; in ${file}`);
    continue;
  }

  // Ensure trailing comma on previous line
  const before = patched.slice(0, closingIdx).trimEnd();
  const needsComma = !before.endsWith(",");
  const after = patched.slice(closingIdx);

  patched = before + (needsComma ? "," : "") + "\n" + insertLine + "\n" + after;

  fs.writeFileSync(filePath, patched, "utf-8");
  fixed++;
  console.log(`  ✅ Fixed ${file}`);
}

if (issues === 0) {
  console.log("✅ All locale files have correct sidebar.pgp* keys.");
} else if (!fix) {
  console.log(`\n${issues} file(s) with issues. Run with --fix to auto-repair.`);
} else {
  console.log(`\n${fixed}/${issues} file(s) fixed.`);
}

process.exit(issues > 0 && !fix ? 1 : 0);
