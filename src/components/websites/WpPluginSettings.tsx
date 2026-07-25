import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Settings2, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export const DEFAULT_WP_PLUGIN_SETTINGS = {
  allowed_tags: ["style", "link", "script", "svg"],
  disable_wpautop: true,
};

/** Tags the companion plugin can whitelist inside post content. */
const TAG_OPTIONS: { tag: string; label: string; hint: string }[] = [
  { tag: "style", label: "<style>", hint: "Inline CSS blocks" },
  { tag: "link", label: "<link>", hint: "External stylesheet URLs" },
  { tag: "script", label: "<script>", hint: "Template JS / animations" },
  { tag: "svg", label: "<svg>", hint: "Inline icons & shapes" },
  { tag: "iframe", label: "<iframe>", hint: "Maps, video embeds" },
  { tag: "form", label: "<form>", hint: "Contact / lead forms" },
  { tag: "video", label: "<video>", hint: "Self-hosted video" },
  { tag: "audio", label: "<audio>", hint: "Self-hosted audio" },
  { tag: "canvas", label: "<canvas>", hint: "JS-drawn graphics" },
  { tag: "noscript", label: "<noscript>", hint: "No-JS fallbacks" },
];

export interface WpPluginSettingsValue {
  allowed_tags: string[];
  disable_wpautop: boolean;
}

function normalize(raw: unknown): WpPluginSettingsValue {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const tags = Array.isArray(obj.allowed_tags)
    ? (obj.allowed_tags as unknown[]).map((t) => String(t).toLowerCase().trim()).filter(Boolean)
    : DEFAULT_WP_PLUGIN_SETTINGS.allowed_tags;
  return {
    allowed_tags: Array.from(new Set(tags)),
    disable_wpautop: obj.disable_wpautop === undefined ? true : !!obj.disable_wpautop,
  };
}

/**
 * Per-site controls for the "3xVisibility HTML Assets" WordPress plugin:
 * which HTML tags survive `wp_kses_post()` and whether `wpautop` is disabled
 * on generated pages. Values are shipped as post meta on every publish, so no
 * code change is needed to fine-tune compatibility with a theme/host.
 */
export function WpPluginSettings({ websiteId, value }: { websiteId: string; value: unknown }) {
  const saved = useMemo(() => normalize(value), [value]);
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(saved.allowed_tags);
  const [wpautop, setWpautop] = useState(saved.disable_wpautop);
  const [customTag, setCustomTag] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setTags(saved.allowed_tags);
    setWpautop(saved.disable_wpautop);
  }, [saved]);

  const dirty =
    wpautop !== saved.disable_wpautop ||
    tags.slice().sort().join(",") !== saved.allowed_tags.slice().sort().join(",");

  const save = useMutation({
    mutationFn: async (next: WpPluginSettingsValue) => {
      const { error } = await supabase
        .from("websites")
        .update({ wp_plugin_settings: next } as never)
        .eq("id", websiteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      toast({
        title: "Plugin settings saved",
        description: "Re-publish the pages to apply the new tag/formatting rules.",
      });
    },
    onError: (err: Error) =>
      toast({ title: "Could not save settings", description: err.message, variant: "destructive" }),
  });

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const addCustomTag = () => {
    const t = customTag.toLowerCase().replace(/[^a-z0-9-]/g, "").trim();
    if (!t) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setCustomTag("");
  };

  const extraTags = tags.filter((t) => !TAG_OPTIONS.some((o) => o.tag === t));

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <Settings2 className="h-3.5 w-3.5 text-primary" /> Plugin compatibility settings
          </p>
          <p className="text-[11px] text-muted-foreground">
            Choose which tags the helper plugin keeps in page content and whether WordPress
            auto-paragraph formatting (<code className="text-[10px]">wpautop</code>) is disabled.
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide" : "Configure"}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold">Whitelisted tags</p>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map((o) => {
                const active = tags.includes(o.tag);
                return (
                  <button
                    key={o.tag}
                    type="button"
                    title={o.hint}
                    onClick={() => toggleTag(o.tag)}
                    className={cn(
                      "rounded-md border px-2 py-1 text-[11px] font-mono transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
              {extraTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className="rounded-md border border-primary bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary"
                >
                  {`<${t}>`}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              <Input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                placeholder="Custom tag (e.g. picture)"
                className="h-7 text-xs"
              />
              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={addCustomTag}>
                Add
              </Button>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold">Disable wpautop on generated pages</p>
              <p className="text-[11px] text-muted-foreground">
                Stops WordPress from inserting stray <code className="text-[10px]">&lt;p&gt;</code>/
                <code className="text-[10px]">&lt;br&gt;</code> tags that break flex/grid layouts.
              </p>
            </div>
            <Switch
              checked={wpautop}
              onCheckedChange={setWpautop}
              aria-label="Disable wpautop on generated pages"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs"
              onClick={() => {
                setTags(DEFAULT_WP_PLUGIN_SETTINGS.allowed_tags);
                setWpautop(DEFAULT_WP_PLUGIN_SETTINGS.disable_wpautop);
              }}
            >
              <RotateCcw className="h-3 w-3" /> Reset to defaults
            </Button>
            <div className="flex items-center gap-2">
              {dirty && <Badge variant="outline" className="text-[10px]">Unsaved</Badge>}
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={!dirty || save.isPending}
                onClick={() => save.mutate({ allowed_tags: tags, disable_wpautop: wpautop })}
              >
                {save.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                Save settings
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
