import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Heading1, ListTree, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface HeadingNode {
  level: number; // 1..6
  text: string;
  index: number; // order in document
}

export interface OutlineIssue {
  severity: "error" | "warning";
  message: string;
  /** Index in the headings array this issue refers to (when relevant). */
  at?: number;
}

export interface OutlineAnalysis {
  headings: HeadingNode[];
  issues: OutlineIssue[];
  counts: Record<1 | 2 | 3 | 4 | 5 | 6, number>;
}

/**
 * Parse an HTML string and return all h1-h6 headings in document order.
 * Uses DOMParser (browser only). Stripped of nested tags and trimmed.
 */
export function extractHeadings(html: string): HeadingNode[] {
  if (!html || typeof window === "undefined") return [];
  try {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    const nodes = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6"));
    return nodes.map((el, i) => ({
      level: Number(el.tagName.substring(1)) as HeadingNode["level"],
      text: (el.textContent || "").replace(/\s+/g, " ").trim(),
      index: i,
    }));
  } catch {
    return [];
  }
}

/**
 * Validate heading hierarchy following standard SEO/accessibility rules:
 *  - exactly one H1 (warning if 0, error if 2+)
 *  - no skipped levels (e.g. H2 → H4 jump)
 *  - no empty headings
 *  - first heading should be H1
 */
export function analyzeOutline(html: string): OutlineAnalysis {
  const headings = extractHeadings(html);
  const issues: OutlineIssue[] = [];
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } as OutlineAnalysis["counts"];

  headings.forEach((h) => { counts[h.level as 1] += 1; });

  if (headings.length === 0) {
    issues.push({ severity: "warning", message: "No headings found in this page." });
    return { headings, issues, counts };
  }

  if (counts[1] === 0) {
    issues.push({ severity: "warning", message: "Missing H1 — every page should have exactly one H1." });
  } else if (counts[1] > 1) {
    issues.push({ severity: "error", message: `Multiple H1s detected (${counts[1]}). Use only one H1 per page.` });
  }

  if (headings[0].level !== 1) {
    issues.push({
      severity: "warning",
      message: `First heading is H${headings[0].level} — start the outline with an H1.`,
      at: 0,
    });
  }

  let prev = headings[0].level;
  for (let i = 1; i < headings.length; i++) {
    const cur = headings[i].level;
    if (cur > prev + 1) {
      issues.push({
        severity: "error",
        message: `Skipped level: H${prev} → H${cur} (heading ${i + 1}). Don't jump more than one level deeper.`,
        at: i,
      });
    }
    prev = cur;
  }

  headings.forEach((h, i) => {
    if (!h.text) {
      issues.push({ severity: "warning", message: `Heading ${i + 1} (H${h.level}) is empty.`, at: i });
    } else if (h.text.length > 140) {
      issues.push({ severity: "warning", message: `Heading ${i + 1} (H${h.level}) is very long (${h.text.length} chars).`, at: i });
    }
  });

  return { headings, issues, counts };
}

interface HeadingOutlineProps {
  html: string;
  /** Optional title to render above the outline. Defaults to "Heading Outline". */
  title?: string;
  /** Hide the panel entirely if there are no headings. */
  hideWhenEmpty?: boolean;
  className?: string;
}

/**
 * Compact, embeddable preview of a page's H1/H2/H3 outline + hierarchy issues.
 * Designed to slot into existing preview/edit dialogs without disrupting layout.
 */
export function HeadingOutline({ html, title = "Heading Outline", hideWhenEmpty = false, className }: HeadingOutlineProps) {
  const analysis = useMemo(() => analyzeOutline(html), [html]);
  const { headings, issues, counts } = analysis;

  if (hideWhenEmpty && headings.length === 0) return null;

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const issueByIndex = new Map<number, OutlineIssue>();
  issues.forEach((i) => { if (typeof i.at === "number" && !issueByIndex.has(i.at)) issueByIndex.set(i.at, i); });

  return (
    <div className={`rounded-lg border border-border bg-muted/30 p-3 space-y-2 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ListTree className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">{title}</span>
          <span className="text-[10px] text-muted-foreground">
            {headings.length} heading{headings.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {([1, 2, 3, 4, 5, 6] as const).map((lvl) =>
            counts[lvl] > 0 ? (
              <Badge key={lvl} variant="outline" className="text-[10px] font-mono">
                H{lvl}·{counts[lvl]}
              </Badge>
            ) : null,
          )}
        </div>
      </div>

      {issues.length === 0 && headings.length > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Hierarchy looks clean — no issues detected.
        </div>
      )}

      {(errors.length > 0 || warnings.length > 0) && (
        <div className="space-y-1">
          {errors.map((iss, i) => (
            <div key={`e-${i}`} className="flex items-start gap-1.5 text-[11px] text-destructive">
              <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{iss.message}</span>
            </div>
          ))}
          {warnings.map((iss, i) => (
            <div key={`w-${i}`} className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{iss.message}</span>
            </div>
          ))}
        </div>
      )}

      {headings.length > 0 && (
        <ScrollArea className="max-h-48 rounded-md border border-border bg-background/60">
          <ul className="py-1.5 px-2 space-y-0.5">
            {headings.map((h, i) => {
              const iss = issueByIndex.get(i);
              const indent = (h.level - 1) * 12;
              const isError = iss?.severity === "error";
              const isWarn = iss?.severity === "warning";
              return (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[11px] leading-tight py-0.5"
                  style={{ paddingLeft: `${indent}px` }}
                >
                  <Badge
                    variant="outline"
                    className={`shrink-0 font-mono text-[9px] px-1 py-0 h-4 ${
                      h.level === 1
                        ? "border-primary/40 text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    H{h.level}
                  </Badge>
                  <span
                    className={`truncate ${
                      isError
                        ? "text-destructive"
                        : isWarn
                          ? "text-amber-600 dark:text-amber-500"
                          : "text-foreground"
                    }`}
                    title={h.text || "(empty)"}
                  >
                    {h.text || <em className="text-muted-foreground">(empty)</em>}
                  </span>
                  {h.level === 1 && (
                    <Heading1 className="h-3 w-3 text-primary shrink-0 ml-auto" aria-hidden />
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
