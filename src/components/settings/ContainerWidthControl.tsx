import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutTemplate } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { config } from "@/lib/config";

const MIN_WIDTH = 320;
const MAX_WIDTH = 1920;
const DEFAULT_WIDTH = config.layout.defaultContainerWidth;

type Mode = "inherit" | "disabled" | "custom";

/**
 * Reusable boxed content-width override control. Persists a `container_width`
 * value directly on a `templates` or `generated_pages` row.
 *
 * Semantics of the stored value:
 *   - null  → inherit (template inherits workspace; page inherits template)
 *   - 0     → boxing disabled (content spans full width)
 *   - >0    → box content at this pixel width while backgrounds stay full-width
 *
 * Includes a live "Content width" preview toggle so you can compare boxed vs
 * full-width layout instantly before publishing.
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewBoxed, setPreviewBoxed] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      const { data } = await supabase
        .from(table)
        .select("container_width")
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      const w = (data as { container_width?: number | null } | null)?.container_width;
      if (w === null || w === undefined) {
        setMode("inherit");
      } else if (w <= 0) {
        setMode("disabled");
      } else {
        setMode("custom");
        setCustomWidth(String(w));
      }
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

  const resolveValue = (): number | null => {
    if (mode === "inherit") return null;
    if (mode === "disabled") return 0;
    const raw = Number(customWidth);
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return Math.min(Math.max(Math.round(raw), MIN_WIDTH), MAX_WIDTH);
  };

  const save = async () => {
    if (!id) return;
    if (customError) {
      toast({ title: "Invalid width", description: customError, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from(table)
      .update({ container_width: resolveValue() })
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
          : `Content will be boxed at ${val}px, backgrounds stay full-width.`,
    });
  };

  // Effective width for the live preview.
  const previewWidth = (() => {
    if (mode === "custom") {
      const raw = Number(customWidth);
      if (Number.isFinite(raw) && raw > 0) return Math.min(Math.max(Math.round(raw), MIN_WIDTH), MAX_WIDTH);
      return DEFAULT_WIDTH;
    }
    // inherit uses the configured default; disabled has no box
    return DEFAULT_WIDTH;
  })();

  const CANVAS = 1440; // simulated viewport
  // "disabled" mode never boxes; otherwise the preview toggle drives it.
  const boxedApplied = mode !== "disabled" && previewBoxed;
  const boxedPct = Math.min((previewWidth / CANVAS) * 100, 100);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <LayoutTemplate className="h-4 w-4" />
        Boxed content width
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Center the content in a fixed-width box while section backgrounds stay edge-to-edge.
        Default is {DEFAULT_WIDTH}px.
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
            <Label>Width (px)</Label>
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

      {/* Live content-width preview */}
      <div className="mt-3 space-y-2 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label>Content width preview</Label>
            <p className="text-xs text-muted-foreground">
              {boxedApplied
                ? `Boxed at ~${previewWidth}px, section backgrounds full-width.`
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
        <Button size="sm" onClick={save} disabled={saving || loading || !!customError || !id}>
          {saving ? "Saving…" : "Save content width"}
        </Button>
      </div>
    </div>
  );
}
