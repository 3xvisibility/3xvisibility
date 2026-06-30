import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Plus, Minus, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  diffLines,
  diffStats,
  type TemplateVersionRow,
} from "@/lib/template-version-history";

type Props = {
  templateId: string | null;
  templateName?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function TemplateVersionHistoryDialog({ templateId, templateName, open, onOpenChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["template-versions", templateId],
    enabled: open && !!templateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_versions")
        .select("*")
        .eq("template_id", templateId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data as TemplateVersionRow[];
    },
  });

  const selected = useMemo(
    () => versions.find((v) => v.id === selectedId) ?? versions[0] ?? null,
    [versions, selectedId],
  );

  // Compare the selected version against the immediately previous version.
  const previous = useMemo(() => {
    if (!selected) return null;
    return versions.find((v) => v.version_number === selected.version_number - 1) ?? null;
  }, [versions, selected]);

  const diff = useMemo(() => {
    if (!selected) return [];
    return diffLines(previous?.content ?? "", selected.content ?? "");
  }, [selected, previous]);

  const stats = useMemo(() => diffStats(diff), [diff]);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Version history
            {templateName && <span className="text-muted-foreground font-normal truncate">· {templateName}</span>}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : versions.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No versions recorded yet. The next time you save this template a version will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
            {/* Version list */}
            <ScrollArea className="h-[55vh] pr-2">
              <div className="space-y-1.5">
                {versions.map((v) => {
                  const active = selected?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedId(v.id)}
                      className={`w-full text-left rounded-lg border p-2.5 transition ${
                        active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">v{v.version_number}</span>
                        {v.version_number === versions[0].version_number && (
                          <Badge variant="secondary" className="text-[10px]">Latest</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{fmt(v.created_at)}</p>
                      {v.change_summary ? (
                        <p className="text-[11px] text-foreground/80 mt-1 line-clamp-2">{v.change_summary}</p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Diff view */}
            <div className="min-w-0">
              {selected && (
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-sm font-medium">
                    {previous ? `Changes from v${previous.version_number} → v${selected.version_number}` : `v${selected.version_number} (first version)`}
                  </span>
                  <Badge variant="outline" className="text-[10px] gap-1 text-green-600 border-green-600/40">
                    <Plus className="h-3 w-3" /> {stats.added}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] gap-1 text-destructive border-destructive/40">
                    <Minus className="h-3 w-3" /> {stats.removed}
                  </Badge>
                </div>
              )}
              <ScrollArea className="h-[50vh] rounded-lg border bg-muted/30">
                <pre className="text-[11px] font-mono leading-relaxed p-2 whitespace-pre-wrap break-words">
                  {diff.length === 0 ? (
                    <span className="text-muted-foreground">No content differences.</span>
                  ) : (
                    diff.map((l, idx) => (
                      <div
                        key={idx}
                        className={
                          l.type === "add"
                            ? "bg-green-500/10 text-green-700 dark:text-green-400"
                            : l.type === "del"
                            ? "bg-destructive/10 text-destructive"
                            : "text-muted-foreground"
                        }
                      >
                        <span className="select-none opacity-60">{l.type === "add" ? "+ " : l.type === "del" ? "- " : "  "}</span>
                        {l.text || " "}
                      </div>
                    ))
                  )}
                </pre>
              </ScrollArea>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
