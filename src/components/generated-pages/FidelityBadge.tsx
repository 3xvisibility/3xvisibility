import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, AlertTriangle, Loader2, ScanEye, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { runFidelityCheck, type FidelityCheck } from "@/hooks/useFidelityChecks";

interface Props {
  pageId: string;
  pageTitle?: string;
  isPublished: boolean;
  check?: FidelityCheck;
  onChecked?: () => void;
}

const pct = (v: number | null | undefined) => `${Math.round((v ?? 0) * 100)}%`;

/**
 * Shows the automatic preview → published HTML/CSS match result for a page.
 * Green = published page is a 1:1 copy of the preview.
 */
export function FidelityBadge({ pageId, pageTitle, isPublished, check, onChecked }: Props) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);

  if (!isPublished) return null;

  const recheck = async () => {
    setRunning(true);
    try {
      const data = await runFidelityCheck([pageId]);
      const result = data?.results?.[0] as { status?: string; score?: number } | undefined;
      toast({
        title: result?.status === "passed" ? "Design matches the preview" : "Fidelity check finished",
        description: result?.score != null
          ? `Match score ${pct(result.score)}`
          : (result?.status || "No result"),
        variant: result?.status === "failed" ? "destructive" : undefined,
      });
      onChecked?.();
    } catch (e) {
      toast({
        title: "Fidelity check failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const status = check?.status;
  const style =
    status === "passed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
    : status === "failed" ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
    : status === "error" ? "bg-destructive/10 text-destructive border-destructive/20"
    : "bg-muted text-muted-foreground border-border";
  const Icon =
    status === "passed" ? CheckCircle2
    : status === "failed" ? AlertTriangle
    : status === "error" ? XCircle
    : ScanEye;
  const label =
    status === "passed" || status === "failed" ? `Match ${pct(check?.score)}`
    : status === "error" ? "Match n/a"
    : "Not checked";

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" onClick={() => setOpen(true)} className="inline-flex">
              <Badge variant="outline" className={`text-[10px] inline-flex items-center gap-1 cursor-pointer ${style}`}>
                <Icon className="h-2.5 w-2.5" />
                {label}
              </Badge>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Preview → published HTML/CSS match check</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanEye className="h-4 w-4" /> Design fidelity
            </DialogTitle>
            <DialogDescription>
              {pageTitle ? `${pageTitle} — ` : ""}compares the preview markup with the live published
              page (text, headings, images, structure, classes and CSS).
            </DialogDescription>
          </DialogHeader>

          {check ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Overall", value: check.score },
                  { label: "Content", value: (check.meta as any)?.content_score },
                  { label: "Style", value: (check.meta as any)?.style_score },
                  { label: "Structure", value: check.structural_score },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border p-3">
                    <p className="text-[10px] uppercase text-muted-foreground">{m.label}</p>
                    <p className="text-lg font-semibold">{pct(m.value as number)}</p>
                  </div>
                ))}
              </div>

              {check.error_message && (
                <p className="text-xs text-destructive">{check.error_message}</p>
              )}

              {check.diff_regions?.length ? (
                <ScrollArea className="h-64 rounded-lg border">
                  <div className="divide-y">
                    {check.diff_regions.map((m, i) => (
                      <div key={i} className="p-3 space-y-1">
                        <Badge variant="outline" className="text-[10px] uppercase">{m.kind}</Badge>
                        <p className="text-xs font-mono break-all">{m.detail}</p>
                        <p className="text-[11px] text-muted-foreground">{m.hint}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-emerald-600">
                  Everything from the preview was found on the live page.
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Checked {new Date(check.created_at).toLocaleString()} · pass threshold {pct(check.threshold)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No check yet. Fidelity runs automatically after publishing — or run it now.
            </p>
          )}

          <div className="flex justify-end">
            <Button size="sm" onClick={recheck} disabled={running}>
              {running ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <ScanEye className="h-3.5 w-3.5 mr-2" />}
              Re-run check
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
