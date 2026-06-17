import JSZip from "jszip";
import type { MarketplaceTemplate } from "@/lib/marketplace-templates";
import { applyTemplateDefaults } from "@/lib/marketplace-templates";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "template";
}

function wrapHtml(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body>
${body}
</body>
</html>`;
}

/**
 * One-click export of a marketplace template's design/code files as a .zip:
 *  • index.html        — preview-ready page with default values filled in
 *  • template.html     — raw source with {variables} intact
 *  • variables.json    — variable list + default values
 *  • template.json     — full metadata (seo patterns, tags, category…)
 *  • README.txt        — usage notes
 */
export async function exportTemplateZip(tpl: MarketplaceTemplate) {
  const zip = new JSZip();
  const slug = slugify(tpl.name);

  const rendered = applyTemplateDefaults(tpl.content, tpl.defaultValues);
  zip.file("index.html", wrapHtml(tpl.name, rendered));
  zip.file("template.html", wrapHtml(tpl.name, tpl.content));

  zip.file(
    "variables.json",
    JSON.stringify({ variables: tpl.variables, defaultValues: tpl.defaultValues ?? {} }, null, 2),
  );

  zip.file(
    "template.json",
    JSON.stringify(
      {
        id: tpl.id,
        name: tpl.name,
        description: tpl.description,
        category: tpl.category,
        platform: tpl.platform,
        tags: tpl.tags,
        author: tpl.author,
        schema_type: tpl.schema_type,
        slug_pattern: tpl.slug_pattern,
        seo_title_pattern: tpl.seo_title_pattern,
        seo_description_pattern: tpl.seo_description_pattern,
      },
      null,
      2,
    ),
  );

  zip.file(
    "README.txt",
    `${tpl.name}\n${"=".repeat(tpl.name.length)}\n\n${tpl.description}\n\n` +
      `Files:\n` +
      `- index.html     Preview-ready page (default values filled in)\n` +
      `- template.html  Raw design source ({variables} kept for your data)\n` +
      `- variables.json ${tpl.variables.length} variables and their defaults\n` +
      `- template.json  Full template metadata + SEO patterns\n\n` +
      `Exported from your marketplace.\n`,
  );

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
