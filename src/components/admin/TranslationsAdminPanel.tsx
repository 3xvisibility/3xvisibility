import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, Trash2, RotateCcw } from "lucide-react";
import { translations, languages, type Language } from "@/i18n/translations";
import { clearOverridesCache } from "@/i18n/overrides";

interface OverrideRow {
  id: string;
  language: string;
  key: string;
  value: string;
}

export default function TranslationsAdminPanel() {
  const qc = useQueryClient();
  const [language, setLanguage] = useState<Language>("en");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ["translation-overrides-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("translation_overrides")
        .select("id, language, key, value")
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as OverrideRow[];
    },
  });

  const overrideFor = useMemo(() => {
    const map: Record<string, OverrideRow> = {};
    for (const row of overrides) {
      if (row.language === language) map[row.key] = row;
    }
    return map;
  }, [overrides, language]);

  const baseKeys = useMemo(() => Object.keys(translations.en ?? {}).sort(), []);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return baseKeys
      .map((key) => ({
        key,
        base: translations.en?.[key] ?? key,
        localized: translations[language]?.[key] ?? "",
        override: overrideFor[key]?.value ?? "",
      }))
      .filter((r) =>
        !term
          ? true
          : r.key.toLowerCase().includes(term) ||
            r.base.toLowerCase().includes(term) ||
            r.localized.toLowerCase().includes(term) ||
            r.override.toLowerCase().includes(term)
      )
      .slice(0, 300);
  }, [baseKeys, language, overrideFor, search]);

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("translation_overrides")
        .upsert({ language, key, value }, { onConflict: "language,key" });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      clearOverridesCache();
      setDrafts((d) => {
        const next = { ...d };
        delete next[vars.key];
        return next;
      });
      qc.invalidateQueries({ queryKey: ["translation-overrides-admin"] });
      toast.success("Text saved");
    },
    onError: (e: Error) => toast.error(e.message || "Could not save"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("translation_overrides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      clearOverridesCache();
      qc.invalidateQueries({ queryKey: ["translation-overrides-admin"] });
      toast.success("Reset to default");
    },
    onError: (e: Error) => toast.error(e.message || "Could not reset"),
  });

  const customCount = Object.keys(overrideFor).length;

  return (
    <Card data-no-autotranslate>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Translations
          <Badge variant="secondary">{customCount} customised</Badge>
        </CardTitle>
        <CardDescription>
          Edit any text on the site per language. Saved text replaces the built-in wording everywhere it appears.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1 sm:w-56">
            <Label>Language</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {languages.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.name} ({l.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label>Search</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by key or text…" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Key</TableHead>
                  <TableHead className="w-[260px]">Default</TableHead>
                  <TableHead>Custom text</TableHead>
                  <TableHead className="w-[130px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const current = drafts[r.key] ?? r.override ?? "";
                  const fallback = r.localized || r.base;
                  const existing = overrideFor[r.key];
                  return (
                    <TableRow key={r.key}>
                      <TableCell className="font-mono text-xs align-top">{r.key}</TableCell>
                      <TableCell className="text-xs text-muted-foreground align-top">{fallback}</TableCell>
                      <TableCell className="align-top">
                        <Input
                          value={current}
                          placeholder={fallback}
                          onChange={(e) => setDrafts((d) => ({ ...d, [r.key]: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            disabled={!current.trim() || current === r.override || saveMutation.isPending}
                            onClick={() => saveMutation.mutate({ key: r.key, value: current })}
                            title="Save"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={!existing || deleteMutation.isPending}
                            onClick={() => existing && deleteMutation.mutate(existing.id)}
                            title="Reset to default"
                          >
                            {existing ? <Trash2 className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      No matching text.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Showing up to 300 entries — use search to narrow down. Changes appear after the next page refresh.
        </p>
      </CardContent>
    </Card>
  );
}
