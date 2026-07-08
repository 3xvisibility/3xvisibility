import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutTemplate, Monitor, Tablet, Smartphone, Copy, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { config } from "@/lib/config";
import BoxPreview from "@/components/settings/BoxPreview";
import {
  validateBoxSettings,
  parseOptInt,
  MIN_WIDTH,
  MAX_WIDTH,
  MAX_GUTTER,
  type DeviceKey,
} from "@/lib/box-settings-validation";

const DEFAULT_WIDTH = config.layout.defaultContainerWidth;
const DEFAULT_GUTTER = { desktop: 0, tablet: 20, mobile: 16 };

type Mode = "inherit" | "disabled" | "custom";

type Row = {
  container_width?: number | null;
  container_width_tablet?: number | null;
  container_width_mobile?: number | null;
  gutter_desktop?: number | null;
  gutter_tablet?: number | null;
  gutter_mobile?: number | null;
};

/**
 * Reusable boxed content-width override control. Persists the desktop
 * `container_width` plus responsive per-breakpoint content widths and side
 * gutters directly on a `templates` or `generated_pages` row.
 */
export default function ContainerWidthControl({
  table,
  id,
  campaignId,
  inheritLabel = "Inherit workspace default",
  className,
}: {
  table: "templates" | "generated_pages";
  id: string | null | undefined;
  /** When provided (page context), enables "Copy from template". */
  campaignId?: string | null;
  inheritLabel?: string;
  className?: string;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("inherit");
  const [customWidth, setCustomWidth] = useState(String(DEFAULT_WIDTH));
  const [tabletWidth, setTabletWidth] = useState("");
  const [mobileWidth, setMobileWidth] = useState("");
  const [gutterDesktop, setGutterDesktop] = useState("");
  const [gutterTablet, setGutterTablet] = useState("");
  const [gutterMobile, setGutterMobile] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      const { data } = await supabase
        .from(table)
        .select(
          "container_width, container_width_tablet, container_width_mobile, gutter_desktop, gutter_tablet, gutter_mobile",
        )
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      applyRow((data as Row | null) ?? {});
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [table, id]);

  const applyRow = (row: Row) => {
    const w = row.container_width;
    if (w === null || w === undefined) {
      setMode("inherit");
    } else if (w <= 0) {
      setMode("disabled");
    } else {
      setMode("custom");
      setCustomWidth(String(w));
    }
    setTabletWidth(row.container_width_tablet != null ? String(row.container_width_tablet) : "");
    setMobileWidth(row.container_width_mobile != null ? String(row.container_width_mobile) : "");
    setGutterDesktop(row.gutter_desktop != null ? String(row.gutter_desktop) : "");
    setGutterTablet(row.gutter_tablet != null ? String(row.gutter_tablet) : "");
    setGutterMobile(row.gutter_mobile != null ? String(row.gutter_mobile) : "");
  };

  const copyFromTemplate = async () => {
    if (!campaignId) return;
    setCopying(true);
    try {
      const { data: camp } = await supabase
        .from("campaigns")
        .select("template_id")
        .eq("id", campaignId)
        .maybeSingle();
      const tplId = (camp as { template_id?: string | null } | null)?.template_id;
      if (!tplId) {
        toast({ title: "No template found", description: "This page's campaign has no linked template.", variant: "destructive" });
        return;
      }
      const { data: tpl } = await supabase
        .from("templates")
        .select("container_width, container_width_tablet, container_width_mobile, gutter_desktop, gutter_tablet, gutter_mobile")
        .eq("id", tplId)
        .maybeSingle();
      if (!tpl) {
        toast({ title: "Template not found", variant: "destructive" });
        return;
      }
      applyRow(tpl as Row);
      toast({ title: "Copied from template", description: "Review the values, then Save to apply to this page." });
    } finally {
      setCopying(false);
    }
  };

  const boxingEnabled = mode !== "disabled";

  // Effective values for validation + preview.
  const effDesktopWidth: number | null = !boxingEnabled
    ? null
    : mode === "custom"
    ? parseOptInt(customWidth)
    : DEFAULT_WIDTH;
  const effTabletWidth = parseOptInt(tabletWidth);
  const effMobileWidth = parseOptInt(mobileWidth);
  const effGutterDesktop = parseOptInt(gutterDesktop) ?? DEFAULT_GUTTER.desktop;
  const effGutterTablet = parseOptInt(gutterTablet) ?? DEFAULT_GUTTER.tablet;
  const effGutterMobile = parseOptInt(gutterMobile) ?? DEFAULT_GUTTER.mobile;

  const { errors, warnings } = validateBoxSettings(
    {
      desktopWidth: effDesktopWidth,
      tabletWidth: effTabletWidth,
      mobileWidth: effMobileWidth,
      gutterDesktop: effGutterDesktop,
      gutterTablet: effGutterTablet,
      gutterMobile: effGutterMobile,
    },
    boxingEnabled,
  );

  const previewWidths: Record<DeviceKey, number | null> = {
    desktop: effDesktopWidth,
    tablet: effTabletWidth,
    mobile: effMobileWidth,
  };
  const previewGutters: Record<DeviceKey, number | null> = {
    desktop: effGutterDesktop,
    tablet: effGutterTablet,
    mobile: effGutterMobile,
  };

  const resolveValue = (): number | null => {
    if (mode === "inherit") return null;
    if (mode === "disabled") return 0;
    const raw = Number(customWidth);
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return Math.min(Math.max(Math.round(raw), MIN_WIDTH), MAX_WIDTH);
  };

  const save = async () => {
    if (!id) return;
    if (errors.length > 0) {
      toast({ title: "Fix conflicting values", description: errors[0], variant: "destructive" });
      return;
    }
    setSaving(true);
    const clampW = (n: number | null) => (n == null ? null : Math.min(Math.max(n, MIN_WIDTH), MAX_WIDTH));
    const clampG = (n: number | null) => (n == null ? null : Math.min(Math.max(n, 0), MAX_GUTTER));
    const { error } = await supabase
      .from(table)
      .update({
        container_width: resolveValue(),
        container_width_tablet: clampW(parseOptInt(tabletWidth)),
        container_width_mobile: clampW(parseOptInt(mobileWidth)),
        gutter_desktop: clampG(parseOptInt(gutterDesktop)),
        gutter_tablet: clampG(parseOptInt(gutterTablet)),
        gutter_mobile: clampG(parseOptInt(gutterMobile)),
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    const val = resolveValue();
    toast({
      title: "Content width saved",
      description:
        val === null
          ? "This item will inherit the workspace default."
          : val === 0
          ? "Content will span full width (no boxed container)."
          : `Boxed at ${val}px desktop; responsive widths & gutters applied.`,
    });
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <LayoutTemplate className="h-4 w-4" />
          Boxed content width
        </div>
        {campaignId && (
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1.5 px-2 text-xs" onClick={copyFromTemplate} disabled={copying || loading}>
            <Copy className="h-3.5 w-3.5" /> {copying ? "Copying…" : "Copy from template"}
          </Button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Center the content in a fixed-width box while section backgrounds stay edge-to-edge.
        Default is {DEFAULT_WIDTH}px. Set responsive widths and gutters per device below.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Behavior</Label>
          <Select value={mode} disabled={loading} onValueChange={(v) => setMode(v as Mode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inherit">{inheritLabel}</SelectItem>
              <SelectItem value="disabled">Full width (no box)</SelectItem>
              <SelectItem value="custom">Boxed at fixed width…</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {mode === "custom" && (
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" /> Desktop width (px)</Label>
            <Input
              type="number"
              min={MIN_WIDTH}
              max={MAX_WIDTH}
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">e.g. {DEFAULT_WIDTH} (Elementor default). Range {MIN_WIDTH}–{MAX_WIDTH}px.</p>
          </div>
        )}
      </div>

      {mode !== "disabled" && (
        <div className="mt-3 space-y-3 rounded-lg border p-3">
          <Label>Responsive content width &amp; gutters</Label>
          <p className="text-xs text-muted-foreground">
            Leave a width blank to let that breakpoint scale fluidly (100%). Gutter is the side
            spacing inside the box. Defaults: desktop {DEFAULT_GUTTER.desktop}px, tablet {DEFAULT_GUTTER.tablet}px, mobile {DEFAULT_GUTTER.mobile}px.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Desktop */}
            <div className="space-y-2 rounded-md border p-2">
              <div className="flex items-center gap-1.5 text-xs font-medium"><Monitor className="h-3.5 w-3.5" /> Desktop</div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Width</Label>
                <Input value={mode === "custom" ? customWidth : String(DEFAULT_WIDTH)} disabled className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Gutter (px)</Label>
                <Input type="number" min={0} max={MAX_GUTTER} placeholder={String(DEFAULT_GUTTER.desktop)} value={gutterDesktop} onChange={(e) => setGutterDesktop(e.target.value)} className="h-8" />
              </div>
            </div>
            {/* Tablet */}
            <div className="space-y-2 rounded-md border p-2">
              <div className="flex items-center gap-1.5 text-xs font-medium"><Tablet className="h-3.5 w-3.5" /> Tablet</div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Width</Label>
                <Input type="number" min={MIN_WIDTH} max={MAX_WIDTH} placeholder="Fluid" value={tabletWidth} onChange={(e) => setTabletWidth(e.target.value)} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Gutter (px)</Label>
                <Input type="number" min={0} max={MAX_GUTTER} placeholder={String(DEFAULT_GUTTER.tablet)} value={gutterTablet} onChange={(e) => setGutterTablet(e.target.value)} className="h-8" />
              </div>
            </div>
            {/* Mobile */}
            <div className="space-y-2 rounded-md border p-2">
              <div className="flex items-center gap-1.5 text-xs font-medium"><Smartphone className="h-3.5 w-3.5" /> Mobile</div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Width</Label>
                <Input type="number" min={MIN_WIDTH} max={MAX_WIDTH} placeholder="Fluid" value={mobileWidth} onChange={(e) => setMobileWidth(e.target.value)} className="h-8" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Gutter (px)</Label>
                <Input type="number" min={0} max={MAX_GUTTER} placeholder={String(DEFAULT_GUTTER.mobile)} value={gutterMobile} onChange={(e) => setGutterMobile(e.target.value)} className="h-8" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation feedback */}
      {errors.length > 0 && (
        <div className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
          <div className="flex items-center gap-1.5 font-medium"><AlertTriangle className="h-3.5 w-3.5" /> Conflicting values</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}
      {errors.length === 0 && warnings.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
          <div className="flex items-center gap-1.5 font-medium"><AlertTriangle className="h-3.5 w-3.5" /> Heads up</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      {/* Side-by-side live preview */}
      <div className="mt-3 space-y-2 rounded-lg border p-3">
        <Label>Live preview — all devices</Label>
        <BoxPreview boxingEnabled={boxingEnabled} widths={previewWidths} gutters={previewGutters} />
        <p className="text-[10px] text-muted-foreground">Section backgrounds always stay edge-to-edge; only the content is boxed.</p>
      </div>

      <div className="mt-3">
        <Button size="sm" onClick={save} disabled={saving || loading || errors.length > 0 || !id}>
          {saving ? "Saving…" : "Save content width"}
        </Button>
      </div>
    </div>
  );
}
