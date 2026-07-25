import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MousePointerClick, Wand2, Link as LinkIcon, Type, RefreshCw, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CtaPlacementPanelProps {
  content: string;
  onChange: (next: string) => void;
}

interface CtaCandidate {
  /** unique index within the HTML for exact-match replacement */
  matchIndex: number;
  /** full raw HTML of the element */
  raw: string;
  /** 'a' or 'button' */
  tag: "a" | "button";
  /** current visible text (stripped of inner tags) */
  text: string;
  /** current href (a only) */
  href: string;
  /** inner HTML (may include icons) */
  inner: string;
  /** attributes (excluding tag name) */
  attrs: string;
  /** true if text is already a {variable} placeholder */
  labelIsVar: boolean;
  /** true if href is already a {variable} placeholder */
  urlIsVar: boolean;
}

const KEEP = /^\s*\{[a-z0-9_]{2,60}\}\s*$/i;

function scanCtas(html: string): CtaCandidate[] {
  const results: CtaCandidate[] = [];
  if (!html) return results;
  const re = /<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase() as "a" | "button";
    const attrs = m[2] || "";
    const inner = m[3] || "";
    const text = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!text || text.length > 80) { idx++; continue; }
    const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']*)["']/i);
    const href = hrefMatch ? hrefMatch[1] : "";
    // Heuristic: only surface elements that look like CTAs.
    const looksLikeCta =
      /\b(btn|button|cta|action|hero__cta|primary|get-started|book|buy|contact|subscribe|signup)\b/i.test(attrs) ||
      /^(get started|book now|buy now|contact us|subscribe|sign up|sign in|learn more|read more|start free|try free|request (a )?(quote|demo)|schedule|call now|shop now|order|apply|download|explore|discover)$/i.test(text) ||
      tag === "button";
    if (!looksLikeCta) { idx++; continue; }
    results.push({
      matchIndex: idx,
      raw: m[0],
      tag,
      text,
      href,
      inner,
      attrs,
      labelIsVar: KEEP.test(text),
      urlIsVar: KEEP.test(href),
    });
    idx++;
  }
  return results;
}

function extractExistingCtaVars(html: string) {
  const labels = new Set<string>();
  const urls = new Set<string>();
  const re = /\{(cta_[a-z0-9_]{2,60})\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const name = m[1].toLowerCase();
    if (name.includes("url") || name.includes("href") || name.includes("link")) urls.add(name);
    else labels.add(name);
  }
  return { labels: [...labels], urls: [...urls] };
}

function normalizeVarName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^\{+|\}+$/g, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

/**
 * Replace the Nth occurrence of `<tag>…</tag>` in HTML with a mutated variant.
 * We rescan to compute the correct offset — regex indices are stable per call.
 */
function replaceNthCta(html: string, matchIndex: number, mutate: (raw: string, attrs: string, inner: string) => string) {
  const re = /<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  let i = 0;
  let out = html;
  let offsetShift = 0;
  while ((m = re.exec(html))) {
    if (i === matchIndex) {
      const start = m.index + offsetShift;
      const end = start + m[0].length;
      const replacement = mutate(m[0], m[2] || "", m[3] || "");
      out = out.slice(0, start) + replacement + out.slice(end);
      break;
    }
    i++;
  }
  return out;
}

