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
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
