import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitCompareArrows, Code, Eye } from "lucide-react";
import { TemplatePreview } from "./TemplatePreview";
import type { TemplateVersion } from "./TemplateVersionHistory";

interface TemplateCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: TemplateVersion[];
  currentContent?: string;
  currentName?: string;
}

/** Simple line-by-line diff. Returns lines with type: same/added/removed */
function computeDiff(oldText: string, newText: string) {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const result: { text: string; type: "same" | "added" | "removed" }[] = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  // Simple LCS-based diff approximation using a map
  const oldSet = new Map<string, number[]>();
  oldLines.forEach((line, i) => {
    if (!oldSet.has(line)) oldSet.set(line, []);
    oldSet.get(line)!.push(i);
  });

  let oi = 0;
  let ni = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (oi >= oldLines.length) {
      result.push({ text: newLines[ni], type: "added" });
      ni++;
    } else if (ni >= newLines.length) {
      result.push({ text: oldLines[oi], type: "removed" });
      oi++;
    } else if (oldLines[oi] === newLines[ni]) {
      result.push({ text: oldLines[oi], type: "same" });
      oi++;
      ni++;
    } else {
      // Look ahead to find match
      let foundNew = false;
      for (let look = ni + 1; look < Math.min(ni + 5, newLines.length); look++) {
        if (newLines[look] === oldLines[oi]) {
          // Lines were added before current old line
          for (let j = ni; j < look; j++) {
            result.push({ text: newLines[j], type: "added" });
          }
          ni = look;
          foundNew = true;
          break;
        }
      }
      if (!foundNew) {
        let foundOld = false;
        for (let look = oi + 1; look < Math.min(oi + 5, oldLines.length); look++) {
          if (oldLines[look] === newLines[ni]) {
            for (let j = oi; j < look; j++) {
              result.push({ text: oldLines[j], type: "removed" });
            }
            oi = look;
            foundOld = true;
            break;
          }
        }
        if (!foundOld) {
          result.push({ text: oldLines[oi], type: "removed" });
          result.push({ text: newLines[ni], type: "added" });
          oi++;
          ni++;
        }
      }
    }
  }

  return result;
}

export function TemplateCompareDialog({
  open,
  onOpenChange,
  versions,
  currentContent,
  currentName,
}: TemplateCompareDialogProps) {
  const allVersions = useMemo(() => {
    const list: { id: string; label: string; content: string }[] = [];
    if (currentContent) {
      list.push({ id: "__current__", label: `Current: ${currentName || "Template"}`, content: currentContent });
    }
    versions.forEach((v, i) => {
      list.push({
        id: v.id,
        label: `v${versions.length - i}: ${v.name} (${new Date(v.savedAt).toLocaleDateString()})`,
        content: v.content,
      });
    });
    return list;
  }, [versions, currentContent, currentName]);

  const [leftId, setLeftId] = useState(allVersions[1]?.id || "");
  const [rightId, setRightId] = useState(allVersions[0]?.id || "");

  const leftContent = allVersions.find((v) => v.id === leftId)?.content || "";
  const rightContent = allVersions.find((v) => v.id === rightId)?.content || "";

  const diff = useMemo(() => computeDiff(leftContent, rightContent), [leftContent, rightContent]);

  const stats = useMemo(() => {
    const added = diff.filter((d) => d.type === "added").length;
    const removed = diff.filter((d) => d.type === "removed").length;
    return { added, removed };
  }, [diff]);

  if (allVersions.length < 2) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompareArrows className="h-5 w-5 text-primary" /> Compare Templates
          </DialogTitle>
        </DialogHeader>

        {/* Version selectors */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Select value={leftId} onValueChange={setLeftId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select older version" />
              </SelectTrigger>
              <SelectContent>
                {allVersions.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <GitCompareArrows className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <Select value={rightId} onValueChange={setRightId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select newer version" />
              </SelectTrigger>
              <SelectContent>
                {allVersions.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 text-xs shrink-0">
            {stats.added > 0 && <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">+{stats.added} added</Badge>}
            {stats.removed > 0 && <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50">-{stats.removed} removed</Badge>}
          </div>
        </div>

        <Tabs defaultValue="diff" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="diff" className="text-xs gap-1.5">
              <Code className="h-3 w-3" /> Code Diff
            </TabsTrigger>
            <TabsTrigger value="side-by-side" className="text-xs gap-1.5">
              <Eye className="h-3 w-3" /> Side-by-Side
            </TabsTrigger>
            <TabsTrigger value="visual" className="text-xs gap-1.5">
              <Eye className="h-3 w-3" /> Visual Compare
            </TabsTrigger>
          </TabsList>

          <TabsContent value="diff" className="flex-1">
            <ScrollArea className="max-h-[55vh] border border-border rounded-md">
              <pre className="p-3 text-xs font-mono leading-relaxed">
                {diff.map((line, i) => (
                  <div
                    key={i}
                    className={`px-2 -mx-2 ${
                      line.type === "added"
                        ? "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300"
                        : line.type === "removed"
                        ? "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300"
                        : "text-foreground"
                    }`}
                  >
                    <span className="select-none text-muted-foreground inline-block w-6 mr-2">
                      {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
                    </span>
                    {line.text || " "}
                  </div>
                ))}
              </pre>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="side-by-side" className="flex-1">
            <div className="grid grid-cols-2 gap-2 max-h-[55vh]">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Old</p>
                <ScrollArea className="max-h-[50vh] border border-border rounded-md">
                  <pre className="p-3 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all">
                    {leftContent}
                  </pre>
                </ScrollArea>
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">New</p>
                <ScrollArea className="max-h-[50vh] border border-border rounded-md">
                  <pre className="p-3 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all">
                    {rightContent}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="visual" className="flex-1">
            <div className="grid grid-cols-2 gap-2 max-h-[55vh]">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">Old</p>
                <ScrollArea className="max-h-[50vh] border border-border rounded-md">
                  <TemplatePreview html={leftContent} />
                </ScrollArea>
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">New</p>
                <ScrollArea className="max-h-[50vh] border border-border rounded-md">
                  <TemplatePreview html={rightContent} />
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
