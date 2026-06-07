import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Languages, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useEffectiveLocales,
  saveLocaleOverride,
  resetLocaleConfig,
} from "@/i18n/localeConfig";
import type { Language } from "@/i18n/translations";

export default function LocaleSettingsCard() {
  const { toast } = useToast();
  const locales = useEffectiveLocales();
  const [drafts, setDrafts] = useState<Record<string, { label: string; flag: string }>>({});

  const getDraft = (code: string, label: string, flag: string) =>
    drafts[code] ?? { label, flag };

  const setDraft = (code: string, patch: Partial<{ label: string; flag: string }>) =>
    setDrafts((d) => ({
      ...d,
      [code]: { ...(d[code] ?? {}), ...patch } as { label: string; flag: string },
    }));

  const save = (code: Language, label: string, flag: string) => {
    try {
      saveLocaleOverride(code, { label, flag });
      setDrafts((d) => {
        const next = { ...d };
        delete next[code];
        return next;
      });
      toast({ title: "Saved", description: `Updated ${code.toUpperCase()} locale.` });
    } catch (e) {
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Invalid value.",
        variant: "destructive",
      });
    }
  };

  const toggle = (code: Language, enabled: boolean) => {
    try {
      saveLocaleOverride(code, { enabled });
    } catch (e) {
      toast({
        title: "Could not update",
        description: e instanceof Error ? e.message : "Invalid value.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="shadow-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          Supported Languages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Edit the display name, flag, and availability for each supported locale.
          Language codes and translations are fixed and can’t be changed here.
        </p>

        <div className="space-y-3">
          {locales.map((l) => {
            const draft = getDraft(l.code, l.label, l.flag);
            const dirty = draft.label !== l.label || draft.flag !== l.flag;
            return (
              <div
                key={l.code}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
              >
                <Badge variant="outline" className="font-mono uppercase">
                  {l.code}
                </Badge>
                <Input
                  aria-label={`${l.code} flag`}
                  value={draft.flag}
                  onChange={(e) => setDraft(l.code, { flag: e.target.value })}
                  className="w-16 text-center text-lg"
                  maxLength={8}
                />
                <Input
                  aria-label={`${l.code} label`}
                  value={draft.label}
                  onChange={(e) => setDraft(l.code, { label: e.target.value })}
                  className="flex-1 min-w-[140px]"
                />
                <div className="flex items-center gap-2">
                  <Switch
                    checked={l.enabled}
                    onCheckedChange={(v) => toggle(l.code, v)}
                    aria-label={`Enable ${l.code}`}
                  />
                  <span className="text-xs text-muted-foreground w-14">
                    {l.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <Button
                  size="sm"
                  disabled={!dirty}
                  onClick={() => save(l.code, draft.label, draft.flag)}
                >
                  Save
                </Button>
              </div>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            resetLocaleConfig();
            setDrafts({});
            toast({ title: "Reset", description: "Locale settings restored to defaults." });
          }}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to defaults
        </Button>
      </CardContent>
    </Card>
  );
}
