import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, ArrowRight, X, ArrowUp, ArrowDown, Trash2, RotateCcw, AlertCircle, Plus, ListOrdered } from "lucide-react";
import { validateVariableValue, detectVariableFormat } from "@/lib/variable-format";


export interface ImportPreviewVariable {
  name: string;
  original: string;
}

interface ImportPreviewDialogProps {
  open: boolean;
  onCancel: () => void;
  onContinue: (result: { fullContent: string; variables: ImportPreviewVariable[] }) => void;
  pageTitle: string;
  fullContent: string;
  variables: ImportPreviewVariable[];
}

interface EditableVar extends ImportPreviewVariable {
  originalName: string;
  removed: boolean;
  /** True for list items the user added in this dialog (no source HTML anchor). */
  isNew?: boolean;
}

const LIST_RE = /^list_(\d+)_item_(\d+)$/;

const normalizeName = (raw: string) =>
  raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 42);

function escapeReg(v: string) {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Remove the entire <li>…</li> that contains {placeholder}. */
function removeListItemBlock(html: string, placeholder: string) {
  const re = new RegExp(`<li\\b[^>]*>[\\s\\S]*?\\{${escapeReg(placeholder)}\\}[\\s\\S]*?<\\/li>\\s*`, "g");
  return html.replace(re, "");
}

/** Insert a new <li>{placeholder}</li> before the closing tag of the Nth list (1-based). */
function appendItemToNthList(html: string, listOrdinal: number, placeholder: string) {
  const re = /<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let n = 0;
  let out = html;
  let match: RegExpExecArray | null;
  // Rebuild with a running index — replace only the Nth occurrence.
  out = out.replace(re, (full, tag) => {
    n += 1;
    if (n !== listOrdinal) return full;
    return full.replace(new RegExp(`</${tag}>\\s*$`, "i"), `<li>{${placeholder}}</li></${tag}>`);
  });
  return out;
}

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

  // Split rows into list groups vs general rows while preserving order.
  const { listGroups, generalRows, listOrder } = useMemo(() => {
    const groups = new Map<number, EditableVar[]>();
    const order: number[] = [];
    const general: EditableVar[] = [];
    for (const row of rows) {
      const m = row.originalName.match(LIST_RE) || row.name.match(LIST_RE);
      if (m) {
        const num = Number(m[1]);
        if (!groups.has(num)) {
          groups.set(num, []);
          order.push(num);
        }
        groups.get(num)!.push(row);
      } else {
        general.push(row);
      }
    }
    return { listGroups: groups, generalRows: general, listOrder: order };
  }, [rows]);

  // Compose final HTML: renames, removals, list re-numbering, list additions,
  // and list-item block removals — in that order so tokens don't collide.
  const editedContent = useMemo(() => {
    let out = fullContent;

    // 1) Non-list renames + removals (unchanged behaviour).
    for (const row of generalRows) {
      const re = new RegExp(`\\{${escapeReg(row.originalName)}\\}`, "g");
      if (row.removed) {
        out = out.replace(re, row.original);
      } else if (row.name && row.name !== row.originalName) {
        out = out.replace(re, `{${row.name}}`);
      }
    }

    // 2) For each list group: drop removed items' <li> blocks, then renumber
    //    kept items to match their new position (1-based). Use a two-pass
    //    rename via unique sentinels to avoid collisions like 1↔2 swaps.
    for (const listNum of listOrder) {
      const items = listGroups.get(listNum) || [];
      // Remove blocks for removed, non-new items.
      for (const it of items) {
        if (it.removed && !it.isNew) {
          out = removeListItemBlock(out, it.originalName);
        }
      }
      // Renumber kept items.
      const kept = items.filter((it) => !it.removed);
      // Pass A: originalName → sentinel
      kept.forEach((it, idx) => {
        if (it.isNew) return;
        const sentinel = `__PGP_LIST_${listNum}_SENTINEL_${idx + 1}__`;
        const re = new RegExp(`\\{${escapeReg(it.originalName)}\\}`, "g");
        out = out.replace(re, `{${sentinel}}`);
      });
      // Pass B: sentinel → final name
      kept.forEach((it, idx) => {
        if (it.isNew) return;
        const sentinel = `__PGP_LIST_${listNum}_SENTINEL_${idx + 1}__`;
        const finalName = `list_${listNum}_item_${idx + 1}`;
        const re = new RegExp(`\\{${escapeReg(sentinel)}\\}`, "g");
        out = out.replace(re, `{${finalName}}`);
      });
      // Append newly-added items to the Nth <ul>/<ol>.
      kept.forEach((it, idx) => {
        if (!it.isNew) return;
        const finalName = `list_${listNum}_item_${idx + 1}`;
        out = appendItemToNthList(out, listNum, finalName);
      });
    }

    return out;
  }, [fullContent, generalRows, listGroups, listOrder]);

  const dupeNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of generalRows) {
      if (r.removed || !r.name) continue;
      counts.set(r.name, (counts.get(r.name) || 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [generalRows]);

  const invalidNames = useMemo(
    () =>
      new Set(
        generalRows
          .filter((r) => !r.removed && !/^[a-z][a-z0-9_]{0,41}$/.test(r.name))
          .map((r) => r.name || r.originalName),
      ),
    [generalRows],
  );

  /**
   * Map of variable name → format-issue reason for rows whose sample value
   * (the extracted `original` text) doesn't match the format expected for
   * the variable name — e.g. `{cta_url}` mapped onto "Learn more".
   */
  const formatIssues = useMemo(() => {
    const map = new Map<string, { reason: string; expected: string }>();
    for (const r of rows) {
      if (r.removed || !r.name) continue;
      if (!/^[a-z][a-z0-9_]{0,41}$/.test(r.name)) continue;
      const expected = detectVariableFormat(r.name);
      if (expected === "text") continue;
      const issue = validateVariableValue(r.name, r.original || "");
      if (issue) map.set(r.originalName, { reason: issue.reason, expected });
    }
    return map;
  }, [rows]);


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

  // ------- Mutations against `rows` (source of truth) -------

  const findRowIndex = (originalName: string) =>
    rows.findIndex((r) => r.originalName === originalName);

  const moveGeneral = (idx: number, dir: -1 | 1) => {
    setRows((prev) => {
      // Reorder only within the general-row slice; keep list rows in place.
      const generals = prev.map((r, i) => ({ r, i })).filter(({ r }) => !(r.originalName.match(LIST_RE) || r.name.match(LIST_RE)));
      const j = idx + dir;
      if (j < 0 || j >= generals.length) return prev;
      const a = generals[idx].i;
      const b = generals[j].i;
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  };

  const rename = (originalName: string, raw: string) => {
    setRows((prev) => prev.map((r) => (r.originalName === originalName ? { ...r, name: raw } : r)));
  };

  const toggleRemove = (originalName: string) => {
    setRows((prev) =>
      prev
        .map((r) => (r.originalName === originalName ? { ...r, removed: !r.removed } : r))
        // Drop newly-added items entirely when the user removes them.
        .filter((r) => !(r.originalName === originalName && r.isNew && !r.removed ? false : true) || r.originalName !== originalName || !r.isNew || !r.removed)
    );
  };

  // Simpler removeNewItem for list groups (avoids the filter tangle above).
  const dropRow = (originalName: string) => {
    setRows((prev) => prev.filter((r) => r.originalName !== originalName));
  };

  const moveListItem = (listNum: number, itemIdx: number, dir: -1 | 1) => {
    setRows((prev) => {
      // Collect indices of rows belonging to this list.
      const listIndices: number[] = [];
      prev.forEach((r, i) => {
        const m = r.originalName.match(LIST_RE) || r.name.match(LIST_RE);
        if (m && Number(m[1]) === listNum) listIndices.push(i);
      });
      const j = itemIdx + dir;
      if (j < 0 || j >= listIndices.length) return prev;
      const a = listIndices[itemIdx];
      const b = listIndices[j];
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
  };

  const removeListItem = (row: EditableVar) => {
    if (row.isNew) {
      dropRow(row.originalName);
    } else {
      setRows((prev) =>
        prev.map((r) => (r.originalName === row.originalName ? { ...r, removed: !r.removed } : r)),
      );
    }
  };

  const addListItem = (listNum: number) => {
    setRows((prev) => {
      // Determine next suffix within this list.
      const listItems = prev.filter((r) => {
        const m = r.originalName.match(LIST_RE) || r.name.match(LIST_RE);
        return m && Number(m[1]) === listNum;
      });
      const nextSuffix =
        listItems.reduce((max, r) => {
          const m = (r.originalName.match(LIST_RE) || r.name.match(LIST_RE))!;
          return Math.max(max, Number(m[2]));
        }, 0) + 1;
      const newName = `list_${listNum}_item_${nextSuffix}`;
      // Insert right after the last existing row of this list to keep grouping.
      let lastIdx = -1;
      prev.forEach((r, i) => {
        const m = r.originalName.match(LIST_RE) || r.name.match(LIST_RE);
        if (m && Number(m[1]) === listNum) lastIdx = i;
      });
      const newRow: EditableVar = {
        name: newName,
        originalName: `__new__${newName}_${Date.now()}`,
        original: "New list item",
        removed: false,
        isNew: true,
      };
      const next = [...prev];
      next.splice(lastIdx + 1, 0, newRow);
      return next;
    });
  };

  const resetAll = () => {
    setRows(variables.map((v) => ({ ...v, originalName: v.name, removed: false })));
  };

  const activeCount = rows.filter((r) => !r.removed).length;
  const hasErrors = dupeNames.size > 0 || invalidNames.size > 0;

  const handleContinue = () => {
    if (hasErrors) return;
    // Final variables: general (respect edits) + renumbered list items.
    const finalVars: ImportPreviewVariable[] = [];
    for (const row of generalRows) {
      if (row.removed) continue;
      finalVars.push({ name: normalizeName(row.name) || row.originalName, original: row.original });
    }
    for (const listNum of listOrder) {
      const items = (listGroups.get(listNum) || []).filter((r) => !r.removed);
      items.forEach((it, idx) => {
        finalVars.push({ name: `list_${listNum}_item_${idx + 1}`, original: it.original });
      });
    }
    onContinue({ fullContent: editedContent, variables: finalVars });
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

        <div className="grid grid-cols-1 md:grid-cols-[420px_1fr] flex-1 min-h-0">
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
              <div className="p-2 space-y-3">
                {/* General variables */}
                {generalRows.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold px-1 pb-1">
                      Fields
                    </div>
                    <ul className="space-y-1.5">
                      {generalRows.map((row, idx) => {
                        const dupe = !row.removed && dupeNames.has(row.name);
                        const invalid = !row.removed && !/^[a-z][a-z0-9_]{0,41}$/.test(row.name);
                        const fmt = !row.removed ? formatIssues.get(row.originalName) : undefined;
                        const empty = !row.removed && !(row.original || "").trim();
                        const hasErr = dupe || invalid || !!fmt || empty;
                        return (
                          <li
                            key={`${row.originalName}-${idx}`}
                            className={`rounded-md border bg-card p-2 space-y-1.5 ${row.removed ? "opacity-50" : ""} ${hasErr ? "border-destructive/60" : ""}`}
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-mono text-muted-foreground w-6 text-center shrink-0">#{idx + 1}</span>
                              <span className="text-[10px] font-mono text-muted-foreground mr-1">{"{"}</span>
                              <Input
                                value={row.name}
                                onChange={(e) => rename(row.originalName, e.target.value)}
                                disabled={row.removed}
                                spellCheck={false}
                                className="h-7 text-xs font-mono px-2"
                                placeholder="variable_name"
                              />
                              <span className="text-[10px] font-mono text-muted-foreground ml-1">{"}"}</span>
                              <div className="flex items-center ml-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => moveGeneral(idx, -1)} title="Move up">
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === generalRows.length - 1} onClick={() => moveGeneral(idx, 1)} title="Move down">
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-6 w-6 ${row.removed ? "text-primary" : "text-destructive"}`}
                                  onClick={() => toggleRemove(row.originalName)}
                                  title={row.removed ? "Restore variable" : "Remove variable"}
                                >
                                  {row.removed ? <RotateCcw className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                            <div className="text-[11px] text-muted-foreground pl-7 truncate" title={row.original}>
                              ← {row.original || <span className="italic">(empty)</span>}
                            </div>
                            {(dupe || invalid) && (
                              <div className="text-[10px] text-destructive pl-7 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {dupe ? "Duplicate name" : "Use lowercase_snake_case starting with a letter"}
                              </div>
                            )}
                            {!dupe && !invalid && empty && (
                              <div className="text-[10px] text-destructive pl-7 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                No value mapped — provide a source or remove this variable
                              </div>
                            )}
                            {!dupe && !invalid && !empty && fmt && (
                              <div className="text-[10px] text-destructive pl-7 flex items-start gap-1">
                                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>
                                  <span className="font-semibold">Invalid {fmt.expected}:</span> {fmt.reason}
                                </span>
                              </div>
                            )}
                          </li>
                        );
                      })}

                    </ul>
                  </div>
                )}

                {/* List groups */}
                {listOrder.map((listNum) => {
                  const items = listGroups.get(listNum) || [];
                  const activeItems = items.filter((r) => !r.removed);
                  return (
                    <div key={`list-${listNum}`} className="rounded-lg border bg-card/50">
                      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/30">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
                          <ListOrdered className="h-3.5 w-3.5 text-primary" />
                          List {listNum}
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {activeItems.length} item{activeItems.length === 1 ? "" : "s"}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => addListItem(listNum)}>
                          <Plus className="h-3 w-3 mr-1" /> Add item
                        </Button>
                      </div>
                      <ul className="p-2 space-y-1.5">
                        {items.length === 0 && (
                          <li className="text-[11px] text-muted-foreground italic px-2 py-1.5">No items — click Add item.</li>
                        )}
                        {items.map((row, itemIdx) => (
                          <li
                            key={`${row.originalName}-${itemIdx}`}
                            className={`rounded-md border bg-background p-2 flex items-center gap-2 ${row.removed ? "opacity-50" : ""}`}
                          >
                            <span className="text-[10px] font-mono text-muted-foreground w-8 text-center shrink-0">
                              #{itemIdx + 1}
                            </span>
                            <Input
                              value={row.original}
                              onChange={(e) =>
                                setRows((prev) => prev.map((r) => (r.originalName === row.originalName ? { ...r, original: e.target.value } : r)))
                              }
                              disabled={row.removed}
                              spellCheck={false}
                              className="h-7 text-xs px-2"
                              placeholder="Item text"
                            />
                            <div className="flex items-center shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={itemIdx === 0}
                                onClick={() => moveListItem(listNum, itemIdx, -1)}
                                title="Move up"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={itemIdx === items.length - 1}
                                onClick={() => moveListItem(listNum, itemIdx, 1)}
                                title="Move down"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 ${row.removed ? "text-primary" : "text-destructive"}`}
                                onClick={() => removeListItem(row)}
                                title={row.isNew ? "Delete added item" : row.removed ? "Restore item" : "Remove item"}
                              >
                                {row.removed ? <RotateCcw className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="px-3 pb-2 text-[10px] text-muted-foreground">
                        Items are renumbered on save → <code>{`{list_${listNum}_item_1..${activeItems.length || 1}}`}</code>
                      </div>
                    </div>
                  );
                })}
              </div>
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
