import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutTemplate } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const MIN_WIDTH = 320;
const MAX_WIDTH = 1920;

type Mode = "inherit" | "disabled" | "custom";

/**
 * Reusable boxed content-width override control. Persists a `container_width`
 * value directly on a `templates` or `generated_pages` row.
 *
 * Semantics of the stored value:
 *   - null  → inherit (template inherits workspace; page inherits template)
 *   - 0     → boxing disabled (content spans full width)
 *   - >0    → box content at this pixel width while backgrounds stay full-width
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
  const [customWidth, setCustomWidth] = useState("1140");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className={className}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <LayoutTemplate className="h-4 w-4" />
        Boxed content width
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Center the content in a fixed-width box while section backgrounds stay edge-to-edge.
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
              <p className="text-xs text-muted-foreground">e.g. 1140 (Elementor default). Range {MIN_WIDTH}–{MAX_WIDTH}px.</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-3">
        <Button size="sm" onClick={save} disabled={saving || loading || !!customError || !id}>
          {saving ? "Saving…" : "Save content width"}
        </Button>
      </div>
    </div>
  );
}
