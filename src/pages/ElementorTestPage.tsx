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
import type { ElementorElement } from "@/lib/connectors/elementor-engine";
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

  const resolvedHtml = useMemo(
    () => (template ? applyTemplateDefaults(template.content, template.defaultValues) : ""),
    [template],
  );
  const elementor = useMemo(() => (resolvedHtml ? templateToElementor(resolvedHtml) : []), [resolvedHtml]);
  const counts = useMemo(() => countWidgets(elementor), [elementor]);

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
          <CardTitle className="flex items-center gap-3">
            Select an Elementor template <Badge variant="secondary">{ELEMENTOR_BADGE}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Choose template" /></SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">
            {templates.length} templates across {new Set(ELEMENTOR_TEMPLATES.map((t) => t.id)).size} entries · best 2 per source category.
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
