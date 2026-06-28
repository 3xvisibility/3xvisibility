import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, ScanEye, CheckCircle2, AlertTriangle, ShieldAlert, ShieldCheck,
} from "lucide-react";

export interface ValidationSide {
  url?: string;
  html?: string;
  imageUrl?: string;
}

export interface ValidationResult {
  status: string;
  passed?: boolean;
  score?: number;
  pixel_score?: number;
  threshold?: number;
  baseline_screenshot_url?: string | null;
  target_screenshot_url?: string | null;
  baseline_source?: string;
  target_source?: string;
  check_id?: string | null;
  message?: string;
  error?: string;
}

interface Props {
  workspaceId?: string | null;
  generatedPageId?: string | null;
  templateId?: string | null;
  /** The expected/template render. */
  baseline: ValidationSide;
  /** The generated/published page render. */
  target: ValidationSide;
  threshold?: number;
  /** Notifies parent when a result lands so it can gate publishing. */
  onResult?: (result: ValidationResult) => void;
}

const pct = (n?: number) => (typeof n === "number" ? `${(n * 100).toFixed(1)}%` : "—");

export function VisualValidationPanel({
  workspaceId, generatedPageId, templateId, baseline, target, threshold = 0.98, onResult,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canRun = !!(baseline.url || baseline.html || baseline.imageUrl) &&
    !!(target.url || target.html || target.imageUrl);

  const run = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("visual-validate", {
        body: {
          workspace_id: workspaceId,
          generated_page_id: generatedPageId,
          template_id: templateId,
          threshold,
          baseline,
          target,
        },
      });
      if (fnErr) throw fnErr;
      const res = data as ValidationResult;
      setResult(res);
      onResult?.(res);
      if (res.error) setError(res.error);
    } catch (e: any) {
      setError(e?.message || "Visual validation failed");
    } finally {
      setLoading(false);
    }
  };

  const passed = result?.status === "passed";
  const failed = result?.status === "failed";
  const score = result?.score;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ScanEye className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Visual validation gate</span>
          <Badge variant="outline" className="text-[10px]">target ≥ {pct(threshold)}</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={loading || !canRun} className="h-7 text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ScanEye className="h-3.5 w-3.5 mr-1" />}
          {result ? "Re-run" : "Run validation"}
        </Button>
      </div>

      {!canRun && (
        <p className="text-[11px] text-muted-foreground">
          A baseline and target render are both required to run validation.
        </p>
      )}

      {result?.status === "pending" && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-[11px] text-amber-700">
          {result.message || "Screenshot provider not configured."}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-[11px] text-destructive">
          {error}
        </div>
      )}

      {result && typeof score === "number" && (passed || failed) && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={passed ? "default" : "destructive"} className="gap-1">
              {passed ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
              {pct(score)} similarity · {passed ? "PASS" : "FAIL"}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              pixel {pct(result.pixel_score)} · baseline: {result.baseline_source} · target: {result.target_source}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <figure className="space-y-1">
              <figcaption className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Expected (template)
              </figcaption>
              {result.baseline_screenshot_url ? (
                <a href={result.baseline_screenshot_url} target="_blank" rel="noopener noreferrer">
                  <img src={result.baseline_screenshot_url} alt="Template baseline screenshot"
                    className="w-full rounded-md border border-border bg-white max-h-72 object-contain object-top" />
                </a>
              ) : <div className="h-32 rounded-md border border-dashed grid place-items-center text-[10px] text-muted-foreground">No image</div>}
            </figure>
            <figure className="space-y-1">
              <figcaption className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                {passed ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3 text-destructive" />} Generated page
              </figcaption>
              {result.target_screenshot_url ? (
                <a href={result.target_screenshot_url} target="_blank" rel="noopener noreferrer">
                  <img src={result.target_screenshot_url} alt="Generated page screenshot"
                    className="w-full rounded-md border border-border bg-white max-h-72 object-contain object-top" />
                </a>
              ) : <div className="h-32 rounded-md border border-dashed grid place-items-center text-[10px] text-muted-foreground">No image</div>}
            </figure>
          </div>

          {failed && (
            <p className="text-[11px] text-destructive">
              Below the {pct(result.threshold)} threshold — review the differences before publishing.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
