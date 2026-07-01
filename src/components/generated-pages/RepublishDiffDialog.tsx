import { useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GitCompareArrows, ExternalLink } from "lucide-react";

export interface RepublishSnapshot {
  content: string | null;
  external_url?: string | null;
  title?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** State captured right before the republish was triggered. */
  before?: RepublishSnapshot | null;
  /** Current state after the republish completed. */
  after?: RepublishSnapshot | null;
}

type DiffLine = { type: "same" | "added" | "removed"; text: string };

/** Minimal LCS line diff — no external deps. */
function diffLines(a: string, b: string): DiffLine[] {
  const left = a.split("\n");
  const right = b.split("\n");
  const n = left.length;
  const m = right.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = left[i] === right[j]
        ? lcs[i + 1][j + 1] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (left[i] === right[j]) {
      out.push({ type: "same", text: left[i] }); i++; j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ type: "removed", text: left[i] }); i++;
    } else {
      out.push({ type: "added", text: right[j] }); j++;
    }
  }
  while (i < n) out.push({ type: "removed", text: left[i++] });
  while (j < m) out.push({ type: "added", text: right[j++] });
  return out;
}

/** Split long single-line HTML into readable lines around tag boundaries. */
function normalizeHtml(html: string | null | undefined): string {
  return (html || "")
    .replace(/>\s*</g, ">\n<")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function RepublishDiffDialog({ open, onOpenChange, before, after }: Props) {
  const beforeHtml = normalizeHtml(before?.content);
  const afterHtml = normalizeHtml(after?.content);

  const diff = useMemo(() => diffLines(beforeHtml, afterHtml), [beforeHtml, afterHtml]);
  const added = diff.filter((d) => d.type === "added").length;
  const removed = diff.filter((d) => d.type === "removed").length;
  const identical = added === 0 && removed === 0;

  const liveUrl = after?.external_url || before?.external_url || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4" /> Before / After — {after?.title || before?.title || "Republished page"}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            {identical ? (
              <Badge variant="outline">No content changes detected</Badge>
            ) : (
              <>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">+{added} added</Badge>
                <Badge className="bg-destructive/10 text-destructive border-destructive/20">−{removed} removed</Badge>
              </>
            )}
            {liveUrl && (
              <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-xs inline-flex items-center gap-1 hover:underline">
                <ExternalLink className="h-3 w-3" /> Open live page
              </a>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="rendered" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="rendered">Rendered</TabsTrigger>
            <TabsTrigger value="diff">HTML diff</TabsTrigger>
          </TabsList>

          <TabsContent value="rendered" className="flex-1 min-h-0 mt-3">
            <div className="grid grid-cols-2 gap-3 h-[520px]">
              <div className="flex flex-col min-h-0">
                <p className="text-xs font-medium text-muted-foreground mb-1">Before</p>
                <ScrollArea className="flex-1 rounded-md border border-border bg-background">
                  <div className="prose prose-sm max-w-none p-3" dangerouslySetInnerHTML={{ __html: before?.content || "<em>No previous content</em>" }} />
                </ScrollArea>
              </div>
              <div className="flex flex-col min-h-0">
                <p className="text-xs font-medium text-muted-foreground mb-1">After</p>
                <ScrollArea className="flex-1 rounded-md border border-primary/40 bg-background">
                  <div className="prose prose-sm max-w-none p-3" dangerouslySetInnerHTML={{ __html: after?.content || "<em>No content</em>" }} />
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="diff" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[520px] rounded-md border border-border bg-muted/30">
              <pre className="text-[11px] leading-relaxed font-mono p-3 whitespace-pre-wrap break-words">
                {identical ? (
                  <span className="text-muted-foreground">The stored HTML is identical before and after this republish.</span>
                ) : (
                  diff.map((line, idx) => (
                    <div
                      key={idx}
                      className={
                        line.type === "added"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : line.type === "removed"
                          ? "bg-destructive/10 text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      <span className="select-none opacity-60 mr-2">
                        {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
                      </span>
                      {line.text || "\u00A0"}
                    </div>
                  ))
                )}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
