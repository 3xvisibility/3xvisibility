import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronUp, ChevronDown, Wand2, Palette, Type, Layers, X } from "lucide-react";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { PlatformSkinPicker } from "@/components/campaigns/PlatformSkinPicker";
import { defaultSkinVariant, type TemplatePlatform } from "@/lib/marketplace-templates";
import {
  initState,
  buildOutput,
  extractSections,
  isCustomizable,
  type CustomizerState,
} from "@/lib/template-customizer";

interface TemplateCustomizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  content: string;
  onSave: (content: string) => void;
  isPending?: boolean;
}

const PLATFORM_OPTIONS: { value: TemplatePlatform; label: string }[] = [
  { value: "generic", label: "Generic (no platform skin)" },
  { value: "wordpress", label: "WordPress" },
  { value: "shopify", label: "Shopify" },
  { value: "prestashop", label: "PrestaShop" },
];

const ACCENT_PRESETS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#111827"];

export function TemplateCustomizerDialog({
  open,
  onOpenChange,
  templateName,
  content,
  onSave,
  isPending,
}: TemplateCustomizerDialogProps) {
  const editable = useMemo(() => isCustomizable(content), [content]);
  const [state, setState] = useState<CustomizerState>(() => initState(content));

  // Reset controls whenever a different template is opened.
  useEffect(() => {
    if (open) setState(initState(content));
  }, [open, content]);

  const sections = useMemo(() => extractSections(content), [content]);
  const output = useMemo(() => buildOutput(content, state), [content, state]);

  const setHero = (key: keyof CustomizerState["hero"], value: string) =>
    setState((s) => ({ ...s, hero: { ...s.hero, [key]: value } }));

  const moveSection = (pos: number, dir: -1 | 1) => {
    setState((s) => {
      const next = [...s.order];
      const target = pos + dir;
      if (target < 0 || target >= next.length) return s;
      [next[pos], next[target]] = [next[target], next[pos]];
      return { ...s, order: next };
    });
  };

  const setPlatform = (platform: TemplatePlatform) =>
    setState((s) => ({
      ...s,
      platform,
      variant: platform === "generic" ? "" : defaultSkinVariant(platform),
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[88vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Customize “{templateName}”
          </DialogTitle>
          <DialogDescription>
            Tweak hero copy, accent color, section order and the platform theme skin before publishing.
          </DialogDescription>
        </DialogHeader>

        {!editable ? (
          <div className="flex-1 flex items-center justify-center p-10 text-center">
            <p className="text-sm text-muted-foreground max-w-md">
              This template doesn't use the visual design system, so hero / color / section editing
              isn't available. Use the full editor to change it.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] flex-1 min-h-0">
            {/* Controls */}
            <ScrollArea className="border-r border-border">
              <div className="p-5 space-y-6">
                {/* Platform skin */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-semibold">Platform &amp; theme skin</Label>
                  </div>
                  <Select value={state.platform} onValueChange={(v) => setPlatform(v as TemplatePlatform)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORM_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {state.platform !== "generic" && (
                    <PlatformSkinPicker
                      platform={state.platform}
                      value={state.variant}
                      onChange={(variant) => setState((s) => ({ ...s, variant }))}
                    />
                  )}
                </section>

                <Separator />

                {/* Accent color */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-semibold">Accent color</Label>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {ACCENT_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Accent ${c}`}
                        onClick={() => setState((s) => ({ ...s, accent: c }))}
                        className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                          state.accent.toLowerCase() === c ? "border-foreground" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <Input
                      type="color"
                      value={state.accent || "#6366f1"}
                      onChange={(e) => setState((s) => ({ ...s, accent: e.target.value }))}
                      className="h-7 w-10 p-1 cursor-pointer"
                    />
                    {state.accent && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setState((s) => ({ ...s, accent: "" }))}
                      >
                        <X className="h-3 w-3 mr-1" /> Reset
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Leave unset to keep the template's original colors.
                  </p>
                </section>

                {/* Hero copy */}
                {state.hero.hasHero && (
                  <>
                    <Separator />
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Type className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-semibold">Hero content</Label>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Badge</Label>
                        <Input value={state.hero.badge} onChange={(e) => setHero("badge", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Title</Label>
                        <Input value={state.hero.title} onChange={(e) => setHero("title", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Subtitle</Label>
                        <Input value={state.hero.subtitle} onChange={(e) => setHero("subtitle", e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Primary button</Label>
                          <Input value={state.hero.primaryCta} onChange={(e) => setHero("primaryCta", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Secondary button</Label>
                          <Input value={state.hero.secondaryCta} onChange={(e) => setHero("secondaryCta", e.target.value)} />
                        </div>
                      </div>
                    </section>
                  </>
                )}

                {/* Section order */}
                {sections.length > 1 && (
                  <>
                    <Separator />
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-semibold">Section order</Label>
                      </div>
                      <div className="space-y-1.5">
                        {state.order.map((origIdx, pos) => {
                          const info = sections[origIdx];
                          return (
                            <div
                              key={origIdx}
                              className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                            >
                              <span className="text-xs font-medium tabular-nums text-muted-foreground w-5">
                                {pos + 1}
                              </span>
                              <span className="text-sm flex-1 truncate">{info?.label ?? `Section ${origIdx + 1}`}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={pos === 0}
                                onClick={() => moveSection(pos, -1)}
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={pos === state.order.length - 1}
                                onClick={() => moveSection(pos, 1)}
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Live preview */}
            <div className="min-h-0 bg-muted/20">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <TemplatePreview html={output} className="w-full rounded-lg border border-border bg-background" />
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(output)}
            disabled={isPending || !editable}
            className="bg-gradient-primary hover:brightness-110 gap-2"
          >
            <Wand2 className="h-4 w-4" />
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
