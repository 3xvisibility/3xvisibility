import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FolderTree, Plus, Trash2, GripVertical, ArrowRight, ChevronRight, Folder, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface DirectoryStructureBuilderProps {
  campaignId: string;
  directoryStructure: { levels?: string[]; separator?: string } | null;
  csvHeaders: string[];
  csvData?: Record<string, string>[];
  onSave: (structure: { levels: string[]; separator: string } | null) => void;
}

// --- Tree builder from CSV data ---
interface TreeNode {
  name: string;
  slug: string;
  children: TreeNode[];
  pageCount: number;
}

function slugify(val: string): string {
  return val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildTree(levels: string[], rows: Record<string, string>[]): TreeNode {
  const root: TreeNode = { name: "/", slug: "", children: [], pageCount: 0 };
  for (const row of rows) {
    let current = root;
    for (const level of levels) {
      const rawVal = row[level] || "unknown";
      const slug = slugify(rawVal);
      let child = current.children.find((c) => c.slug === slug);
      if (!child) {
        child = { name: rawVal, slug, children: [], pageCount: 0 };
        current.children.push(child);
      }
      current = child;
    }
    current.pageCount += 1;
  }
  return root;
}

function TreeNodeView({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const isLeaf = !hasChildren;

  if (isLeaf) {
    return (
      <div
        className="flex items-center gap-1.5 py-0.5"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-xs font-mono text-foreground truncate">{node.slug || node.name}</span>
        {node.pageCount > 0 && (
          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 ml-auto shrink-0">
            {node.pageCount} page{node.pageCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className="flex items-center gap-1.5 py-0.5 w-full text-left hover:bg-muted/40 rounded-sm transition-colors"
          style={{ paddingLeft: `${depth * 16}px` }}
        >
          <ChevronRight className={cn("h-3 w-3 text-muted-foreground shrink-0 transition-transform", open && "rotate-90")} />
          <Folder className="h-3 w-3 text-primary shrink-0" />
          <span className="text-xs font-mono font-medium text-foreground truncate">{node.slug || node.name}</span>
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 ml-auto shrink-0">
            {node.children.length}
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {node.children
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((child) => (
            <TreeNodeView key={child.slug} node={child} depth={depth + 1} />
          ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function DirectoryStructureBuilder({
  directoryStructure,
  csvHeaders,
  csvData = [],
  onSave,
}: DirectoryStructureBuilderProps) {
  const [levels, setLevels] = useState<string[]>(directoryStructure?.levels || []);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const availableColumns = useMemo(() => {
    return csvHeaders.filter((h) => !levels.includes(h));
  }, [csvHeaders, levels]);

  const addLevel = (col: string) => {
    if (!col) return;
    const next = [...levels, col];
    setLevels(next);
    onSave({ levels: next, separator: "/" });
  };

  const removeLevel = (idx: number) => {
    const next = levels.filter((_, i) => i !== idx);
    setLevels(next);
    onSave(next.length > 0 ? { levels: next, separator: "/" } : null);
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...levels];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setLevels(next);
    setDragIdx(idx);
  };
  const handleDragEnd = () => {
    setDragIdx(null);
    if (levels.length > 0) onSave({ levels, separator: "/" });
  };

  // Sample preview
  const samplePath = useMemo(() => {
    if (levels.length === 0) return "/page-slug";
    const sampleValues: Record<string, string> = {
      state: "california", city: "los-angeles", county: "los-angeles-county",
      region: "west", country: "us", zip_code: "90001", service: "plumbing",
      category: "services", type: "residential",
    };
    const parts = levels.map((l) => sampleValues[l.toLowerCase()] || l.toLowerCase().replace(/[_ ]/g, "-"));
    return "/" + parts.join("/") + "/page-slug";
  }, [levels]);

  // Build tree from actual CSV data
  const tree = useMemo(() => {
    if (levels.length === 0 || csvData.length === 0) return null;
    return buildTree(levels, csvData);
  }, [levels, csvData]);

  const treeStats = useMemo(() => {
    if (!tree) return null;
    const countNodes = (node: TreeNode): number =>
      node.children.reduce((sum, c) => sum + 1 + countNodes(c), 0);
    const countLeaves = (node: TreeNode): number =>
      node.children.length === 0 ? 1 : node.children.reduce((sum, c) => sum + countLeaves(c), 0);
    return { directories: countNodes(tree), pages: countLeaves(tree) };
  }, [tree]);

  return (
    <Card className="border-0 shadow-surface">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-primary" /> Directory Structure
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Build hierarchical URL paths by adding and reordering data columns as path segments. Drag to reorder levels.
        </p>

        {/* Current levels */}
        {levels.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Path Hierarchy</Label>
            <div className="space-y-1">
              {levels.map((level, idx) => (
                <div
                  key={`${level}-${idx}`}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    dragIdx === idx
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  <button className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0">
                    <GripVertical className="h-3.5 w-3.5" />
                  </button>
                  <Badge variant="outline" className="text-[11px] font-mono shrink-0">
                    Level {idx + 1}
                  </Badge>
                  <span className="text-xs font-medium flex-1">{level}</span>
                  <code className="text-[10px] text-muted-foreground font-mono">{`/{${level}:slug}`}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeLevel(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add level */}
        {availableColumns.length > 0 && (
          <div className="flex items-center gap-2">
            <Select onValueChange={addLevel}>
              <SelectTrigger className="flex-1 h-9 rounded-xl text-xs">
                <SelectValue placeholder="Add hierarchy level..." />
              </SelectTrigger>
              <SelectContent>
                {availableColumns.map((col) => (
                  <SelectItem key={col} value={col} className="text-xs">
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground shrink-0">
              <Plus className="h-3.5 w-3.5 inline" /> Add level
            </span>
          </div>
        )}

        {csvHeaders.length === 0 && levels.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No data columns available. Upload CSV data to build directory paths.
          </p>
        )}

        {/* Live URL Preview */}
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <ArrowRight className="h-3 w-3 text-primary" /> URL Preview
          </Label>
          <div className="flex items-center gap-1 flex-wrap">
            <code className="text-xs font-mono text-muted-foreground">https://example.com</code>
            <code className="text-xs font-mono text-primary font-semibold">{samplePath}</code>
          </div>
          {levels.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Each <code className="bg-muted px-1 rounded">{"{variable}"}</code> is auto-slugified from your CSV data.
            </p>
          )}
        </div>

        {/* Tree Visualization from actual CSV data */}
        {tree && tree.children.length > 0 && (
          <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <FolderTree className="h-3 w-3 text-primary" /> Directory Tree Preview
              </Label>
              {treeStats && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                    {treeStats.directories} dir{treeStats.directories !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                    {treeStats.pages} leaf page{treeStats.pages !== 1 ? "s" : ""}
                  </Badge>
                </div>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-background p-2">
              {tree.children
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((child) => (
                  <TreeNodeView key={child.slug} node={child} depth={0} />
                ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Tree built from {csvData.length} CSV row{csvData.length !== 1 ? "s" : ""}. Folders represent unique values per hierarchy level.
            </p>
          </div>
        )}

        {levels.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-destructive hover:text-destructive"
            onClick={() => {
              setLevels([]);
              onSave(null);
            }}
          >
            <Trash2 className="h-3 w-3 mr-1.5" /> Clear directory structure
          </Button>
        )}
      </CardContent>
    </Card>
  );
}