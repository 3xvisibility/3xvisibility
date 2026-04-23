import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Shuffle, ArrowRight, Database, Variable } from "lucide-react";

interface RowMappingPreviewProps {
  csvData?: Record<string, string>[];
  templateContent?: string;
  className?: string;
}

/**
 * Shows a side-by-side preview of how each CSV column maps into a template
 * variable for a selected row, before running Generate Pages.
 */
export function RowMappingPreview({ csvData = [], templateContent = "", className = "" }: RowMappingPreviewProps) {
  const [rowIndex, setRowIndex] = useState(0);

  const headers = useMemo(() => {
    const first = csvData[0];
    return first ? Object.keys(first) : [];
  }, [csvData]);

  // Variables actually referenced in the template
  const usedVars = useMemo(() => {
    if (!templateContent) return new Set<string>();
    const matches = templateContent.match(/\{([a-z_][a-z0-9_]*?)(?::[\w()., ]+)?\}/gi) || [];
    const set = new Set<string>();
    matches.forEach((m) => {
      const name = m.replace(/^\{/, "").replace(/(:.*?)?\}$/, "").toLowerCase();
      set.add(name);
    });
    return set;
  }, [templateContent]);

  const currentRow = csvData[rowIndex] || {};

  const randomRow = () => {
    if (csvData.length <= 1) return;
    let idx: number;
    do { idx = Math.floor(Math.random() * csvData.length); } while (idx === rowIndex);
    setRowIndex(idx);
  };

  if (!csvData.length || !headers.length) {
    return (
      <Card className={`border-0 shadow-surface ${className}`}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" /> Row → Variable Mapping
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Upload a CSV to preview how each row maps into your template variables.
          </p>
        </CardContent>
      </Card>
    );
  }

  const matchedCount = headers.filter((h) => usedVars.has(h.toLowerCase())).length;

  return (
    <Card className={`border-0 shadow-surface ${className}`}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" /> Row → Variable Mapping
          </span>
          {templateContent && (
            <Badge variant="outline" className="text-[10px] font-normal">
              {matchedCount}/{headers.length} columns used in template
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Preview exactly what each template variable will contain for a given row before you run Generate Pages.
        </p>

        {/* Row navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            disabled={rowIndex === 0}
            onClick={() => setRowIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Select value={String(rowIndex)} onValueChange={(v) => setRowIndex(Number(v))}>
            <SelectTrigger className="h-7 text-xs w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {csvData.slice(0, 200).map((row, i) => (
                <SelectItem key={i} value={String(i)} className="text-xs">
                  Row {i + 1} — {String(Object.values(row)[0] ?? "").slice(0, 30)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            disabled={rowIndex >= csvData.length - 1}
            onClick={() => setRowIndex((i) => Math.min(csvData.length - 1, i + 1))}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={randomRow} disabled={csvData.length <= 1}>
            <Shuffle className="h-3 w-3 mr-1" /> Random
          </Button>
          <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">
            Row {rowIndex + 1} of {csvData.length}
          </span>
        </div>

        {/* Mapping table */}
        <ScrollArea className="h-[320px] rounded-lg border border-border bg-muted/20">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="h-8 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Database className="h-3 w-3" /> CSV Column</span>
                </TableHead>
                <TableHead className="h-8 w-8" />
                <TableHead className="h-8 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Variable className="h-3 w-3" /> Template Variable</span>
                </TableHead>
                <TableHead className="h-8 text-[11px] uppercase tracking-wider text-muted-foreground">Value in this row</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {headers.map((header) => {
                const variableKey = header.toLowerCase();
                const isUsed = usedVars.has(variableKey);
                const value = currentRow[header];
                const isEmpty = value === undefined || value === null || String(value).trim() === "";
                return (
                  <TableRow key={header} className={isUsed ? "" : "opacity-60"}>
                    <TableCell className="py-2 text-xs font-mono">{header}</TableCell>
                    <TableCell className="py-2 px-1 text-muted-foreground">
                      <ArrowRight className="h-3 w-3" />
                    </TableCell>
                    <TableCell className="py-2">
                      <code className="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                        {`{${variableKey}}`}
                      </code>
                      {!isUsed && templateContent && (
                        <span className="ml-2 text-[10px] text-muted-foreground">unused</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-xs max-w-[280px]">
                      {isEmpty ? (
                        <span className="text-destructive/70 italic">empty</span>
                      ) : (
                        <span className="line-clamp-2 break-words">{String(value)}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        {templateContent && (
          <p className="text-[11px] text-muted-foreground">
            <span className="text-primary font-medium">Tip:</span> Columns marked “unused” aren’t referenced in your current template.
            Add <code className="font-mono">{`{column_name}`}</code> in the template to inject them.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
