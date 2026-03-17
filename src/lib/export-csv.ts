/**
 * Export an array of generated pages to a CSV file and trigger browser download.
 */
export function exportPagesCsv(
  pages: { title: string; slug: string; status: string; external_url?: string | null; error_message?: string | null }[],
  filename = "generated-pages.csv"
) {
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const header = "Title,Slug,Status,URL,Error Message";
  const rows = pages.map((p) =>
    [
      escape(p.title || ""),
      escape(p.slug || ""),
      escape(p.status || ""),
      escape(p.external_url || ""),
      escape(p.error_message || ""),
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");
  downloadBlob(csv, filename, "text/csv;charset=utf-8;");
}

/**
 * Export any array of objects as a JSON file and trigger browser download.
 */
export function exportPagesJson(
  pages: Record<string, any>[],
  filename = "generated-pages.json"
) {
  const json = JSON.stringify(pages, null, 2);
  downloadBlob(json, filename, "application/json;charset=utf-8;");
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
