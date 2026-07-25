import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, ArrowRight, X, ArrowUp, ArrowDown, Trash2, RotateCcw, AlertCircle } from "lucide-react";

export interface ImportPreviewVariable {
  name: string;
  original: string;
}

interface ImportPreviewDialogProps {
  open: boolean;
  onCancel: () => void;
  /** Called with the final (edited) mapping + rewritten HTML when the user continues. */
  onContinue: (result: { fullContent: string; variables: ImportPreviewVariable[] }) => void;
  pageTitle: string;
  fullContent: string;
  variables: ImportPreviewVariable[];
}

interface EditableVar extends ImportPreviewVariable {
  originalName: string;
  removed: boolean;
}

const normalizeName = (raw: string) =>
  raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 42);

/**
 * Post-import editor. Lets the user rename each detected variable, reorder the
 * list, or remove a variable entirely (which restores its original text). The
 * live preview reflects every edit before the template enters the full editor.
 */
export function ImportPreviewDialog({
  open,
  onCancel,
  onContinue,
  pageTitle,
  fullContent,
  variables,
}: ImportPreviewDialogProps) {
  const [rows, setRows] = useState<EditableVar[]>([]);

  useEffect(() => {
    if (!open) return;
    setRows(variables.map((v) => ({ ...v, originalName: v.name, removed: false })));
  }, [open, variables]);

  // Apply every rename/removal against the imported HTML. Renames swap
  // `{oldName}` → `{newName}`; removals swap `{name}` back to the original
  // literal text so the preview accurately mirrors the final template.
  const editedContent = useMemo(() => {
    let out = fullContent;
    for (const row of rows) {
      const from = `\\{${row.originalName}\\}`;
      const re = new RegExp(from, "g");
      if (row.removed) {
        out = out.replace(re, row.original);
      } else if (row.name && row.name !== row.originalName) {
        out = out.replace(re, `{${row.name}}`);
      }
    }
    return out;
  }, [fullContent, rows]);

  // Duplicate-name detection (only counts kept rows with a non-empty name).
  const dupeNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (r.removed || !r.name) continue;
      counts.set(r.name, (counts.get(r.name) || 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [rows]);

  const invalidNames = useMemo(() =>
    new Set(rows.filter((r) => !r.removed && !/^[a-z][a-z0-9_]{0,41}$/.test(r.name)).map((r) => r.name || r.originalName)),
    [rows],
  );

  const highlightedHtml = useMemo(() => {
    if (!editedContent) return "";
    const cleaned = editedContent
      .replace(/<!--\s*STYLES\s*-->/gi, "")
      .replace(/<!--\s*\/STYLES\s*-->/gi, "");
    const injected = cleaned.replace(
      /\{([a-z0-9_]{2,60})\}/gi,
      (_m, name) =>
        `<span style="background:#22c55e33;color:#22c55e;border:1px solid #22c55e66;padding:0 4px;border-radius:4px;font-weight:600;font-family:ui-monospace,monospace;font-size:0.9em;">{${name}}</span>`,
    );
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"></head><body style="margin:0;background:#fff;color:#111;">${injected}</body></html>`;
  }, [editedContent]);

  const move = (idx: number, dir: -1 | 1) => {
    setRows((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const rename = (idx: number, raw: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, name: raw } : r)));
  };

  const toggleRemove = (idx: number) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, removed: !r.removed } : r)));
  };

  const resetAll = () => {
    setRows(variables.map((v) => ({ ...v, originalName: v.name, removed: false })));
  };

  const activeCount = rows.filter((r) => !r.removed).length;
  const hasErrors = dupeNames.size > 0 || invalidNames.size > 0;

  const handleContinue = () => {
    if (hasErrors) return;
    // Normalize each name once more before handoff.
    const finalRows = rows
      .filter((r) => !r.removed)
      .map((r) => ({ name: normalizeName(r.name) || r.originalName, original: r.original }));
    onContinue({ fullContent: editedContent, variables: finalRows });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="sm:max-w-[min(96vw,80rem)] max-h-[92dvh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="px-5 py-3 border-b bg-card shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Import preview — adjust variable mapping
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Rename, reorder or remove detected variables in <span className="font-medium text-foreground">{pageTitle || "the imported page"}</span>.
            <Badge variant="secondary" className="ml-2">{activeCount} active</Badge>
            {rows.length !== activeCount && (
              <Badge variant="outline" className="ml-1">{rows.length - activeCount} removed</Badge>
            )}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] flex-1 min-h-0">
          {/* Editable variable list */}
          <div className="border-r bg-muted/20 flex flex-col min-h-0">
            <div className="px-3 py-2 border-b flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                Variables ({activeCount})
              </span>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={resetAll}>
                <RotateCcw className="h-3 w-3 mr-1" /> Reset
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <ul className="p-2 space-y-1.5">
                {rows.length === 0 && (
                  <li className="text-xs text-muted-foreground italic p-3">
                    No variables detected — you can still add them in the editor.
                  </li>
                )}
                {rows.map((row, idx) => {
                  const dupe = !row.removed && dupeNames.has(row.name);
                  const invalid = !row.removed && !/^[a-z][a-z0-9_]{0,41}$/.test(row.name);
                  return (
                    <li
                      key={`${row.originalName}-${idx}`}
                      className={`rounded-md border bg-card p-2 space-y-1.5 ${row.removed ? "opacity-50" : ""} ${dupe || invalid ? "border-destructive/60" : ""}`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-muted-foreground w-6 text-center shrink-0">#{idx + 1}</span>
                        <span className="text-[10px] font-mono text-muted-foreground mr-1">{"{"}</span>
                        <Input
                          value={row.name}
                          onChange={(e) => rename(idx, e.target.value)}
                          disabled={row.removed}
                          spellCheck={false}
                          className="h-7 text-xs font-mono px-2"
                          placeholder="variable_name"
                        />
                        <span className="text-[10px] font-mono text-muted-foreground ml-1">{"}"}</span>
                        <div className="flex items-center ml-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={idx === 0}
                            onClick={() => move(idx, -1)}
                            title="Move up"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={idx === rows.length - 1}
                            onClick={() => move(idx, 1)}
                            title="Move down"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-6 w-6 ${row.removed ? "text-primary" : "text-destructive"}`}
                            onClick={() => toggleRemove(idx)}
                            title={row.removed ? "Restore variable" : "Remove variable (keeps original text)"}
                          >
                            {row.removed ? <RotateCcw className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground pl-7 truncate" title={row.original}>
                        ← {row.original}
                      </div>
                      {(dupe || invalid) && (
                        <div className="text-[10px] text-destructive pl-7 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {dupe ? "Duplicate name" : "Use lowercase_snake_case starting with a letter"}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </div>

          {/* Live preview */}
          <div className="flex flex-col min-h-0 bg-background">
            <div className="px-4 py-2 border-b text-[11px] uppercase tracking-wide text-muted-foreground font-semibold shrink-0 flex items-center justify-between">
              <span>Live preview</span>
              <span className="text-[10px] normal-case tracking-normal">
                Green pills reflect your current mapping.
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <iframe
                title="Import preview"
                sandbox="allow-same-origin"
                srcDoc={highlightedHtml}
                className="w-full h-full border-0 bg-white"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t bg-card shrink-0">
          <p className="text-[11px] text-muted-foreground">
            {hasErrors
              ? "Fix duplicate or invalid variable names before continuing."
              : "Order here becomes the default order in CSVs and Keyword Groups."}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="h-3.5 w-3.5 mr-1.5" /> Discard
            </Button>
            <Button size="sm" onClick={handleContinue} disabled={hasErrors}>
              Continue to editor <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
