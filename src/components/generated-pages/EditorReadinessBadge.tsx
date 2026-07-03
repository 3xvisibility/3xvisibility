import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, ShieldAlert, Layers, Gauge } from "lucide-react";

export interface EditorReadiness {
  status?: "passed" | "failed" | "unknown" | string;
  reason?: string | null;
  attempts?: number | null;
  editable_widgets?: number | null;
  edit_mode?: string | null;
  checked_at?: string | null;
  background_layers?: number | null;
  overlay_layers?: number | null;
  parity_score?: number | null;
}

/** Safely coerce the jsonb column into a typed EditorReadiness object. */
export function parseEditorReadiness(value: unknown): EditorReadiness | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!("status" in v) && !("checked_at" in v)) return null;
  const num = (x: unknown) => (typeof x === "number" ? x : null);
  return {
    status: typeof v.status === "string" ? v.status : "unknown",
    reason: typeof v.reason === "string" ? v.reason : null,
    attempts: num(v.attempts),
    editable_widgets: num(v.editable_widgets),
    edit_mode: typeof v.edit_mode === "string" ? v.edit_mode : null,
    checked_at: typeof v.checked_at === "string" ? v.checked_at : null,
    background_layers: num(v.background_layers),
    overlay_layers: num(v.overlay_layers),
    parity_score: num(v.parity_score),
  };
}

function formatTimestamp(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

/** Tailwind color classes for a 0-100 parity score. */
function parityTone(score: number): string {
  if (score >= 85) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (score >= 60) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  return "bg-destructive/10 text-destructive border-destructive/20";
}

/**
 * Compact badge showing the post-publish "Edit with Elementor" readiness check
 * result — its status, failure reason (if any), and the time it was checked.
 */
export function EditorReadinessBadge({ value }: { value: unknown }) {
  const r = parseEditorReadiness(value);
  if (!r) return null;

  const passed = r.status === "passed";
  const ts = formatTimestamp(r.checked_at);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={
              passed
                ? "text-[10px] inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "text-[10px] inline-flex items-center gap-1 bg-destructive/10 text-destructive border-destructive/20"
            }
          >
            {passed ? <CheckCircle2 className="h-2.5 w-2.5" /> : <ShieldAlert className="h-2.5 w-2.5" />}
            {passed ? "Editor ready" : "Editor check failed"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs space-y-1">
          <p className="text-xs font-medium">
            {passed ? "Opens in Edit with Elementor" : "Editor-readiness check failed"}
          </p>
          {!passed && r.reason && <p className="text-xs">{r.reason}</p>}
          {typeof r.attempts === "number" && (
            <p className="text-[11px] text-muted-foreground">Attempts: {r.attempts}</p>
          )}
          {typeof r.editable_widgets === "number" && (
            <p className="text-[11px] text-muted-foreground">Editable widgets: {r.editable_widgets}</p>
          )}
          {ts && <p className="text-[11px] text-muted-foreground">Checked: {ts}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
