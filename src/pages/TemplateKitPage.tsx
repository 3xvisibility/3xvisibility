import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Boxes, Image as ImageIcon, Loader2, Save, ShieldCheck, Sparkles, Wand2,
  CheckCircle2, XCircle, Code2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface KitTemplate {
  source_template_id: string;
  name: string;
  category: string;
  preview_image: string | null;
  placeholders: Record<string, string>;
  default_content: Record<string, string>;
  default_limits: Record<string, { maxWords: number; maxChars: number }>;
  image_map: Record<string, { url: string; alt: string; role: string }>;
  shopify_section_json: { mappedFields?: string[]; sectionLiquid?: string } | null;
}

interface ValidationReport {
  similarity: number;
  violations: number;
  image_count: number;
  has_ai_image: boolean;
  pass_image_only: boolean;
  pass_similarity_gate: boolean;
  pass_editability: boolean;
  shopify_section_present: boolean;
  ok: boolean;
}

export default function TemplateKitPage() {
  const [selectedId, setSelectedId] = useState<string>("");
  const [draftLimits, setDraftLimits] = useState<Record<string, { maxWords: number; maxChars: number }>>({});
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [report, setReport] = useState<ValidationReport | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["kit-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elementor_templates")
        .select("source_template_id,name,category,preview_image,placeholders,default_content,default_limits,image_map,shopify_section_json")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as KitTemplate[];
    },
  });

  const active = useMemo(
    () => templates.find((t) => t.source_template_id === (selectedId || templates[0]?.source_template_id)) || null,
    [templates, selectedId],
  );

  // Placeholder rows joined with default content + (draft) limits.
  const rows = useMemo(() => {
    if (!active) return [];
    const limits = { ...(active.default_limits || {}), ...draftLimits };
    return Object.entries(active.placeholders || {}).map(([token, fieldKey]) => ({
      token,
      fieldKey,
      defaultText: active.default_content?.[fieldKey] ?? "",
      maxWords: limits[fieldKey]?.maxWords ?? wordCount(active.default_content?.[fieldKey] ?? ""),
      maxChars: limits[fieldKey]?.maxChars ?? (active.default_content?.[fieldKey] ?? "").length,
    }));
  }, [active, draftLimits]);

  const images = useMemo(
    () => (active ? Object.entries(active.image_map || {}) : []),
    [active],
  );

  function setLimit(fieldKey: string, key: "maxWords" | "maxChars", value: number) {
    setDraftLimits((prev) => {
      const base = active?.default_limits?.[fieldKey] || {
        maxWords: wordCount(active?.default_content?.[fieldKey] ?? ""),
        maxChars: (active?.default_content?.[fieldKey] ?? "").length,
      };
      return { ...prev, [fieldKey]: { ...base, ...prev[fieldKey], [key]: value } };
    });
  }

  async function save() {
    if (!active || Object.keys(draftLimits).length === 0) return;
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("update-template-kit", {
        body: { source_template_id: active.source_template_id, default_limits: { ...active.default_limits, ...draftLimits } },
      });
      if (error) throw error;
      toast.success("Character limits saved");
      setDraftLimits({});
    } catch (e: any) {
      toast.error(e?.message || "Failed to save limits");
    } finally {
      setSaving(false);
    }
  }

  async function runValidation() {
    if (!active) return;
    setValidating(true);
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("validate-template-kit", {
        body: { source_template_id: active.source_template_id },
      });
      if (error) throw error;
      const r = (data?.reports || [])[0] as ValidationReport | undefined;
      if (!r) throw new Error("No report returned");
      setReport(r);
      toast[r.ok ? "success" : "warning"](r.ok ? "Template passed all checks" : "Template has warnings");
    } catch (e: any) {
      toast.error(e?.message || "Validation failed");
    } finally {
      setValidating(false);
    }
  }

  const isDirty = Object.keys(draftLimits).length > 0;

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-display flex items-center gap-2">
          <Boxes className="h-5 w-5 text-primary" />
          Template Kit Mapping & Limits
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Preview placeholder mappings, edit per-field character limits, and validate the
          98% similarity gate, image rendering and editability before publishing.
        </p>
      </div>

      <Card className="shadow-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Choose a template</CardTitle>
          <CardDescription className="text-xs">
            Every marketplace template is stored as a native Elementor + Shopify section kit.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <Skeleton className="h-9 w-full max-w-sm" />
          ) : templates.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4">
              No converted templates found yet.
            </div>
          ) : (
            <Select
              value={active?.source_template_id || ""}
              onValueChange={(v) => { setSelectedId(v); setDraftLimits({}); setReport(null); }}
            >
              <SelectTrigger className="w-full sm:max-w-md h-9">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.source_template_id} value={t.source_template_id}>
                    {t.name} · {t.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {active && (
        <>
          {/* Validation summary */}
          <Card className="shadow-surface">
            <CardHeader className="pb-3 flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Pre-publish validation
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Runs server-side — no live site required.
                </CardDescription>
              </div>
              <Button size="sm" className="h-8" onClick={runValidation} disabled={validating}>
                {validating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
                Run checks
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {report ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Stat label="Visual similarity" value={`${report.similarity}%`} ok={report.pass_similarity_gate} hint="Target 98%" />
                  <CheckStat label="Images only (no AI)" ok={report.pass_image_only} />
                  <CheckStat label="Native editability" ok={report.pass_editability} />
                  <Stat label="Template images" value={String(report.image_count)} ok={report.image_count > 0} hint={report.shopify_section_present ? "Shopify section ✓" : "No Shopify section"} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Run checks to verify this template before publishing.</p>
              )}
            </CardContent>
          </Card>

          {/* Save bar */}
          <div className={`sticky top-0 z-20 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 backdrop-blur ${isDirty ? "border-amber-300 bg-amber-50/90 dark:bg-amber-500/10" : "border-border bg-background/80"}`}>
            <span className="text-xs text-muted-foreground">
              {isDirty ? `${Object.keys(draftLimits).length} field limit(s) changed` : "All limits saved"}
            </span>
            <Button size="sm" className="h-8" onClick={save} disabled={!isDirty || saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save limits
            </Button>
          </div>

          {/* Placeholder + limits table */}
          <Card className="shadow-surface overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Placeholders & character limits
                <Badge variant="outline" className="text-[10px]">{rows.length}</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Each token maps to an editable field. AI-generated content is clamped to these limits.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Placeholder</TableHead>
                      <TableHead className="min-w-[120px]">Field</TableHead>
                      <TableHead className="hidden md:table-cell">Default content</TableHead>
                      <TableHead className="w-[110px]">Max words</TableHead>
                      <TableHead className="w-[110px]">Max chars</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.token}>
                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.token}</code></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.fieldKey}</TableCell>
                        <TableCell className="hidden md:table-cell max-w-[280px] truncate text-xs text-muted-foreground">{stripTags(r.defaultText)}</TableCell>
                        <TableCell>
                          <Input type="number" min={1} className="h-8 w-20" value={r.maxWords}
                            onChange={(e) => setLimit(r.fieldKey, "maxWords", Number(e.target.value))} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={1} className="h-8 w-20" value={r.maxChars}
                            onChange={(e) => setLimit(r.fieldKey, "maxChars", Number(e.target.value))} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No placeholders detected.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Image map */}
          <Card className="shadow-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" /> Template images
                <Badge variant="outline" className="text-[10px]">{images.length}</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Only these images are used. They upload to the WordPress Media Library / Shopify Files at publish time.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {images.length === 0 ? (
                <p className="text-xs text-muted-foreground">No images referenced by this template.</p>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {images.map(([key, img]) => (
                      <div key={key} className="space-y-1">
                        <div className="aspect-video rounded-md border overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt={img.alt} loading="lazy" className="h-full w-full object-cover" />
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{key} · {img.role}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {active.shopify_section_json?.sectionLiquid && (
            <Card className="shadow-surface">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-primary" /> Shopify Online Store 2.0 section
                  <Badge variant="outline" className="text-[10px]">{(active.shopify_section_json.mappedFields || []).length} editable</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Native section liquid (markup + schema) published to your live theme for 1:1 design.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="max-h-56 rounded-md border bg-muted/40">
                  <pre className="p-3 text-[10px] leading-relaxed whitespace-pre-wrap break-all">{active.shopify_section_json.sectionLiquid.slice(0, 4000)}</pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function wordCount(s: string): number {
  const t = stripTags(s);
  return t ? t.split(/\s+/).length : 0;
}
function stripTags(s: string): string {
  return (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function Stat({ label, value, ok, hint }: { label: string; value: string; ok: boolean; hint?: string }) {
  return (
    <div className={`rounded-lg border p-3 ${ok ? "border-emerald-300/60" : "border-amber-300/60"}`}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
function CheckStat({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`rounded-lg border p-3 flex items-center gap-2 ${ok ? "border-emerald-300/60" : "border-destructive/40"}`}>
      {ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
      <p className="text-xs">{label}</p>
    </div>
  );
}
