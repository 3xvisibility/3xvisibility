import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Database, Info, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  csvHeaders: string[];
  csvData: Record<string, string>[];
  /** Variables referenced in the selected template ({var}). */
  templateVars: string[];
  fileName?: string;
  className?: string;
}

/**
 * Pre-flight CSV validation panel. Runs BEFORE Generate & Publish:
 *   - Row / column preview (first 5 rows).
 *   - Missing columns (template variables that have no matching CSV column).
 *   - Extra columns (CSV columns not referenced anywhere in the template).
 *   - Empty cells (per column).
 *   - Duplicate rows (identical values across all columns).
 */
export function CsvValidationPanel({
  csvHeaders,
  csvData,
  templateVars,
  fileName,
  className,
}: Props) {
  const [showPreview, setShowPreview] = useState(true);

  const analysis = useMemo(() => {
    const headersLower = csvHeaders.map((h) => h.toLowerCase().trim());
    const varsLower = templateVars.map((v) => v.toLowerCase().trim());

    // Missing = template var with no matching header (exact or fuzzy contains).
    const missing = templateVars.filter((v) => {
      const vl = v.toLowerCase();
      return !headersLower.some((h) => h === vl || h.includes(vl) || vl.includes(h));
    });

    // Extra = CSV column that no template var references.
    const extra = csvHeaders.filter((h) => {
      const hl = h.toLowerCase();
      return !varsLower.some((v) => v === hl || v.includes(hl) || hl.includes(v));
    });

    // Empty-cell counts per column.
    const emptyByCol: Record<string, number> = {};
    for (const h of csvHeaders) {
      let n = 0;
      for (const row of csvData) {
        const v = row[h];
        if (v === undefined || v === null || String(v).trim() === "") n++;
      }
      if (n > 0) emptyByCol[h] = n;
    }

    // Duplicate rows (full-row equality on trimmed values).
    const seen = new Map<string, number>();
    let duplicates = 0;
    for (const row of csvData) {
      const key = csvHeaders.map((h) => String(row[h] ?? "").trim()).join("\u0001");
      const prev = seen.get(key) ?? 0;
      if (prev >= 1) duplicates++;
      seen.set(key, prev + 1);
    }

    return {
      missing,
      extra,
      emptyByCol,
      duplicates,
      totalRows: csvData.length,
      totalCols: csvHeaders.length,
    };
  }, [csvHeaders, csvData, templateVars]);

  if (csvHeaders.length === 0 || csvData.length === 0) return null;

  const hasBlocking = analysis.missing.length > 0;
  const hasWarnings = analysis.extra.length > 0 || Object.keys(analysis.emptyByCol).length > 0 || analysis.duplicates > 0;
  const clean = !hasBlocking && !hasWarnings;

  const previewRows = csvData.slice(0, 5);

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        hasBlocking
          ? "border-destructive/40 bg-destructive/5"
          : hasWarnings
          ? "border-warning/40 bg-warning/5"
          : "border-success/30 bg-success/5",
        className,
      )}
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 flex items-start gap-2.5">
        {hasBlocking ? (
          <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        ) : hasWarnings ? (
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold">
            {hasBlocking
              ? "CSV validation — issues must be fixed"
              : hasWarnings
              ? "CSV validation — review before generating"
              : "CSV looks good"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {fileName ? <>{fileName} · </> : null}
            {analysis.totalCols} column{analysis.totalCols !== 1 ? "s" : ""} · {analysis.totalRows} row
            {analysis.totalRows !== 1 ? "s" : ""}
            {templateVars.length > 0 && <> · matched against {templateVars.length} template variable{templateVars.length !== 1 ? "s" : ""}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1 shrink-0">
          {analysis.missing.length > 0 && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-destructive/10 text-destructive border-destructive/30">
              {analysis.missing.length} missing
            </Badge>
          )}
          {analysis.extra.length > 0 && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
              {analysis.extra.length} extra
            </Badge>
          )}
          {analysis.duplicates > 0 && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
              {analysis.duplicates} duplicate row{analysis.duplicates !== 1 ? "s" : ""}
            </Badge>
          )}
          {clean && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-success/10 text-success border-success/30">
              ready
            </Badge>
          )}
        </div>
      </div>

      {/* Issues */}
      {(hasBlocking || hasWarnings) && (
        <div className="px-3.5 pb-2.5 space-y-1.5 text-[11px]">
          {analysis.missing.length > 0 && (
            <div className="flex items-start gap-1.5">
              <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                <span className="font-semibold text-destructive">Missing columns:</span>{" "}
                {analysis.missing.map((v) => (
                  <code key={v} className="font-mono text-[10px] px-1 py-0.5 bg-destructive/10 text-destructive rounded mx-0.5">
                    {`{${v}}`}
                  </code>
                ))}
                <span className="ml-1 italic">— add these columns to your CSV or map them manually in Step 3.</span>
              </p>
            </div>
          )}
          {analysis.extra.length > 0 && (
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                <span className="font-semibold text-amber-600">Extra columns (not used by template):</span>{" "}
                {analysis.extra.slice(0, 8).map((h) => (
                  <code key={h} className="font-mono text-[10px] px-1 py-0.5 bg-amber-500/10 text-amber-600 rounded mx-0.5">
                    {h}
                  </code>
                ))}
                {analysis.extra.length > 8 && <span className="ml-1">+{analysis.extra.length - 8} more</span>}
              </p>
            </div>
          )}
          {Object.keys(analysis.emptyByCol).length > 0 && (
            <div className="flex items-start gap-1.5">
              <Info className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                <span className="font-semibold text-amber-600">Empty cells:</span>{" "}
                {Object.entries(analysis.emptyByCol)
                  .slice(0, 6)
                  .map(([h, n]) => (
                    <span key={h} className="mx-0.5">
                      <code className="font-mono text-[10px] px-1 py-0.5 bg-amber-500/10 text-amber-600 rounded">{h}</code>
                      <span className="text-[10px]"> ({n})</span>
                    </span>
                  ))}
                {Object.keys(analysis.emptyByCol).length > 6 && (
                  <span> +{Object.keys(analysis.emptyByCol).length - 6} more</span>
                )}
              </p>
            </div>
          )}
          {analysis.duplicates > 0 && (
            <div className="flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                <span className="font-semibold text-amber-600">{analysis.duplicates}</span> duplicate row
                {analysis.duplicates !== 1 ? "s" : ""} detected — may cause duplicate slugs / content.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Preview toggle */}
      <button
        type="button"
        onClick={() => setShowPreview((s) => !s)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2 border-t border-border/50 bg-background/40 hover:bg-background/70 transition-colors"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-medium">
          <Database className="h-3 w-3 text-primary" /> Preview (first {Math.min(5, previewRows.length)} row{previewRows.length !== 1 ? "s" : ""})
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", showPreview && "rotate-180")} />
      </button>

      {showPreview && (
        <div className="overflow-x-auto bg-background">
          <table className="w-full text-[11px] border-collapse">
            <thead className="bg-muted/40 sticky top-0">
              <tr>
                <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-8 border-b">#</th>
                {csvHeaders.map((h) => {
                  const isMissing = false; // headers we HAVE aren't "missing"
                  const isExtra = analysis.extra.includes(h);
                  return (
                    <th
                      key={h}
                      className={cn(
                        "text-left px-2 py-1.5 font-mono text-[10px] whitespace-nowrap border-b",
                        isExtra ? "text-amber-600" : "text-foreground",
                      )}
                      title={isExtra ? "Extra column — not referenced by the template" : ""}
                    >
                      {h}
                      {isExtra && <span className="ml-1 text-[9px]">(extra)</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                  <td className="px-2 py-1.5 text-muted-foreground tabular-nums">{i + 1}</td>
                  {csvHeaders.map((h) => {
                    const v = row[h];
                    const empty = v === undefined || v === null || String(v).trim() === "";
                    return (
                      <td
                        key={h}
                        className={cn(
                          "px-2 py-1.5 max-w-[220px] truncate",
                          empty ? "text-destructive/70 italic" : "text-foreground/80",
                        )}
                        title={empty ? "empty" : String(v)}
                      >
                        {empty ? "empty" : String(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {csvData.length > previewRows.length && (
            <p className="text-[10px] text-muted-foreground text-center py-1.5 border-t border-border/30">
              + {csvData.length - previewRows.length} more row{csvData.length - previewRows.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
