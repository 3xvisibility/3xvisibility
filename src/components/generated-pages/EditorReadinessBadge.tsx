import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle2, ShieldAlert, Layers, Gauge, Grid2x2, AlertTriangle } from "lucide-react";

export interface SectionParity {
  index: number;
  label: string;
  is_hero: boolean;
  total_nodes: number;
  styled_nodes: number;
  parity_score: number;
  background_layers: number;
  overlay_layers: number;
  weak_widgets: { type: string; text: string }[];
}

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
  sections?: SectionParity[] | null;
}

function parseSections(value: unknown): SectionParity[] | null {
  if (!Array.isArray(value)) return null;
  const out: SectionParity[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    const num = (x: unknown, d = 0) => (typeof x === "number" ? x : d);
    const weak = Array.isArray(s.weak_widgets)
      ? (s.weak_widgets as unknown[])
          .filter((w): w is Record<string, unknown> => !!w && typeof w === "object")
          .map((w) => ({
            type: typeof w.type === "string" ? w.type : "widget",
            text: typeof w.text === "string" ? w.text : "",
          }))
      : [];
    out.push({
      index: num(s.index),
      label: typeof s.label === "string" ? s.label : `Section ${num(s.index) + 1}`,
      is_hero: s.is_hero === true,
      total_nodes: num(s.total_nodes),
      styled_nodes: num(s.styled_nodes),
      parity_score: num(s.parity_score),
      background_layers: num(s.background_layers),
      overlay_layers: num(s.overlay_layers),
      weak_widgets: weak,
    });
  }
  return out.length ? out : null;
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
    sections: parseSections(v.sections),
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
  const hasParity = typeof r.parity_score === "number";
  const bgLayers = typeof r.background_layers === "number" ? r.background_layers : null;
  const ovLayers = typeof r.overlay_layers === "number" ? r.overlay_layers : null;
  const totalLayers = (bgLayers ?? 0) + (ovLayers ?? 0);

  return (
    <TooltipProvider>
      <span className="inline-flex flex-wrap items-center gap-1">
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
            {bgLayers !== null && (
              <p className="text-[11px] text-muted-foreground">Background layers: {bgLayers}</p>
            )}
            {ovLayers !== null && (
              <p className="text-[11px] text-muted-foreground">Overlay layers: {ovLayers}</p>
            )}
            {hasParity && (
              <p className="text-[11px] text-muted-foreground">CSS parity score: {r.parity_score}%</p>
            )}
            {ts && <p className="text-[11px] text-muted-foreground">Checked: {ts}</p>}
          </TooltipContent>
        </Tooltip>

        {(bgLayers !== null || ovLayers !== null) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="text-[10px] inline-flex items-center gap-1 bg-sky-500/10 text-sky-600 border-sky-500/20"
              >
                <Layers className="h-2.5 w-2.5" />
                {totalLayers} layer{totalLayers === 1 ? "" : "s"}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs space-y-1">
              <p className="text-xs font-medium">Detected background layers</p>
              <p className="text-[11px] text-muted-foreground">Background images: {bgLayers ?? 0}</p>
              <p className="text-[11px] text-muted-foreground">Overlays (color/gradient): {ovLayers ?? 0}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {hasParity && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={`text-[10px] inline-flex items-center gap-1 ${parityTone(r.parity_score as number)}`}>
                <Gauge className="h-2.5 w-2.5" />
                {r.parity_score}% parity
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs space-y-1">
              <p className="text-xs font-medium">CSS parity score</p>
              <p className="text-[11px] text-muted-foreground">
                Share of native widgets that received baked styles extracted from the template's CSS
                (typography, colors, backgrounds, spacing, layout).
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </span>
    </TooltipProvider>
  );
}
