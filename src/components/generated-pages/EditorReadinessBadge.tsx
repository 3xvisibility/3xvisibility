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

        {r.sections && r.sections.length > 0 && (
          <SectionParityHeatmap sections={r.sections} />
        )}
      </span>
    </TooltipProvider>
  );
}

/** Cell background tone for a section score in the heatmap. */
function heatCell(score: number): string {
  if (score >= 85) return "bg-emerald-500/80 text-white border-emerald-600/40";
  if (score >= 60) return "bg-amber-500/80 text-white border-amber-600/40";
  if (score >= 30) return "bg-orange-500/80 text-white border-orange-600/40";
  return "bg-destructive/80 text-white border-destructive/40";
}

/**
 * Post-publish section-level parity heatmap. Renders one colored cell per page
 * section (hero first) and, on click, lists the exact widgets in that section
 * whose design did NOT convert to native Elementor styles.
 */
function SectionParityHeatmap({ sections }: { sections: SectionParity[] }) {
  const mismatchCount = sections.filter((s) => s.parity_score < 85).length;
  const allGood = mismatchCount === 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={
            allGood
              ? "text-[10px] inline-flex items-center gap-1 cursor-pointer bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "text-[10px] inline-flex items-center gap-1 cursor-pointer bg-amber-500/10 text-amber-600 border-amber-500/20"
          }
        >
          <Grid2x2 className="h-2.5 w-2.5" />
          {allGood ? "All sections match" : `${mismatchCount} section${mismatchCount === 1 ? "" : "s"} to review`}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 space-y-3" align="start">
        <div>
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <Grid2x2 className="h-3.5 w-3.5" /> Section parity heatmap
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Each cell is a page section. Red/orange = design that didn't fully convert to native
            widgets. Click a section to see which widgets to check.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {sections.map((s) => (
            <Tooltip key={s.index}>
              <TooltipTrigger asChild>
                <div
                  className={`min-w-[2.75rem] flex-1 rounded-md border px-1.5 py-1 text-center ${heatCell(s.parity_score)}`}
                >
                  <div className="text-[9px] font-medium leading-tight truncate">
                    {s.is_hero ? "Hero" : `S${s.index + 1}`}
                  </div>
                  <div className="text-[11px] font-bold leading-tight">{s.parity_score}%</div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs space-y-1">
                <p className="text-xs font-medium">{s.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {s.styled_nodes}/{s.total_nodes} widgets styled · {s.background_layers} bg ·{" "}
                  {s.overlay_layers} overlay
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto">
          {sections
            .filter((s) => s.parity_score < 85 && s.weak_widgets.length > 0)
            .map((s) => (
              <div key={s.index} className="rounded-md border bg-muted/40 p-2">
                <p className="text-[11px] font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  {s.label} — {s.weak_widgets.length} widget
                  {s.weak_widgets.length === 1 ? "" : "s"} not matching
                </p>
                <ul className="mt-1 space-y-0.5">
                  {s.weak_widgets.map((w, i) => (
                    <li key={i} className="text-[10px] text-muted-foreground flex gap-1">
                      <span className="font-mono text-foreground/70">{w.type}</span>
                      {w.text && <span className="truncate">— {w.text}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          {mismatchCount === 0 && (
            <p className="text-[11px] text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Every section converted to native widgets.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

