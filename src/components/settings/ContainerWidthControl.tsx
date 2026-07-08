import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutTemplate, Monitor, Tablet, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { config } from "@/lib/config";

const MIN_WIDTH = 320;
const MAX_WIDTH = 1920;
const MAX_GUTTER = 200;
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
 *
 * Semantics of the stored desktop value:
 *   - null  → inherit (template inherits workspace; page inherits template)
 *   - 0     → boxing disabled (content spans full width)
 *   - >0    → box content at this pixel width while backgrounds stay full-width
 *
 * Tablet / mobile widths are optional (blank = fluid 100%). Gutters are the
 * horizontal spacing inside the boxed content per breakpoint.
 */
export default function ContainerWidthControl({
  table,
  id,
  inheritLabel = "Inherit workspace default",
  className,
}: {
  table: "templates" | "generated_pages";
  id: string | null | undefined;
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
  const [previewBoxed, setPreviewBoxed] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

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
      const row = (data as Row | null) ?? {};
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
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [table, id]);

  const customError = ((): string | null => {
    if (mode !== "custom") return null;
    const trimmed = customWidth.trim();
    if (trimmed === "") return "Enter a width.";
    const raw = Number(trimmed);
    if (!Number.isFinite(raw)) return "Must be a number.";
    if (raw < MIN_WIDTH) return `Minimum is ${MIN_WIDTH}px.`;
    if (raw > MAX_WIDTH) return `Maximum is ${MAX_WIDTH}px.`;
    return null;
  })();

  const widthFieldError = (val: string): string | null => {
    const trimmed = val.trim();
    if (trimmed === "") return null;
    const raw = Number(trimmed);
    if (!Number.isFinite(raw)) return "Number.";
    if (raw < MIN_WIDTH) return `Min ${MIN_WIDTH}.`;
    if (raw > MAX_WIDTH) return `Max ${MAX_WIDTH}.`;
    return null;
  };

  const gutterFieldError = (val: string): string | null => {
    const trimmed = val.trim();
    if (trimmed === "") return null;
    const raw = Number(trimmed);
    if (!Number.isFinite(raw)) return "Number.";
    if (raw < 0) return "≥ 0.";
    if (raw > MAX_GUTTER) return `Max ${MAX_GUTTER}.`;
    return null;
  };

  const responsiveError =
    widthFieldError(tabletWidth) ||
    widthFieldError(mobileWidth) ||
    gutterFieldError(gutterDesktop) ||
    gutterFieldError(gutterTablet) ||
    gutterFieldError(gutterMobile);

  const parseOptInt = (val: string): number | null => {
    const t = val.trim();
    if (t === "") return null;
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return Math.round(n);
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
    if (customError || responsiveError) {
      toast({ title: "Invalid value", description: customError || responsiveError || "", variant: "destructive" });
      return;
    }
    setSaving(true);
    const clampW = (n: number | null) =>
      n == null ? null : Math.min(Math.max(n, MIN_WIDTH), MAX_WIDTH);
    const clampG = (n: number | null) =>
      n == null ? null : Math.min(Math.max(n, 0), MAX_GUTTER);
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

  // Effective width for the live preview (per selected device).
  const previewWidth = (() => {
    if (previewDevice === "tablet") {
      const t = parseOptInt(tabletWidth);
      return t && t > 0 ? t : null; // null = fluid
    }
    if (previewDevice === "mobile") {
      const m = parseOptInt(mobileWidth);
      return m && m > 0 ? m : null; // null = fluid
    }
    if (mode === "custom") {
      const raw = Number(customWidth);
      if (Number.isFinite(raw) && raw > 0) return Math.min(Math.max(Math.round(raw), MIN_WIDTH), MAX_WIDTH);
      return DEFAULT_WIDTH;
    }
    return DEFAULT_WIDTH;
  })();

  const CANVAS = previewDevice === "desktop" ? 1440 : previewDevice === "tablet" ? 834 : 390;
  const boxedApplied = mode !== "disabled" && previewBoxed;
  const boxedPct = previewWidth == null ? 100 : Math.min((previewWidth / CANVAS) * 100, 100);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <LayoutTemplate className="h-4 w-4" />
        Boxed content width
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
              aria-invalid={!!customError}
              onChange={(e) => setCustomWidth(e.target.value)}
              className={customError ? "border-destructive focus-visible:ring-destructive" : undefined}
            />
            {customError ? (
              <p className="text-xs text-destructive">{customError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">e.g. {DEFAULT_WIDTH} (Elementor default). Range {MIN_WIDTH}–{MAX_WIDTH}px.</p>
            )}
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
          {responsiveError && <p className="text-xs text-destructive">{responsiveError}</p>}
        </div>
      )}

      {/* Live content-width preview */}
      <div className="mt-3 space-y-2 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label>Content width preview</Label>
            <p className="text-xs text-muted-foreground">
              {boxedApplied
                ? previewWidth == null
                  ? "Fluid (100% of band) on this device."
                  : `Boxed at ~${previewWidth}px on this device, backgrounds full-width.`
                : "Content spans full width (no boxed container)."}
            </p>
          </div>
          <Switch
            checked={previewBoxed}
            disabled={mode === "disabled"}
            onCheckedChange={setPreviewBoxed}
            aria-label="Toggle boxed content width preview"
          />
        </div>

        <div className="flex gap-1">
          {(["desktop", "tablet", "mobile"] as const).map((d) => (
            <Button
              key={d}
              type="button"
              size="sm"
              variant={previewDevice === d ? "default" : "outline"}
              onClick={() => setPreviewDevice(d)}
              className="h-7 gap-1.5 px-2 text-xs capitalize"
            >
              {d === "desktop" ? <Monitor className="h-3.5 w-3.5" /> : d === "tablet" ? <Tablet className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
              {d}
            </Button>
          ))}
        </div>

        <div className="overflow-hidden rounded-md border bg-muted/30">
          <div className="w-full bg-primary/10 py-3">
            <div
              className="mx-auto rounded bg-primary/40 px-2 py-2 text-center text-[10px] font-medium text-primary-foreground transition-all duration-300"
              style={{ width: boxedApplied ? `${boxedPct}%` : "100%" }}
            >
              Hero content
            </div>
          </div>
          <div className="w-full bg-secondary/40 py-3">
            <div
              className="mx-auto flex gap-2 transition-all duration-300"
              style={{ width: boxedApplied ? `${boxedPct}%` : "100%" }}
            >
              <div className="h-8 flex-1 rounded bg-foreground/15" />
              <div className="h-8 flex-1 rounded bg-foreground/15" />
              <div className="h-8 flex-1 rounded bg-foreground/15" />
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Simulated {CANVAS}px viewport. Section backgrounds always stay edge-to-edge.
        </p>
      </div>

      <div className="mt-3">
        <Button size="sm" onClick={save} disabled={saving || loading || !!customError || !!responsiveError || !id}>
          {saving ? "Saving…" : "Save content width"}
        </Button>
      </div>
    </div>
  );
}
