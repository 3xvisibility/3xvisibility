import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Eye, Shuffle, ChevronLeft, ChevronRight, Table2 } from "lucide-react";
import { applyTransforms } from "@/lib/keyword-transforms";

interface LiveVariablePreviewProps {
  templateContent: string;
  csvData?: Record<string, string>[];
  className?: string;
}

/**
 * Renders a live preview of a template with variable substitution.
 * Uses CSV data rows as sample data, with manual override capability.
 */
export function LiveVariablePreview({ templateContent, csvData = [], className = "" }: LiveVariablePreviewProps) {
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Extract variables from template
  const variables = useMemo(() => {
    const matches = templateContent.match(/\{([a-z_][a-z0-9_]*?)(?::[\w()., ]+)?\}/gi) || [];
    const uniqueVars = new Set<string>();
    matches.forEach((m) => {
      const name = m.replace(/^\{/, "").replace(/(:.*?)?\}$/, "");
      uniqueVars.add(name.toLowerCase());
    });
    return Array.from(uniqueVars);
  }, [templateContent]);

  // Current row data merged with manual overrides
  const currentValues = useMemo(() => {
    const row = csvData[currentRowIndex] || {};
    const values: Record<string, string> = {};
    variables.forEach((v) => {
      // Try exact match, then case-insensitive
      const csvVal = row[v] ?? Object.entries(row).find(([k]) => k.toLowerCase() === v)?.[1] ?? "";
      values[v] = manualOverrides[v] !== undefined ? manualOverrides[v] : String(csvVal);
    });
    return values;
  }, [csvData, currentRowIndex, variables, manualOverrides]);

  // Resolve template with current values
  const resolvedHtml = useMemo(() => {
    let result = templateContent;

    // Resolve {variable:transform} patterns first
    result = result.replace(
      /\{([a-z_][a-z0-9_]*):((?:[a-z_]+(?:\([^)]*\))?:?)+)\}/gi,
      (_match, varName: string, transformChain: string) => {
        const value = currentValues[varName.toLowerCase()] ?? "";
        return applyTransforms(value, transformChain);
      }
    );

    // Resolve plain {variable} patterns
    result = result.replace(
      /\{([a-z_][a-z0-9_]*)\}/gi,
      (_match, varName: string) => {
        return currentValues[varName.toLowerCase()] ?? `{${varName}}`;
      }
    );

    return result;
  }, [templateContent, currentValues]);

  // Write to iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 16px; line-height: 1.6; color: #1a1a2e; font-size: 14px; }
  h1 { font-size: 1.5em; margin-bottom: 0.5em; color: #0f172a; }
  h2 { font-size: 1.2em; margin-top: 1em; margin-bottom: 0.4em; color: #1e293b; }
  h3 { font-size: 1.05em; margin-top: 0.8em; margin-bottom: 0.3em; color: #334155; }
  p { margin-bottom: 0.6em; }
  ul, ol { margin: 0.5em 0 0.5em 1.5em; }
  li { margin-bottom: 0.3em; }
  section { margin-bottom: 1em; }
  a { color: hsl(0 0% 30%); }
  img { max-width: 100%; height: auto; }
</style>
</head><body>${resolvedHtml}</body></html>`;

    doc.open();
    doc.write(html);
    doc.close();

    const resize = () => {
      if (doc.body) iframe.style.height = doc.body.scrollHeight + 24 + "px";
    };
    resize();
    const observer = new MutationObserver(resize);
    if (doc.body) observer.observe(doc.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [resolvedHtml]);

  const randomRow = useCallback(() => {
    if (csvData.length <= 1) return;
    let idx: number;
    do { idx = Math.floor(Math.random() * csvData.length); } while (idx === currentRowIndex);
    setCurrentRowIndex(idx);
    setManualOverrides({});
  }, [csvData.length, currentRowIndex]);

  if (!templateContent || variables.length === 0) return null;

  return (
    <Card className={`border-0 shadow-surface ${className}`}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" /> Live Content Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Preview your template with real data. {csvData.length > 0 ? `Showing row ${currentRowIndex + 1} of ${csvData.length}.` : "Enter sample values below."}
        </p>

        {/* Row navigation */}
        {csvData.length > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={currentRowIndex === 0}
              onClick={() => { setCurrentRowIndex((i) => i - 1); setManualOverrides({}); }}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Select
              value={String(currentRowIndex)}
              onValueChange={(v) => { setCurrentRowIndex(Number(v)); setManualOverrides({}); }}
            >
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {csvData.slice(0, 100).map((row, i) => (
                  <SelectItem key={i} value={String(i)} className="text-xs">
                    Row {i + 1} — {Object.values(row)[0] || ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              disabled={currentRowIndex >= csvData.length - 1}
              onClick={() => { setCurrentRowIndex((i) => i + 1); setManualOverrides({}); }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={randomRow}>
              <Shuffle className="h-3 w-3 mr-1" /> Random
            </Button>
          </div>
        )}

        {/* Variable inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 rounded-lg border border-border bg-muted/30">
          <div className="col-span-full flex items-center gap-2 mb-1">
            <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Variable Values</span>
            {Object.keys(manualOverrides).length > 0 && (
              <Button variant="ghost" size="sm" className="h-5 text-[10px] ml-auto" onClick={() => setManualOverrides({})}>
                Reset
              </Button>
            )}
          </div>
          {variables.map((v) => (
            <div key={v} className="space-y-1">
              <Label className="text-[11px] font-mono text-muted-foreground">{`{${v}}`}</Label>
              <Input
                className="h-7 text-xs"
                value={currentValues[v] || ""}
                onChange={(e) => setManualOverrides((prev) => ({ ...prev, [v]: e.target.value }))}
                placeholder={`Value for ${v}`}
              />
            </div>
          ))}
        </div>

        <Separator />

        {/* Rendered preview */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-[10px]">Rendered Output</Badge>
          </div>
          <iframe
            ref={iframeRef}
            className="w-full border border-border rounded-md bg-background"
            sandbox="allow-same-origin"
            title="Live Variable Preview"
            style={{ minHeight: 120, maxHeight: 600 }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
