import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Library, Search, Check, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";

interface KeywordRow {
  id: string;
  name: string;
  terms: string[];
  term_count: number;
}

export interface KeywordsLibraryResult {
  headers: string[];
  rows: Record<string, string>[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (result: KeywordsLibraryResult) => void;
  /** Optional: template variables so we can highlight matching keywords first. */
  templateVariables?: string[];
}

const MAX_ROWS = 5000;

/** Cross-join a list of {name, values[]} into row objects. */
function crossJoin(cols: { name: string; values: string[] }[]): Record<string, string>[] {
  if (cols.length === 0) return [];
  let rows: Record<string, string>[] = [{}];
  for (const c of cols) {
    const values = c.values.length > 0 ? c.values : [""];
    const next: Record<string, string>[] = [];
    for (const r of rows) {
      for (const v of values) {
        next.push({ ...r, [c.name]: v });
        if (next.length >= MAX_ROWS) break;
      }
      if (next.length >= MAX_ROWS) break;
    }
    rows = next;
  }
  return rows;
}

export function KeywordsLibraryDialog({ open, onOpenChange, onInsert, templateVariables = [] }: Props) {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const wsId = currentWorkspace?.id;

  const [search, setSearch] = useState("");
  // keyword.id -> Set of selected term indices; presence in map = keyword selected
  const [selection, setSelection] = useState<Record<string, Set<string>>>({});

  const { data: keywords = [], isLoading, error } = useQuery({
    queryKey: ["pgp-keywords-library", wsId],
    enabled: !!wsId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pgp_keywords")
        .select("id, name, terms, term_count")
        .eq("workspace_id", wsId!)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []).map((d: any): KeywordRow => ({
        id: d.id,
        name: d.name,
        terms: Array.isArray(d.terms) ? (d.terms as string[]).map(String) : [],
        term_count: d.term_count ?? (Array.isArray(d.terms) ? d.terms.length : 0),
      }));
    },
  });

  useEffect(() => {
    if (!open) {
      setSelection({});
      setSearch("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q ? keywords.filter(k => k.name.toLowerCase().includes(q)) : keywords;
    // Bubble template-matching keywords to the top.
    const matchSet = new Set(templateVariables.map(v => v.toLowerCase()));
    return [...rows].sort((a, b) => {
      const am = matchSet.has(a.name.toLowerCase()) ? 0 : 1;
      const bm = matchSet.has(b.name.toLowerCase()) ? 0 : 1;
      return am - bm;
    });
  }, [keywords, search, templateVariables]);

  const toggleKeyword = (kw: KeywordRow) => {
    setSelection(prev => {
      const next = { ...prev };
      if (next[kw.id]) delete next[kw.id];
      else next[kw.id] = new Set(kw.terms); // all terms selected by default
      return next;
    });
  };

  const toggleTerm = (kwId: string, term: string) => {
    setSelection(prev => {
      const set = new Set(prev[kwId] || []);
      if (set.has(term)) set.delete(term);
      else set.add(term);
      return { ...prev, [kwId]: set };
    });
  };

  const selectAllTerms = (kw: KeywordRow, all: boolean) => {
    setSelection(prev => ({ ...prev, [kw.id]: new Set(all ? kw.terms : []) }));
  };

  const selectedCols = useMemo(() => {
    const cols: { name: string; values: string[] }[] = [];
    for (const kw of keywords) {
      const sel = selection[kw.id];
      if (!sel) continue;
      const values = kw.terms.filter(t => sel.has(t));
      if (values.length === 0) continue;
      cols.push({ name: kw.name, values });
    }
    return cols;
  }, [keywords, selection]);

  const totalRows = useMemo(() => {
    if (selectedCols.length === 0) return 0;
    return selectedCols.reduce((acc, c) => acc * c.values.length, 1);
  }, [selectedCols]);

  const overLimit = totalRows > MAX_ROWS;

  const handleInsert = () => {
    if (selectedCols.length === 0) {
      toast({ title: "Select at least one keyword", variant: "destructive" });
      return;
    }
    const rows = crossJoin(selectedCols);
    onInsert({ headers: selectedCols.map(c => c.name), rows });
    onOpenChange(false);
    toast({
      title: "Keywords added",
      description: `${rows.length} row${rows.length !== 1 ? "s" : ""} from ${selectedCols.length} keyword${selectedCols.length !== 1 ? "s" : ""}.`,
    });
  };

  const selectedKwCount = Object.keys(selection).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90dvh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" />
            Keywords Library
          </DialogTitle>
          <DialogDescription>
            Pick variables and values from your Keywords page. Selected keywords will be cross-joined into campaign rows.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-3 border-b bg-muted/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search keywords..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading keywords...
            </div>
          ) : error ? (
            <div className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Failed to load keywords.
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {keywords.length === 0
                ? "No keywords yet. Add some on the Keywords page first."
                : "No matches for your search."}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(kw => {
                const isSelected = !!selection[kw.id];
                const selectedTerms = selection[kw.id];
                const matchesTemplate = templateVariables.some(v => v.toLowerCase() === kw.name.toLowerCase());
                return (
                  <div
                    key={kw.id}
                    className={`rounded-lg border transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleKeyword(kw)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                    >
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted">{`{${kw.name}}`}</code>
                        {matchesTemplate && (
                          <Badge variant="secondary" className="h-4 text-[9px] px-1.5 gap-0.5">
                            <Check className="h-2.5 w-2.5" /> in template
                          </Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {kw.term_count} term{kw.term_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </button>

                    {isSelected && kw.terms.length > 0 && (
                      <div className="border-t border-border/60 px-3 py-2 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">
                            {selectedTerms?.size || 0} of {kw.terms.length} values selected
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => selectAllTerms(kw, true)}
                              className="text-[10px] px-1.5 py-0.5 rounded hover:bg-muted"
                            >
                              All
                            </button>
                            <button
                              type="button"
                              onClick={() => selectAllTerms(kw, false)}
                              className="text-[10px] px-1.5 py-0.5 rounded hover:bg-muted"
                            >
                              None
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {kw.terms.slice(0, 200).map(term => {
                            const on = selectedTerms?.has(term);
                            return (
                              <button
                                key={term}
                                type="button"
                                onClick={() => toggleTerm(kw.id, term)}
                                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                                  on
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background border-border hover:border-primary/40"
                                }`}
                              >
                                {term}
                              </button>
                            );
                          })}
                          {kw.terms.length > 200 && (
                            <span className="text-[10px] text-muted-foreground self-center">
                              +{kw.terms.length - 200} more (all included)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs">
            {selectedKwCount === 0 ? (
              <span className="text-muted-foreground">No keywords selected</span>
            ) : (
              <span>
                <strong>{selectedKwCount}</strong> keyword{selectedKwCount !== 1 ? "s" : ""} ={" "}
                <strong className={overLimit ? "text-destructive" : "text-primary"}>
                  {totalRows.toLocaleString()}
                </strong>{" "}
                row{totalRows !== 1 ? "s" : ""}
                {overLimit && <span className="text-destructive"> — exceeds {MAX_ROWS.toLocaleString()}</span>}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleInsert} disabled={selectedKwCount === 0 || overLimit}>
              Insert {totalRows > 0 ? `${totalRows.toLocaleString()} row${totalRows !== 1 ? "s" : ""}` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
