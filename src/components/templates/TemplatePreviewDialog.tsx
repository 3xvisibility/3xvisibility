import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { filterDesignVars } from "@/lib/design-vars-filter";
import { Eye, Code2, Sparkles, FileText, X } from "lucide-react";

export interface PreviewableTemplate {
  name: string;
  content: string;
  variables?: string[];
  description?: string;
  seo_title_pattern?: string | null;
  seo_description_pattern?: string | null;
  /** Optional source label, e.g. "Marketplace · WordPress" */
  source?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: PreviewableTemplate | null;
  /** Optional CTA shown in the footer — e.g. "Use this template". */
  primaryAction?: { label: string; onClick: () => void; loading?: boolean };
}

/**
 * Universal preview modal — works for both marketplace catalog entries
 * and saved workspace templates. Renders the HTML with variables visually
 * highlighted (via the existing TemplatePreview iframe component) and
 * lists every variable / SEO pattern as inspectable badges.
 */
export function TemplatePreviewDialog({ open, onOpenChange, template, primaryAction }: Props) {
  const contentVars = useMemo(
    () => filterDesignVars(template?.variables || []),
    [template?.variables],
  );
  const designVars = useMemo(
    () => (template?.variables || []).filter(v => !contentVars.includes(v)),
    [template?.variables, contentVars],
  );

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-[calc(100vw-2rem)] sm:w-[calc(100vw-3rem)] h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/15 to-fuchsia-500/15 border border-primary/20 shrink-0">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg truncate flex items-center gap-2">
                {template.name}
                {template.source && (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {template.source}
                  </Badge>
                )}
              </DialogTitle>
              {template.description && (
                <DialogDescription className="text-xs mt-1 line-clamp-2">
                  {template.description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-3 border-b shrink-0">
            <TabsList className="h-9">
              <TabsTrigger value="preview" className="text-xs gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Preview
              </TabsTrigger>
              <TabsTrigger value="variables" className="text-xs gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Variables
                <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                  {contentVars.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="source" className="text-xs gap-1.5">
                <Code2 className="h-3.5 w-3.5" /> Source
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="preview" className="flex-1 overflow-hidden m-0 p-0 data-[state=active]:flex data-[state=active]:flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4">
                <TemplatePreview html={template.content} />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="variables" className="flex-1 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <ScrollArea className="flex-1">
              <div className="px-6 py-5 space-y-6">
                {/* SEO patterns */}
                {(template.seo_title_pattern || template.seo_description_pattern) && (
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SEO patterns</h3>
                    {template.seo_title_pattern && (
                      <div className="rounded-md border bg-muted/30 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Title</p>
                        <p className="text-sm font-mono break-all">{template.seo_title_pattern}</p>
                      </div>
                    )}
                    {template.seo_description_pattern && (
                      <div className="rounded-md border bg-muted/30 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                        <p className="text-sm font-mono break-all">{template.seo_description_pattern}</p>
                      </div>
                    )}
                  </section>
                )}

                {/* Content variables */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Content variables
                    </h3>
                    <span className="text-[10px] text-muted-foreground">{contentVars.length} total</span>
                  </div>
                  {contentVars.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No content variables — this template renders as-is.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {contentVars.map(v => (
                        <Badge key={v} variant="secondary" className="font-mono text-[11px] gap-1">
                          <span className="opacity-60">{`{{`}</span>{v}<span className="opacity-60">{`}}`}</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </section>

                {/* Design variables (filtered) */}
                {designVars.length > 0 && (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Design variables
                      </h3>
                      <span className="text-[10px] text-muted-foreground">Auto-resolved · {designVars.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {designVars.map(v => (
                        <Badge key={v} variant="outline" className="font-mono text-[11px] opacity-70">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="source" className="flex-1 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <ScrollArea className="flex-1">
              <pre className="px-6 py-4 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all">
                {template.content}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-3 border-t shrink-0 gap-2 sm:gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-3.5 w-3.5 mr-1" /> Close
          </Button>
          {primaryAction && (
            <Button
              size="sm"
              onClick={primaryAction.onClick}
              disabled={primaryAction.loading}
              className="bg-gradient-to-r from-primary to-fuchsia-500 hover:opacity-95"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {primaryAction.loading ? "Working…" : primaryAction.label}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
