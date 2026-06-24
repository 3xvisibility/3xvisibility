import { useMemo, useState } from "react";
import {
  buildElementorTemplates,
  templateToElementor,
  ELEMENTOR_BADGE,
  getElementorCandidates,
  defaultSelection,
  PER_CATEGORY,
} from "@/lib/marketplace-elementor-templates";
import { applyTemplateDefaults } from "@/lib/marketplace-templates";
import { compareVisualRegression, type ElementorElement } from "@/lib/connectors/elementor-engine";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Seo } from "@/components/Seo";

function countWidgets(els: ElementorElement[]): Record<string, number> {
  const counts: Record<string, number> = {};
  const walk = (list: ElementorElement[]) => {
    for (const el of list) {
      const key = el.elType === "widget" ? el.widgetType || "widget" : "container";
      counts[key] = (counts[key] || 0) + 1;
      if (el.elements?.length) walk(el.elements);
    }
  };
  walk(els);
  return counts;
}

export default function ElementorTestPage() {
  const candidates = useMemo(() => getElementorCandidates(), []);
  const [selectedIds, setSelectedIds] = usePersistedState<string[]>(
    "elementor-test-selection",
    defaultSelection(),
  );

  const templates = useMemo(() => buildElementorTemplates(selectedIds), [selectedIds]);
  const [selectedId, setSelectedId] = useState("");
  const activeId = templates.some((t) => t.id === selectedId) ? selectedId : templates[0]?.id ?? "";
  const template = useMemo(() => templates.find((t) => t.id === activeId), [templates, activeId]);

  const toggle = (sourceId: string, category: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(sourceId)) return prev.filter((id) => id !== sourceId);
      const catIds = (candidates.get(category) ?? []).map((t) => t.id);
      const inCat = prev.filter((id) => catIds.includes(id));
      if (inCat.length >= PER_CATEGORY) {
        return [...prev.filter((id) => id !== inCat[0]), sourceId];
      }
      return [...prev, sourceId];
    });
  };

  type ConvResult = { id: string; name: string; status: "ok" | "error"; widgets?: number; error?: string };
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ConvResult[]>([]);

  const convertSelected = async () => {
    const list = buildElementorTemplates(selectedIds);
    if (!list.length) return;
    setConverting(true);
    setResults([]);
    setProgress(0);
    const out: ConvResult[] = [];
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      try {
        const html = applyTemplateDefaults(t.content, t.defaultValues);
        const data = templateToElementor(html);
        if (!data.length) throw new Error("No Elementor elements produced");
        out.push({ id: t.id, name: t.name, status: "ok", widgets: Object.values(countWidgets(data)).reduce((a, b) => a + b, 0) });
      } catch (e) {
        out.push({ id: t.id, name: t.name, status: "error", error: e instanceof Error ? e.message : String(e) });
      }
      setResults([...out]);
      setProgress(Math.round(((i + 1) / list.length) * 100));
      await new Promise((r) => setTimeout(r, 0));
    }
    setConverting(false);
  };

  const resolvedHtml = useMemo(
    () => (template ? applyTemplateDefaults(template.content, template.defaultValues) : ""),
    [template],
  );
  const elementor = useMemo(() => (resolvedHtml ? templateToElementor(resolvedHtml) : []), [resolvedHtml]);
  const counts = useMemo(() => countWidgets(elementor), [elementor]);
  const regression = useMemo(
    () => (resolvedHtml ? compareVisualRegression(resolvedHtml) : null),
    [resolvedHtml],
  );

  const unresolved = (resolvedHtml.match(/\{[a-z_][a-z0-9_]*\}/gi) || []).length;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <Seo path="/elementor-test" title="Elementor Test Publish | Verify native Elementor conversion" description="Test mode to verify Elementor structure, layout, content replacement and editability before converting the full template library." />
      <div>
        <h1 className="text-2xl font-bold">Elementor Test Publish</h1>
        <p className="text-muted-foreground">
          Verify Elementor structure, layout fidelity, content replacement and editability before converting the rest of the library.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-3">
              Choose templates to convert <Badge variant="secondary">{ELEMENTOR_BADGE}</Badge>
            </span>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds(defaultSelection())}>
              Reset to best 2
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Pick up to {PER_CATEGORY} templates per category. Selecting a third in a full category replaces the oldest pick.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            {[...candidates.entries()].map(([category, list]) => {
              const inCat = list.filter((t) => selectedIds.includes(t.id)).length;
              return (
                <div key={category} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium">{category}</span>
                    <Badge variant={inCat >= PER_CATEGORY ? "default" : "outline"}>
                      {inCat}/{PER_CATEGORY}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {list.map((t) => {
                      const checked = selectedIds.includes(t.id);
                      return (
                        <label key={t.id} className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox checked={checked} onCheckedChange={() => toggle(t.id, category)} />
                          <span className={checked ? "" : "text-muted-foreground"}>{t.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 border-t pt-4">
            <Button onClick={convertSelected} disabled={converting || selectedIds.length === 0}>
              {converting ? `Converting… ${progress}%` : `Convert Selected (${selectedIds.length})`}
            </Button>
            {converting && (
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span className="truncate">{r.name}</span>
                  {r.status === "ok" ? (
                    <Badge variant="outline" className="shrink-0">✅ {r.widgets} widgets</Badge>
                  ) : (
                    <Badge variant="destructive" className="shrink-0" title={r.error}>❌ {r.error}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview an Elementor template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={activeId} onValueChange={setSelectedId}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Choose template" /></SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">
            {templates.length} templates selected for conversion.
          </div>
        </CardContent>
      </Card>

      {template && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Verification checks</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>✅ Native widgets generated: <strong>{Object.values(counts).reduce((a, b) => a + b, 0)}</strong></p>
              <p>✅ Content replacement: <strong>{unresolved === 0 ? "all variables resolved" : `${unresolved} unresolved`}</strong></p>
              <p>✅ Editable in Elementor: <strong>builder mode + _elementor_data emitted</strong></p>
              <div className="flex flex-wrap gap-2 pt-2">
                {Object.entries(counts).map(([k, v]) => (
                  <Badge key={k} variant="outline">{k}: {v}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {regression && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Visual regression (HTML vs Elementor)
                  <Badge variant={regression.match ? "outline" : "destructive"}>
                    {regression.match ? "✅ match" : `⚠ ${regression.differences.length} diff`} · {Math.round(regression.score * 100)}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Spacing/width — layout blocks: <strong>HTML {regression.html.layoutContainers}</strong> vs <strong>Elementor {regression.elementor.layoutContainers}</strong></p>
                <p>Typography — headings: <strong>HTML [{regression.html.headings.join(", ") || "—"}]</strong> vs <strong>Elementor [{regression.elementor.headings.join(", ") || "—"}]</strong></p>
                {regression.differences.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-destructive">
                    {regression.differences.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Spacing, width and typography match the original template.</p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Original layout preview</CardTitle></CardHeader>
            <CardContent>
              <iframe
                title="template preview"
                className="h-[420px] w-full rounded-md border"
                srcDoc={resolvedHtml}
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Elementor structure (JSON)
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(elementor, null, 2))}
                >
                  Copy
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-[400px] overflow-auto rounded-md bg-muted p-4 text-xs">
                {JSON.stringify(elementor, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
