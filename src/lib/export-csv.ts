import * as XLSX from "xlsx";

// ─── Shared helpers ──────────────────────────────────────────────────

function downloadBlob(content: string | ArrayBuffer, filename: string, type: string) {
  const blob = content instanceof ArrayBuffer
    ? new Blob([content], { type })
    : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const escape = (v: string) => {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
};

function arrayToXlsx(data: Record<string, any>[], sheetName = "Sheet1"): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

// ─── Generic data export (CSV / JSON / Excel) ───────────────────────

export function exportDataFile(
  rows: Record<string, any>[],
  format: "csv" | "json" | "xlsx",
  filename: string
) {
  const baseName = filename.replace(/\.\w+$/, "");
  if (format === "json") {
    downloadBlob(JSON.stringify(rows, null, 2), `${baseName}.json`, "application/json;charset=utf-8;");
  } else if (format === "xlsx") {
    const buf = arrayToXlsx(rows);
    downloadBlob(buf, `${baseName}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  } else {
    if (rows.length === 0) {
      downloadBlob("", `${baseName}.csv`, "text/csv;charset=utf-8;");
      return;
    }
    const headers = Object.keys(rows[0]);
    const csvRows = rows.map(r => headers.map(h => escape(String(r[h] ?? ""))).join(","));
    downloadBlob([headers.map(h => escape(h)).join(","), ...csvRows].join("\n"), `${baseName}.csv`, "text/csv;charset=utf-8;");
  }
}

// ─── Parse Excel / JSON / CSV file to rows ──────────────────────────

export async function parseUploadedFile(file: File): Promise<{
  headers: string[];
  rowData: Record<string, string>[];
  rows: string[][];
  delimiter: string;
}> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "json") {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    if (arr.length === 0) return { headers: [], rowData: [], rows: [], delimiter: "," };
    const headers = Object.keys(arr[0]);
    const rowData = arr.map((r: any) => headers.reduce((acc, h) => ({ ...acc, [h]: String(r[h] ?? "") }), {} as Record<string, string>));
    const rows = rowData.map(r => headers.map(h => r[h]));
    return { headers, rowData, rows, delimiter: "," };
  }

  if (ext === "xlsx" || ext === "xls") {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    if (jsonData.length === 0) return { headers: [], rowData: [], rows: [], delimiter: "," };
    const headers = Object.keys(jsonData[0]);
    const rowData = jsonData.map(r => headers.reduce((acc, h) => ({ ...acc, [h]: String(r[h] ?? "") }), {} as Record<string, string>));
    const rows = rowData.map(r => headers.map(h => r[h]));
    return { headers, rowData, rows, delimiter: "," };
  }

  // Default: CSV/TSV/TXT
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let invalidUtf8 = 0;
  for (let i = 0; i < Math.min(bytes.length, 4096); i++) {
    if (bytes[i] > 127 && !(bytes[i] >= 0xC0 && bytes[i] <= 0xFD) && !(bytes[i] >= 0x80 && bytes[i] <= 0xBF)) {
      invalidUtf8++;
    }
  }
  const encoding = invalidUtf8 > 5 ? "latin1" : "utf-8";
  const decoder = new TextDecoder(encoding === "latin1" ? "iso-8859-1" : encoding);
  const text = decoder.decode(buffer);
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rowData: [], rows: [], delimiter: "," };

  const detectDelimiter = (line: string) => {
    if (line.includes("\t")) return "\t";
    const semi = line.split(";").length;
    const comma = line.split(",").length;
    const pipe = line.split("|").length;
    if (semi > comma && semi > pipe) return ";";
    if (pipe > comma && pipe > semi) return "|";
    return ",";
  };
  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ""));
  const rawRows = lines.slice(1).map(line =>
    line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ""))
  );
  const rowData = rawRows.map(values =>
    headers.reduce((acc, h, i) => ({ ...acc, [h]: values[i] || "" }), {} as Record<string, string>)
  );
  return { headers, rows: rawRows, rowData, delimiter };
}

// ─── Legacy exports (used by other pages) ────────────────────────────

export function exportPagesCsv(
  pages: { title: string; slug: string; status: string; external_url?: string | null; error_message?: string | null }[],
  filename = "generated-pages.csv"
) {
  const rows = pages.map(p => ({
    Title: p.title || "",
    Slug: p.slug || "",
    Status: p.status || "",
    URL: p.external_url || "",
    "Error Message": p.error_message || "",
  }));
  exportDataFile(rows, "csv", filename);
}

export function exportPagesJson(
  pages: Record<string, any>[],
  filename = "generated-pages.json"
) {
  exportDataFile(pages, "json", filename);
}

export function exportLogsCsv(
  logs: { event: string; message?: string | null; batch_number?: number | null; pages_in_batch?: number | null; created_at: string }[],
  campaignName = "campaign"
) {
  const rows = logs.map(l => ({
    Timestamp: new Date(l.created_at).toISOString(),
    Event: l.event || "",
    Message: l.message || "",
    "Batch Number": l.batch_number != null ? String(l.batch_number) : "",
    "Pages in Batch": l.pages_in_batch != null ? String(l.pages_in_batch) : "",
  }));
  exportDataFile(rows, "csv", `${campaignName}-logs.csv`);
}

export function exportExecutionHistoryCsv(
  jobs: { id: string; status: string; started_at?: string | null; completed_at?: string | null; success_count: number; error_count: number; total_rows: number; processed_rows: number }[],
  campaignName = "campaign"
) {
  const rows = jobs.map(j => {
    const duration = j.started_at && j.completed_at
      ? String(Math.round((new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()) / 1000))
      : "";
    return {
      "Job ID": j.id,
      Status: j.status,
      "Started At": j.started_at ? new Date(j.started_at).toISOString() : "",
      "Completed At": j.completed_at ? new Date(j.completed_at).toISOString() : "",
      "Duration (s)": duration,
      "Total Rows": String(j.total_rows),
      Processed: String(j.processed_rows),
      Success: String(j.success_count),
      Errors: String(j.error_count),
    };
  });
  exportDataFile(rows, "csv", `${campaignName}-execution-history.csv`);
}

export function exportErrorsCsv(
  errorPages: { title: string; slug: string; error_message?: string | null }[],
  jobErrors: any[],
  campaignName = "campaign"
) {
  const pageRows = errorPages.map(p => ({
    Source: "page",
    "Title/Row": p.title || "",
    Slug: p.slug || "",
    "Error Message": p.error_message || "",
  }));
  const jobRows = jobErrors.map(err => {
    const row = typeof err === "object" && err !== null ? err.row : undefined;
    const msg = typeof err === "object" && err !== null ? (err.message || err.error || JSON.stringify(err)) : String(err);
    return {
      Source: "job",
      "Title/Row": row !== undefined ? `Row ${row}` : "",
      Slug: "",
      "Error Message": msg,
    };
  });
  exportDataFile([...pageRows, ...jobRows], "csv", `${campaignName}-errors.csv`);
}