export function CtaPlacementPanel({ content, onChange }: CtaPlacementPanelProps) {
  const { toast } = useToast();
  const candidates = useMemo(() => scanCtas(content), [content]);
  const existing = useMemo(() => extractExistingCtaVars(content), [content]);

  // Per-candidate draft mapping (label + url variable name).
  const [drafts, setDrafts] = useState<Record<number, { label: string; url: string }>>({});

  const setDraft = (idx: number, patch: Partial<{ label: string; url: string }>) => {
    setDrafts((prev) => ({ ...prev, [idx]: { label: prev[idx]?.label || "", url: prev[idx]?.url || "", ...patch } }));
  };

  const nextAutoLabelName = () => {
    const used = new Set([...existing.labels, ...Object.values(drafts).map((d) => d.label).filter(Boolean)]);
    if (!used.has("cta_label")) return "cta_label";
    let n = 2;
    while (used.has(`cta_label_${n}`)) n++;
    return `cta_label_${n}`;
  };
  const nextAutoUrlName = () => {
    const used = new Set([...existing.urls, ...Object.values(drafts).map((d) => d.url).filter(Boolean)]);
    if (!used.has("cta_url")) return "cta_url";
    let n = 2;
    while (used.has(`cta_url_${n}`)) n++;
    return `cta_url_${n}`;
  };

  const applyMapping = (cand: CtaCandidate) => {
    const draft = drafts[cand.matchIndex] || { label: "", url: "" };
    const labelVar = normalizeVarName(draft.label || (cand.labelIsVar ? "" : nextAutoLabelName()));
    const urlVar = cand.tag === "a" ? normalizeVarName(draft.url || (cand.urlIsVar ? "" : nextAutoUrlName())) : "";

    if (!labelVar && !urlVar) {
      toast({ title: "Nothing to apply", description: "Choose a label and/or URL variable first.", variant: "destructive" });
      return;
    }

    const next = replaceNthCta(content, cand.matchIndex, (raw, attrs, inner) => {
      let newAttrs = attrs;
      let newInner = inner;
      if (labelVar) newInner = `{${labelVar}}`;
      if (urlVar) {
        if (/\bhref\s*=\s*["']/.test(newAttrs)) {
          newAttrs = newAttrs.replace(/\bhref\s*=\s*["'][^"']*["']/i, `href="{${urlVar}}"`);
        } else {
          newAttrs = ` href="{${urlVar}}"${newAttrs}`;
        }
      }
      return `<${cand.tag}${newAttrs}>${newInner}</${cand.tag}>`;
    });

    if (next === content) {
      toast({ title: "No changes", description: "This CTA already uses the requested placeholders.", variant: "destructive" });
      return;
    }
    onChange(next);
    setDrafts((prev) => ({ ...prev, [cand.matchIndex]: { label: "", url: "" } }));
    toast({
      title: "CTA mapped",
      description: `${labelVar ? `{${labelVar}}` : ""}${labelVar && urlVar ? " · " : ""}${urlVar ? `{${urlVar}}` : ""} placed.`,
    });
  };

  const applyAllAuto = () => {
    let next = content;
    let labelCounter = existing.labels.length;
    let urlCounter = existing.urls.length;
    const seenLabels = new Set(existing.labels);
    const seenUrls = new Set(existing.urls);

    const cands = scanCtas(next);
    for (const cand of cands) {
      const labelVar = (() => {
        if (cand.labelIsVar) return "";
        let n = seenLabels.size === 0 ? 0 : ++labelCounter;
        let name = n === 0 ? "cta_label" : `cta_label_${n}`;
        while (seenLabels.has(name)) name = `cta_label_${++n}`;
        seenLabels.add(name);
        return name;
      })();
      const urlVar = (() => {
        if (cand.tag !== "a" || cand.urlIsVar) return "";
        let n = seenUrls.size === 0 ? 0 : ++urlCounter;
        let name = n === 0 ? "cta_url" : `cta_url_${n}`;
        while (seenUrls.has(name)) name = `cta_url_${++n}`;
        seenUrls.add(name);
        return name;
      })();
      if (!labelVar && !urlVar) continue;
      next = replaceNthCta(next, cand.matchIndex, (_raw, attrs, inner) => {
        let newAttrs = attrs;
        let newInner = inner;
        if (labelVar) newInner = `{${labelVar}}`;
        if (urlVar) {
          if (/\bhref\s*=\s*["']/.test(newAttrs)) newAttrs = newAttrs.replace(/\bhref\s*=\s*["'][^"']*["']/i, `href="{${urlVar}}"`);
          else newAttrs = ` href="{${urlVar}}"${newAttrs}`;
        }
        return `<${cand.tag}${newAttrs}>${newInner}</${cand.tag}>`;
      });
    }
    if (next === content) {
      toast({ title: "Nothing to auto-map", description: "All CTAs already use placeholders." });
      return;
    }
    onChange(next);
    toast({ title: "CTA placement applied", description: "All detected CTAs now use variables." });
  };

  if (candidates.length === 0) {
    return (
      <details className="border-b bg-muted/10 px-3 sm:px-5 py-2 group">
        <summary className="cursor-pointer list-none flex items-center justify-between text-[11px] font-medium text-muted-foreground hover:text-foreground select-none">
          <span className="inline-flex items-center gap-1.5">
            <MousePointerClick className="h-3 w-3" />
            CTA placement
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">none detected</Badge>
          </span>
          <span className="text-[10px] text-muted-foreground group-open:hidden">Show</span>
          <span className="text-[10px] text-muted-foreground hidden group-open:inline">Hide</span>
        </summary>
        <p className="mt-2 text-[11px] text-muted-foreground">
          No CTA-style <code>&lt;a&gt;</code> or <code>&lt;button&gt;</code> elements found. Add one to your HTML and it will appear here.
        </p>
      </details>
    );
  }

  return (
    <details open className="border-b bg-muted/10 px-3 sm:px-5 py-2 group">
      <summary className="cursor-pointer list-none flex items-center justify-between text-[11px] font-medium text-muted-foreground hover:text-foreground select-none">
        <span className="inline-flex items-center gap-1.5">
          <MousePointerClick className="h-3 w-3" />
          CTA placement
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{candidates.length} detected</Badge>
        </span>
        <span className="inline-flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px] gap-1"
            onClick={(e) => { e.preventDefault(); applyAllAuto(); }}
          >
            <Wand2 className="h-3 w-3" /> Auto-map all
          </Button>
        </span>
      </summary>

      <div className="mt-2 space-y-2">
        {candidates.map((cand) => {
          const draft = drafts[cand.matchIndex] || { label: "", url: "" };
          const bothVar = cand.labelIsVar && (cand.tag === "button" || cand.urlIsVar);
          return (
            <div
              key={cand.matchIndex}
              className="rounded-md border bg-card p-2 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-start"
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4">
                    &lt;{cand.tag}&gt;
                  </Badge>
                  <span className="text-[11px] font-medium truncate" title={cand.text}>
                    “{cand.text}”
                  </span>
                  {bothVar && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" /> mapped
                    </Badge>
                  )}
                </div>
                {cand.tag === "a" && (
                  <div className="text-[10px] text-muted-foreground font-mono truncate" title={cand.href}>
                    → {cand.href || "(no href)"}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {/* Label variable selector */}
                  <div className="flex items-center gap-1">
                    <Type className="h-3 w-3 text-muted-foreground shrink-0" />
                    {existing.labels.length > 0 ? (
                      <Select
                        value={draft.label || "__new__"}
                        onValueChange={(v) => setDraft(cand.matchIndex, { label: v === "__new__" ? "" : v })}
                      >
                        <SelectTrigger className="h-7 text-[11px] font-mono">
                          <SelectValue placeholder="Label variable…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__new__">＋ New {`{cta_label_*}`}</SelectItem>
                          {existing.labels.map((v) => (
                            <SelectItem key={v} value={v}>{`{${v}}`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    <Input
                      placeholder={cand.labelIsVar ? "already a variable" : "cta_label"}
                      value={draft.label}
                      onChange={(e) => setDraft(cand.matchIndex, { label: e.target.value })}
                      className="h-7 text-[11px] font-mono"
                      disabled={cand.labelIsVar && !draft.label}
                    />
                  </div>
                  {/* URL variable selector (anchors only) */}
                  {cand.tag === "a" && (
                    <div className="flex items-center gap-1">
                      <LinkIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                      {existing.urls.length > 0 ? (
                        <Select
                          value={draft.url || "__new__"}
                          onValueChange={(v) => setDraft(cand.matchIndex, { url: v === "__new__" ? "" : v })}
                        >
                          <SelectTrigger className="h-7 text-[11px] font-mono">
                            <SelectValue placeholder="URL variable…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__new__">＋ New {`{cta_url_*}`}</SelectItem>
                            {existing.urls.map((v) => (
                              <SelectItem key={v} value={v}>{`{${v}}`}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                      <Input
                        placeholder={cand.urlIsVar ? "already a variable" : "cta_url"}
                        value={draft.url}
                        onChange={(e) => setDraft(cand.matchIndex, { url: e.target.value })}
                        className="h-7 text-[11px] font-mono"
                        disabled={cand.urlIsVar && !draft.url}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex md:flex-col items-end gap-1 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => applyMapping(cand)}
                >
                  <RefreshCw className="h-3 w-3" /> Apply
                </Button>
              </div>
            </div>
          );
        })}
        <p className="text-[10px] text-muted-foreground">
          Applying rewrites the element's text (and <code>href</code>) to a <code>{`{variable}`}</code> so keywords / URLs from Keyword Groups fill it at generation.
        </p>
      </div>
    </details>
  );
}
