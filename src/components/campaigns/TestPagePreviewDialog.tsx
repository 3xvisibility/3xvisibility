import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, XCircle, ShieldAlert, Code2 } from "lucide-react";
import type { RenderResult } from "@/lib/renderer";
import { validateSeoRules, getSeoRuleSummary, type SeoRuleContext } from "@/lib/seo-rules";
import { validateJsonLdInHtml } from "@/lib/jsonld-validator";
import { HeadingOutline } from "@/components/HeadingOutline";
import { useMemo } from "react";

interface TestPagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: RenderResult | null;
}

export function TestPagePreviewDialog({ open, onOpenChange, result }: TestPagePreviewDialogProps) {
  const seoResults = useMemo(() => {
    if (!result) return null;
    const ctx: SeoRuleContext = {
      title: result.title,
      slug: result.slug,
      seoTitle: result.seoTitle,
      seoDescription: result.seoDescription,
      canonicalUrl: result.canonicalUrl,
      content: result.html,
      jsonLd: result.jsonLd,
    };
    return validateSeoRules(ctx);
  }, [result]);

  const summary = useMemo(() => seoResults ? getSeoRuleSummary(seoResults) : null, [seoResults]);

  // US — Server-side JSON-LD validation, mirrored client-side for the preview.
  const jsonLdValidation = useMemo(() => {
    if (!result) return null;
    // Validate both the inline JSON-LD (always present in result.jsonLd) and
    // any additional <script type="application/ld+json"> blocks injected into
    // the rendered HTML.
    const combined = `${result.jsonLd || ""}\n${result.html || ""}`;
    return validateJsonLdInHtml(combined);
  }, [result]);


  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base truncate">Test Preview — {result.title}</DialogTitle>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px]">Slug: /{result.slug}</Badge>
            <Badge variant="outline" className="text-[10px]">SEO Title: {result.seoTitle}</Badge>
          </div>
        </DialogHeader>

        {result.warnings.length > 0 && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-1">
            {result.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* US24 — SEO Rules Validation */}
        {summary && (summary.errors.length > 0 || summary.warnings.length > 0) && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">
                SEO Rules — {summary.passed.length}/{summary.total} passed
              </span>
            </div>
            {summary.errors.map((r) => (
              <div key={r.id} className="flex items-start gap-2 text-xs">
                <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
                <div>
                  <span className="font-medium text-destructive">{r.label}</span>
                  <span className="text-muted-foreground ml-1">— {r.tip}</span>
                </div>
              </div>
            ))}
            {summary.warnings.map((r) => (
              <div key={r.id} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                <div>
                  <span className="font-medium text-foreground">{r.label}</span>
                  <span className="text-muted-foreground ml-1">— {r.tip}</span>
                </div>
              </div>
            ))}
            {summary.passed.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {summary.passed.length} checks passed
              </div>
            )}
          </div>
        )}

        {/* JSON-LD / schema.org validation (non-blocking) */}
        {jsonLdValidation && jsonLdValidation.blocks > 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Code2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">
                JSON-LD — {jsonLdValidation.valid}/{jsonLdValidation.blocks} valid
              </span>
              {jsonLdValidation.types.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
              ))}
            </div>
            {jsonLdValidation.issues.length === 0 ? (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                Schema.org compliant — no issues detected
              </div>
            ) : (
              <>
                {jsonLdValidation.issues.slice(0, 8).map((issue, i) => (
                  <div key={`${issue.code}-${i}`} className="flex items-start gap-2 text-xs">
                    {issue.severity === "error" ? (
                      <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
                    ) : issue.severity === "warning" ? (
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                    ) : (
                      <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    )}
                    <div>
                      <span className={
                        issue.severity === "error" ? "font-medium text-destructive" :
                        issue.severity === "warning" ? "font-medium text-foreground" :
                        "font-medium text-muted-foreground"
                      }>
                        Block {issue.block + 1}{issue.type ? ` · ${issue.type}` : ""}
                      </span>
                      <span className="text-muted-foreground ml-1">— {issue.message}</span>
                    </div>
                  </div>
                ))}
                {jsonLdValidation.issues.length > 8 && (
                  <div className="text-[10px] text-muted-foreground">
                    +{jsonLdValidation.issues.length - 8} more issues hidden
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Heading outline (H1/H2/H3 hierarchy preview) */}
        <HeadingOutline html={result.html} />

        <div className="space-y-3 text-xs">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <span className="text-muted-foreground font-medium">SEO Description:</span>
            <p className="mt-1">{result.seoDescription || "—"}</p>
          </div>
          {result.canonicalUrl && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <span className="text-muted-foreground font-medium">Canonical URL:</span>
              <p className="mt-1 font-mono text-[11px]">{result.canonicalUrl}</p>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 mt-3 border border-border rounded-lg">
          <div
            className="prose prose-sm dark:prose-invert max-w-none p-4"
            dangerouslySetInnerHTML={{ __html: result.html }}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
