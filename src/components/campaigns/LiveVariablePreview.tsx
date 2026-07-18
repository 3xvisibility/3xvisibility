import { useMemo, useState } from "react";
import { Sparkles, ChevronLeft, ChevronRight, Eye, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  templateVars: string[];
  /** Template patterns to resolve. */
  patterns: {
    seoTitle?: string;
    seoDescription?: string;
    slug?: string;
    h1?: string;
    contentHtml?: string;
  };
  /** Rows from the current data source (CSV, AI-generated, website). */
  rows: Record<string, string>[];
  /** Manual mappings: template variable → CSV column. */
  manualMappings: Record<string, string>;
  /** Custom static values keyed by template variable. */
  customValues: Record<string, string>;
}

/** Highlight `{var}` placeholders that weren't replaced (in red). */
function renderResolvedHtml(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped.replace(
    /\{([^}]+)\}/g,
    '<span class="bg-destructive/15 text-destructive font-mono px-1 rounded">{$1}</span>',
  );
}

/** Highlight the values that came FROM variables (in green) by scanning input. */
function highlightFilledSegments(resolved: string, filledValues: string[]): string {
  let out = resolved.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Sort longest first so "New York City" beats "New York".
  const sorted = [...new Set(filledValues.filter(v => v && v.length > 0))].sort((a, b) => b.length - a.length);
  for (const v of sorted) {
    const safe = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(
      new RegExp(safe, "gi"),
      (m) => `<span class="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium px-0.5 rounded">${m}</span>`,
    );
  }
  // Unmatched placeholders (still `{something}`) → red.
  out = out.replace(
    /\{([^}]+)\}/g,
    '<span class="bg-destructive/15 text-destructive font-mono px-1 rounded">{$1}</span>',
  );
  return out;
}

export function LiveVariablePreview({ templateVars, patterns, rows, manualMappings, customValues }: Props) {
  const [idx, setIdx] = useState(0);

  const resolved = useMemo(() => {
    if (!rows || rows.length === 0 || templateVars.length === 0) return null;
    const safeIdx = Math.min(idx, rows.length - 1);
    const row = rows[safeIdx] || {};

    // Build effective variable → value map.
    const varMap: Record<string, string> = {};
    const usedValues: string[] = [];
    for (const v of templateVars) {
      let value = "";
      if (customValues[v] && customValues[v].trim() !== "") value = customValues[v];
      else if (manualMappings[v] && row[manualMappings[v]] != null) value = String(row[manualMappings[v]] ?? "");
      else if (row[v] != null) value = String(row[v] ?? "");
      else {
        // Case-insensitive fallback.
        const key = Object.keys(row).find(k => k.toLowerCase() === v.toLowerCase());
        if (key) value = String(row[key] ?? "");
      }
      varMap[v] = value;
      if (value) usedValues.push(value);
    }

    const fill = (text: string | undefined) => {
      if (!text) return "";
      let r = text;
      for (const [k, v] of Object.entries(varMap)) {
        const safe = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        r = r.replace(new RegExp(`\\{\\{\\s*${safe}\\s*\\}\\}`, "gi"), v);
        r = r.replace(new RegExp(`\\{${safe}\\}`, "gi"), v);
      }
      return r;
    };

    const stripTags = (t: string) => t.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    return {
      row,
      varMap,
      usedValues,
      resolvedIndex: safeIdx,
      title: fill(patterns.seoTitle),
      description: fill(patterns.seoDescription),
      slug: fill(patterns.slug),
      h1: fill(patterns.h1),
      contentSnippet: stripTags(fill(patterns.contentHtml)).slice(0, 240),
    };
  }, [rows, idx, templateVars, patterns, manualMappings, customValues]);

  if (!resolved) return null;

  const total = rows.length;
  const canPrev = idx > 0;
  const canNext = idx < total - 1;
  const filledCount = Object.values(resolved.varMap).filter(v => v && v.trim() !== "").length;
  const missingCount = templateVars.length - filledCount;

  const Field = ({ label, original, filled }: { label: string; original?: string; filled: string }) => {
    if (!original) return null;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5">
            <p className="text-[9.5px] font-medium text-muted-foreground mb-0.5">Template</p>
            <p
              className="text-[11.5px] leading-snug break-words"
              dangerouslySetInnerHTML={{ __html: renderResolvedHtml(original) }}
            />
          </div>
          <div className="rounded-lg border border-primary/25 bg-primary/[0.04] px-2.5 py-1.5">
            <p className="text-[9.5px] font-medium text-primary mb-0.5 flex items-center gap-1">
              <Wand2 className="h-2.5 w-2.5" /> Filled preview
            </p>
            <p
              className="text-[11.5px] leading-snug break-words"
              dangerouslySetInnerHTML={{ __html: highlightFilledSegments(filled, resolved.usedValues) }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-transparent overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-b border-primary/15 bg-primary/[0.03]">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              Live variable preview
              <Sparkles className="h-3 w-3 text-primary" />
            </p>
            <p className="text-[11px] text-muted-foreground">
              See how &#123;variables&#125; get filled with real data before you generate pages.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className="h-5 text-[10px] gap-1 border-emerald-500/40 text-emerald-600 bg-emerald-500/5">
            {filledCount} filled
          </Badge>
          {missingCount > 0 && (
            <Badge variant="outline" className="h-5 text-[10px] gap-1 border-destructive/40 text-destructive bg-destructive/5">
              {missingCount} missing
            </Badge>
          )}
        </div>
      </div>

      {/* Row navigator */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 border-b border-border/60">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] gap-1"
          disabled={!canPrev}
          onClick={() => setIdx(i => Math.max(0, i - 1))}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Row <span className="font-semibold text-foreground">{resolved.resolvedIndex + 1}</span> of{" "}
          <span className="font-semibold text-foreground">{total}</span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] gap-1"
          disabled={!canNext}
          onClick={() => setIdx(i => Math.min(total - 1, i + 1))}
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Resolved variable chips */}
      <div className="px-3.5 py-2 flex flex-wrap gap-1.5 border-b border-border/50 bg-background/40">
        {templateVars.map(v => {
          const val = resolved.varMap[v];
          const has = val && val.trim() !== "";
          return (
            <div
              key={v}
              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] ${
                has
                  ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-400"
                  : "border-destructive/30 bg-destructive/[0.06] text-destructive"
              }`}
            >
              <code className="font-mono">{`{${v}}`}</code>
              <span className="text-foreground/40">→</span>
              <span className="font-medium truncate max-w-[140px]">
                {has ? val : "missing"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Field previews */}
      <div className="px-3.5 py-3 space-y-3 max-h-72 overflow-y-auto">
        <Field label="SEO Title"       original={patterns.seoTitle}       filled={resolved.title} />
        <Field label="SEO Description" original={patterns.seoDescription} filled={resolved.description} />
        <Field label="URL Slug"        original={patterns.slug}           filled={resolved.slug} />
        <Field label="H1 / Heading"    original={patterns.h1}             filled={resolved.h1} />
        {patterns.contentHtml && (
          <div className="space-y-1">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              Content preview
            </span>
            <div className="rounded-lg border border-primary/25 bg-primary/[0.03] px-2.5 py-1.5">
              <p
                className="text-[11.5px] leading-relaxed break-words"
                dangerouslySetInnerHTML={{
                  __html: highlightFilledSegments(resolved.contentSnippet + "…", resolved.usedValues),
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
