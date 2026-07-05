import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutTemplate } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const PRESETS = ["1140", "1200", "custom"] as const;

/**
 * Lets a workspace enforce an Elementor-style fixed content width (e.g. 1140 /
 * 1200px) on published pages. Sections stay full-width while their content sits
 * in a centered boxed container — reducing layout drift between the marketplace
 * template and the live page.
 */
export default function ElementorLayoutSettingsCard() {
  const { toast } = useToast();
  const { currentWorkspace, refetch } = useWorkspace();

  const [enabled, setEnabled] = useState(false);
  const [preset, setPreset] = useState<(typeof PRESETS)[number]>("1140");
  const [customWidth, setCustomWidth] = useState("1140");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewEnforced, setPreviewEnforced] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!currentWorkspace?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from("workspaces")
        .select("elementor_container_width")
        .eq("id", currentWorkspace.id)
        .maybeSingle();
      if (!active) return;
      const w = (data as { elementor_container_width?: number } | null)?.elementor_container_width ?? 0;
      if (w > 0) {
        setEnabled(true);
        if (String(w) === "1140" || String(w) === "1200") {
          setPreset(String(w) as (typeof PRESETS)[number]);
        } else {
          setPreset("custom");
          setCustomWidth(String(w));
        }
      } else {
        setEnabled(false);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [currentWorkspace?.id]);

  const resolveWidth = (): number => {
    if (!enabled) return 0;
    const raw = preset === "custom" ? Number(customWidth) : Number(preset);
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.min(Math.max(Math.round(raw), 320), 1920);
  };

  const save = async () => {
    if (!currentWorkspace?.id) return;
    const width = resolveWidth();
    if (enabled && width <= 0) {
      toast({ title: "Invalid width", description: "Enter a width between 320 and 1920px.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("workspaces")
      .update({ elementor_container_width: width })
      .eq("id", currentWorkspace.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    await refetch();
    toast({
      title: "Layout setting saved",
      description: width > 0 ? `Pages will use a ${width}px content container.` : "Fixed container width disabled.",
    });
  };

  return (
    <Card className="shadow-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4" />
          Elementor Container Width
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enforce a fixed, centered content width (like Elementor's boxed container) on published pages.
          Section backgrounds stay full-width while the content is centered — reducing layout drift.
        </p>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label>Enforce fixed container width</Label>
            <p className="text-xs text-muted-foreground">Applied to native Elementor pages at publish time.</p>
          </div>
          <Switch checked={enabled} disabled={loading} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Preset width</Label>
              <Select value={preset} onValueChange={(v) => setPreset(v as (typeof PRESETS)[number])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1140">1140px (Elementor default)</SelectItem>
                  <SelectItem value="1200">1200px</SelectItem>
                  <SelectItem value="custom">Custom…</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {preset === "custom" && (
              <div className="space-y-1.5">
                <Label>Custom width (px)</Label>
                <Input
                  type="number"
                  min={320}
                  max={1920}
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* Live preview */}
        {(() => {
          const targetWidth = preset === "custom" ? Number(customWidth) : Number(preset);
          const safeWidth = Number.isFinite(targetWidth) && targetWidth > 0
            ? Math.min(Math.max(Math.round(targetWidth), 320), 1920)
            : 1140;
          const CANVAS = 1440; // simulated viewport width
          const applied = enabled && previewEnforced;
          const boxedPct = Math.min((safeWidth / CANVAS) * 100, 100);
          return (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label>Preview with enforcement</Label>
                  <p className="text-xs text-muted-foreground">
                    {applied
                      ? `Content boxed at ~${safeWidth}px, sections full-width.`
                      : "Content spans full width (no boxed container)."}
                  </p>
                </div>
                <Switch
                  checked={previewEnforced}
                  disabled={!enabled}
                  onCheckedChange={setPreviewEnforced}
                />
              </div>

              <div className="overflow-hidden rounded-md border bg-muted/30">
                {/* Section 1 (full-width background) */}
                <div className="w-full bg-primary/10 py-3">
                  <div
                    className="mx-auto rounded bg-primary/40 px-2 py-2 text-center text-[10px] font-medium text-primary-foreground transition-all duration-300"
                    style={{ width: applied ? `${boxedPct}%` : "100%" }}
                  >
                    Hero content
                  </div>
                </div>
                {/* Section 2 (full-width background, alt color) */}
                <div className="w-full bg-secondary/40 py-3">
                  <div
                    className="mx-auto flex gap-2 transition-all duration-300"
                    style={{ width: applied ? `${boxedPct}%` : "100%" }}
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
          );
        })()}

        <Button onClick={save} disabled={saving || loading}>
          {saving ? "Saving…" : "Save layout setting"}
        </Button>
      </CardContent>
    </Card>
  );
}
