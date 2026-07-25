import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ScanSearch, History, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { autoExtractTemplateVariables } from "@/lib/template-variable-extractor";

/**
 * Lets the user choose which stored HTML snapshot to rescan for new
 * variable placeholders — the current live template or any historical
 * version row — so re-extraction never leaks changes across snapshots.
 */
export type RescanTarget =
  | { kind: "live"; content: string }
  | { kind: "version"; versionId: string; versionNumber: number; content: string };

type Props = {
  templateId: string | null;
  templateName?: string;
  liveContent: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (target: RescanTarget) => void;
  isRunning?: boolean;
};

type VersionRow = {
  id: string;
  version_number: number;
  change_summary: string | null;
  created_at: string;
  content: string | null;
};

export function RescanVariablesDialog({
  templateId, templateName, liveContent, open, onOpenChange, onConfirm, isRunning,
}: Props) {
  const [choice, setChoice] = useState<string>("live");

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["template-versions-rescan", templateId],
    enabled: open && !!templateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_versions")
        .select("id, version_number, change_summary, created_at, content")
        .eq("template_id", templateId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VersionRow[];
    },
  });

  useEffect(() => { if (open) setChoice("live"); }, [open, templateId]);

  const previewCounts = useMemo(() => {
    const counts = new Map<string, { existing: number; wouldAdd: number }>();
    const analyze = (html: string) => {
      const existing = new Set((html.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g) || []).map((s) => s.slice(1, -1).toLowerCase()));
      const candidates = autoExtractTemplateVariables(html || "", templateName || "", []);
      const wouldAdd = candidates.filter((c) => !existing.has(c.name.toLowerCase()) && c.original && html.includes(c.original)).length;
      return { existing: existing.size, wouldAdd };
    };
    counts.set("live", analyze(liveContent || ""));
    for (const v of versions) counts.set(`v:${v.id}`, analyze(v.content || ""));
    return counts;
  }, [liveContent, versions, templateName]);

  const handleConfirm = () => {
    if (choice === "live") {
      onConfirm({ kind: "live", content: liveContent });
      return;
    }
    const id = choice.replace(/^v:/, "");
    const row = versions.find((v) => v.id === id);
    if (!row) return;
    onConfirm({ kind: "version", versionId: row.id, versionNumber: row.version_number, content: row.content ?? "" });
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanSearch className="h-4 w-4" /> Rescan variables
            {templateName && <span className="text-muted-foreground font-normal truncate">· {templateName}</span>}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Choose which stored HTML snapshot to scan. Only that snapshot is updated — other versions stay untouched.
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
        ) : (
          <ScrollArea className="max-h-[50vh] pr-2">
            <RadioGroup value={choice} onValueChange={setChoice} className="space-y-2">
              <label
                htmlFor="rescan-live"
                className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40 ${choice === "live" ? "border-primary bg-primary/5" : ""}`}
              >
                <RadioGroupItem value="live" id="rescan-live" className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-3.5 w-3.5" /> Current live template
                    <Badge variant="secondary" className="text-[10px]">default</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Updates <code>templates.content</code> and records a new version entry.
                  </div>
                  <VarStat counts={previewCounts.get("live")} />
                </div>
              </label>

              {versions.map((v) => {
                const key = `v:${v.id}`;
                return (
                  <label
                    key={v.id}
                    htmlFor={`rescan-${v.id}`}
                    className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/40 ${choice === key ? "border-primary bg-primary/5" : ""}`}
                  >
                    <RadioGroupItem value={key} id={`rescan-${v.id}`} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <History className="h-3.5 w-3.5" /> Version {v.version_number}
                        <span className="text-[11px] text-muted-foreground font-normal">{fmt(v.created_at)}</span>
                      </div>
                      {v.change_summary && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate" title={v.change_summary}>{v.change_summary}</div>
                      )}
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Rewrites this snapshot only in <code>template_versions</code>.
                      </div>
                      <VarStat counts={previewCounts.get(key)} />
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isRunning}>Cancel</Button>
          <Button size="sm" onClick={handleConfirm} disabled={isRunning || isLoading}>
            {isRunning ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ScanSearch className="h-3.5 w-3.5 mr-1.5" />}
            Rescan selected snapshot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VarStat({ counts }: { counts?: { existing: number; wouldAdd: number } }) {
  if (!counts) return null;
  return (
    <div className="mt-1 flex items-center gap-2 text-[10px]">
      <Badge variant="outline">{counts.existing} existing</Badge>
      <Badge variant={counts.wouldAdd > 0 ? "default" : "secondary"}>
        {counts.wouldAdd > 0 ? `+${counts.wouldAdd} new` : "no changes"}
      </Badge>
    </div>
  );
}
