import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Monitor, Tablet, Smartphone, AlertTriangle } from "lucide-react";
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

/**
 * Bulk apply boxed content-width + gutter settings to multiple templates or
 * generated pages at once. The chosen values overwrite every selected row.
 */
export default function BulkBoxSettingsDialog({
  open,
  onOpenChange,
  table,
  ids,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  table: "templates" | "generated_pages";
  ids: string[];
  onApplied?: () => void;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("custom");
  const [customWidth, setCustomWidth] = useState(String(DEFAULT_WIDTH));
  const [tabletWidth, setTabletWidth] = useState("");
  const [mobileWidth, setMobileWidth] = useState("");
  const [gutterDesktop, setGutterDesktop] = useState("");
  const [gutterTablet, setGutterTablet] = useState("");
  const [gutterMobile, setGutterMobile] = useState("");
  const [saving, setSaving] = useState(false);

  const boxingEnabled = mode !== "disabled";

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

  const previewWidths: Record<DeviceKey, number | null> = { desktop: effDesktopWidth, tablet: effTabletWidth, mobile: effMobileWidth };
  const previewGutters: Record<DeviceKey, number | null> = { desktop: effGutterDesktop, tablet: effGutterTablet, mobile: effGutterMobile };

  const resolveValue = (): number | null => {
    if (mode === "inherit") return null;
    if (mode === "disabled") return 0;
    const raw = Number(customWidth);
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return Math.min(Math.max(Math.round(raw), MIN_WIDTH), MAX_WIDTH);
  };

  const apply = async () => {
    if (errors.length > 0) {
      toast({ title: "Fix conflicting values", description: errors[0], variant: "destructive" });
      return;
    }
    if (ids.length === 0) return;
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
      .in("id", ids);
    setSaving(false);
    if (error) {
      toast({ title: "Could not apply", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Settings applied",
      description: `Updated content width & gutters on ${ids.length} ${table === "templates" ? "template(s)" : "page(s)"}.`,
    });
    onApplied?.();
    onOpenChange(false);
  };

  const label = table === "templates" ? "template(s)" : "page(s)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply content width to {ids.length} {label}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          These values will overwrite the boxed content width and gutter settings on every selected item.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Behavior</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">Inherit default</SelectItem>
                <SelectItem value="disabled">Full width (no box)</SelectItem>
                <SelectItem value="custom">Boxed at fixed width…</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "custom" && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" /> Desktop width (px)</Label>
              <Input type="number" min={MIN_WIDTH} max={MAX_WIDTH} value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} />
            </div>
          )}
        </div>

        {mode !== "disabled" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2 rounded-md border p-2">
              <div className="flex items-center gap-1.5 text-xs font-medium"><Monitor className="h-3.5 w-3.5" /> Desktop</div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Gutter (px)</Label>
                <Input type="number" min={0} max={MAX_GUTTER} placeholder={String(DEFAULT_GUTTER.desktop)} value={gutterDesktop} onChange={(e) => setGutterDesktop(e.target.value)} className="h-8" />
              </div>
            </div>
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
        )}

        {errors.length > 0 && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
            <div className="flex items-center gap-1.5 font-medium"><AlertTriangle className="h-3.5 w-3.5" /> Conflicting values</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}
        {errors.length === 0 && warnings.length > 0 && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
            <div className="flex items-center gap-1.5 font-medium"><AlertTriangle className="h-3.5 w-3.5" /> Heads up</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        )}

        <div className="space-y-2 rounded-lg border p-3">
          <Label>Live preview — all devices</Label>
          <BoxPreview boxingEnabled={boxingEnabled} widths={previewWidths} gutters={previewGutters} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={apply} disabled={saving || errors.length > 0 || ids.length === 0}>
            {saving ? "Applying…" : `Apply to ${ids.length} ${label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
