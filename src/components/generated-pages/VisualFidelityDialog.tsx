import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ScanEye, CheckCircle2, AlertTriangle } from "lucide-react";

interface DiffRegion {
  tag: string;
  kind: string;
  expected: string;
  actual: string;
  severity: number;
}

interface CheckResult {
  status: string;
  score?: number;
  pixel_score?: number;
  structural_score?: number;
  diff_regions?: DiffRegion[];
  rebuild_hints?: string;
  threshold?: number;
  message?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** The HTML we generated/sent (the "expected" template). */
  templateHtml?: string | null;
  /** The live published page URL to compare against. */
  publishedUrl?: string | null;
  workspaceId?: string | null;
  generatedPageId?: string | null;
  templateId?: string | null;
}

const pct = (n?: number) => (typeof n === "number" ? `${(n * 100).toFixed(1)}%` : "—");

export function VisualFidelityDialog({
  open, onOpenChange, templateHtml, publishedUrl, workspaceId, generatedPageId, templateId,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("compare-pages", {
        body: {
          workspace_id: workspaceId,
          generated_page_id: generatedPageId,
          template_id: templateId,
          templateHtml,
          publishedUrl,
        },
      });
      if (error) throw error;
      setResult(data as CheckResult);
    } catch (e: any) {
      setError(e?.message || "Visual check failed");
    } finally {
      setLoading(false);
    }
  };

  const passed = result?.status === "passed";
  const score = result?.score;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ScanEye className="h-4 w-4" /> Visual fidelity check</DialogTitle>
          <DialogDescription>
            Compares the published page against the original template and reports the visual similarity score.
          </DialogDescription>
        </DialogHeader>

        {!publishedUrl && (
          <p className="text-sm text-muted-foreground">This page has no live URL yet — publish it first.</p>
        )}

        {result?.status === "pending" && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700">
            {result.message || "Render worker not configured."}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {result && typeof score === "number" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant={passed ? "default" : "destructive"} className="gap-1">
                {passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                {pct(score)} match
              </Badge>
              <span className="text-xs text-muted-foreground">
                target ≥ {pct(result.threshold)} · pixel {pct(result.pixel_score)} · structure {pct(result.structural_score)}
              </span>
            </div>
            {result.diff_regions && result.diff_regions.length > 0 && (
              <div className="max-h-60 overflow-auto rounded-lg border text-xs">
                {result.diff_regions.map((r, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 border-b px-3 py-1.5 last:border-b-0">
                    <span className="font-mono text-muted-foreground">&lt;{r.tag}&gt; {r.kind}</span>
                    <span className="text-right">exp: {r.expected || "—"} · got: {r.actual || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={run} disabled={loading || !publishedUrl}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ScanEye className="h-4 w-4 mr-2" />}
            Run check
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
