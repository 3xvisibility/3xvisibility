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

/**
 * Export campaign logs to CSV with URL, keywords used, status, performance, and date.
 */
export function exportLogsCsv(
  logs: { event: string; message?: string | null; batch_number?: number | null; pages_in_batch?: number | null; created_at: string }[],
  campaignName = "campaign"
) {
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const header = "Timestamp,Event,Message,Batch Number,Pages in Batch";
  const rows = logs.map((l) =>
    [
      escape(new Date(l.created_at).toISOString()),
      escape(l.event || ""),
      escape(l.message || ""),
      l.batch_number != null ? String(l.batch_number) : "",
      l.pages_in_batch != null ? String(l.pages_in_batch) : "",
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");
  downloadBlob(csv, `${campaignName}-logs.csv`, "text/csv;charset=utf-8;");
}

/**
 * Export execution history to CSV with detailed job info.
 */
export function exportExecutionHistoryCsv(
  jobs: { id: string; status: string; started_at?: string | null; completed_at?: string | null; success_count: number; error_count: number; total_rows: number; processed_rows: number }[],
  campaignName = "campaign"
) {
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const header = "Job ID,Status,Started At,Completed At,Duration (s),Total Rows,Processed,Success,Errors";
  const rows = jobs.map((j) => {
    const duration = j.started_at && j.completed_at
      ? String(Math.round((new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()) / 1000))
      : "";
    return [
      escape(j.id),
      escape(j.status),
      j.started_at ? new Date(j.started_at).toISOString() : "",
      j.completed_at ? new Date(j.completed_at).toISOString() : "",
      duration,
      String(j.total_rows),
      String(j.processed_rows),
      String(j.success_count),
      String(j.error_count),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  downloadBlob(csv, `${campaignName}-execution-history.csv`, "text/csv;charset=utf-8;");
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
