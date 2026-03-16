import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeftRight, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DiscoveredPage {
  url: string;
  title: string;
  type: string;
  headings: { tag: string; text: string }[];
  textSnippet: string;
  bodyHtml: string;
}

interface UrlGroup {
  pattern: string;
  patternLabel: string;
  pages: string[];
  suggestedVariables: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: UrlGroup;
  allPages: DiscoveredPage[];
}

function extractTextBlocks(html: string): string[] {
  // Strip tags and get text blocks
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|h[1-6]|li|tr|td|th|section|article|header|footer|blockquote)[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function DiffView({ blocksA, blocksB }: { blocksA: string[]; blocksB: string[] }) {
  // Simple line-by-line comparison showing differences
  const maxLen = Math.max(blocksA.length, blocksB.length);
  const rows: { a: string; b: string; differs: boolean }[] = [];

  for (let i = 0; i < maxLen; i++) {
    const a = blocksA[i] || "";
    const b = blocksB[i] || "";
    rows.push({ a, b, differs: a !== b });
  }

  // Only show rows where at least one side has content
  const meaningfulRows = rows.filter((r) => r.a || r.b);
  const diffCount = meaningfulRows.filter((r) => r.differs).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-[10px]">
          {diffCount} difference{diffCount !== 1 ? "s" : ""} found
        </Badge>
        <span>out of {meaningfulRows.length} content blocks</span>
      </div>
      <div className="space-y-1 font-mono text-xs">
        {meaningfulRows.map((row, i) => (
          <div
            key={i}
            className={`grid grid-cols-2 gap-2 rounded px-2 py-1.5 ${
              row.differs
                ? "bg-primary/5 border border-primary/20"
                : "bg-muted/30"
            }`}
          >
            <div className={`break-words ${row.differs && row.a ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {row.a || <span className="italic opacity-40">—</span>}
            </div>
            <div className={`break-words ${row.differs && row.b ? "text-primary font-medium" : "text-muted-foreground"}`}>
              {row.b || <span className="italic opacity-40">—</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PageComparisonDialog({ open, onOpenChange, group, allPages }: Props) {
  const groupPages = useMemo(
    () => group.pages.map((url) => allPages.find((p) => p.url === url)).filter(Boolean) as DiscoveredPage[],
    [group.pages, allPages]
  );

  const [leftUrl, setLeftUrl] = useState(groupPages[0]?.url || "");
  const [rightUrl, setRightUrl] = useState(groupPages[1]?.url || groupPages[0]?.url || "");

  const leftPage = groupPages.find((p) => p.url === leftUrl);
  const rightPage = groupPages.find((p) => p.url === rightUrl);

  const leftBlocks = useMemo(() => (leftPage ? extractTextBlocks(leftPage.bodyHtml) : []), [leftPage]);
  const rightBlocks = useMemo(() => (rightPage ? extractTextBlocks(rightPage.bodyHtml) : []), [rightPage]);

  const getPathname = (url: string) => {
    try { return new URL(url).pathname; } catch { return url; }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Compare Pages
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Pattern: <code className="font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded">{group.pattern}</code>
          </p>
        </DialogHeader>

        {/* Page selectors */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Page A</p>
            <Select value={leftUrl} onValueChange={setLeftUrl}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groupPages.map((p) => (
                  <SelectItem key={p.url} value={p.url} className="text-xs">
                    {p.title} <span className="text-muted-foreground ml-1">({getPathname(p.url)})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Page B</p>
            <Select value={rightUrl} onValueChange={setRightUrl}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groupPages.map((p) => (
                  <SelectItem key={p.url} value={p.url} className="text-xs">
                    {p.title} <span className="text-muted-foreground ml-1">({getPathname(p.url)})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-destructive/5 rounded-md px-3 py-2 border border-destructive/10">
            <p className="text-xs font-semibold truncate">{leftPage?.title}</p>
            <p className="text-[10px] text-muted-foreground truncate">{leftUrl && getPathname(leftUrl)}</p>
          </div>
          <div className="bg-primary/5 rounded-md px-3 py-2 border border-primary/10">
            <p className="text-xs font-semibold truncate">{rightPage?.title}</p>
            <p className="text-[10px] text-muted-foreground truncate">{rightUrl && getPathname(rightUrl)}</p>
          </div>
        </div>

        {/* Diff content */}
        <ScrollArea className="flex-1 mt-2 min-h-0">
          {leftPage && rightPage ? (
            <DiffView blocksA={leftBlocks} blocksB={rightBlocks} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Select two pages to compare.</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
