import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Smile, Plus, Trash2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  loadEmojiIconOverrides,
  saveEmojiIconOverrides,
} from "@/lib/emoji-icon-overrides";
import { getDefaultEmojiIconMap } from "@/lib/connectors/elementor-engine";

interface Row {
  emoji: string;
  icon: string;
}

/**
 * Lets the user customize or override how emojis are converted into native
 * Elementor Icon widgets during page generation/publish. Overrides win over the
 * built-in map; an empty icon field means "keep the original emoji as text".
 */
export default function EmojiIconMappingCard() {
  const { toast } = useToast();
  const defaults = useMemo(() => getDefaultEmojiIconMap(), []);
  const [rows, setRows] = useState<Row[]>(() =>
    Object.entries(loadEmojiIconOverrides()).map(([emoji, icon]) => ({ emoji, icon })),
  );

  const addRow = () => setRows((r) => [...r, { emoji: "", icon: "" }]);
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const save = () => {
    const overrides: Record<string, string> = {};
    for (const { emoji, icon } of rows) {
      const key = emoji.trim();
      if (!key) continue;
      overrides[key] = icon.trim(); // "" = keep original emoji text
    }
    saveEmojiIconOverrides(overrides);
    toast({
      title: "Emoji mapping saved",
      description: `${Object.keys(overrides).length} override(s) will apply on the next page generation.`,
    });
  };

  const clearAll = () => {
    setRows([]);
    saveEmojiIconOverrides({});
    toast({ title: "Overrides cleared", description: "Reverted to the built-in emoji mapping." });
  };

  const prefillDefault = (emoji: string, icon: string) => {
    setRows((r) => {
      if (r.some((row) => row.emoji === emoji)) return r;
      return [...r, { emoji, icon }];
    });
  };

  return (
    <Card className="shadow-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smile className="h-4 w-4" />
          Emoji → Icon Mapping
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Customize how emojis in your templates convert into native Elementor Icon widgets when
          pages are generated. Use a Font Awesome token like <code className="rounded bg-muted px-1">fa-rocket</code>.
          Leave the icon empty to keep the original emoji as text. Overrides take priority over the
          built-in mapping.
        </p>

        <div className="space-y-2">
          {rows.length === 0 && (
            <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              No overrides yet — the built-in mapping is used. Add a row to customize.
            </p>
          )}
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                aria-label="Emoji"
                placeholder="🚀"
                value={row.emoji}
                onChange={(e) => update(i, { emoji: e.target.value })}
                className="w-20 text-center"
              />
              <span className="text-muted-foreground">→</span>
              <Input
                aria-label="Font Awesome icon token"
                placeholder="fa-rocket (empty = keep emoji text)"
                value={row.icon}
                onChange={(e) => update(i, { icon: e.target.value })}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => removeRow(i)} aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1 h-4 w-4" /> Add override
          </Button>
          <Button size="sm" onClick={save}>Save mapping</Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <RotateCcw className="mr-1 h-4 w-4" /> Reset to defaults
          </Button>
        </div>

        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Built-in defaults ({defaults.length}) — click an emoji to override it
          </summary>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {defaults.map(([emoji, icon]) => (
              <Badge
                key={emoji + icon}
                variant="outline"
                className="cursor-pointer"
                title={icon}
                onClick={() => prefillDefault(emoji, icon)}
              >
                {emoji} {icon}
              </Badge>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
