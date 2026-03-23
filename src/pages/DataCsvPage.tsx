import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Database, Search, MoreHorizontal, Eye, Upload, Trash2, FileSpreadsheet,
  HardDrive, Layers, AlertTriangle, Download, Plus, CheckCircle2, XCircle,
  CloudUpload, Sheet, Rss, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLanguage } from "@/i18n/LanguageContext";

// ─── Helpers ──────────────────────────────────────────────────────────

function detectDelimiter(line: string): string {
  if (line.includes("\t")) return "\t";
  const semi = line.split(";").length;
  const comma = line.split(",").length;
  const pipe = line.split("|").length;
  if (semi > comma && semi > pipe) return ";";
  if (pipe > comma && pipe > semi) return "|";
  return ",";
}

function detectEncoding(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // BOM detection
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return "utf-8";
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) return "utf-16le";
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) return "utf-16be";
  // Heuristic: scan for non-ASCII bytes typical in Latin-1 but invalid in UTF-8
  let invalidUtf8 = 0;
  for (let i = 0; i < Math.min(bytes.length, 4096); i++) {
    if (bytes[i] > 127) {
      if (bytes[i] >= 0xC0 && bytes[i] <= 0xFD) {
        // valid UTF-8 leading byte
      } else if (bytes[i] >= 0x80 && bytes[i] <= 0xBF) {
        // continuation byte – ok
      } else {
        invalidUtf8++;
      }
    }
  }
  return invalidUtf8 > 5 ? "latin1" : "utf-8";
}

interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

function validateCsv(headers: string[], rows: string[][], delimiter: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Empty headers
  const emptyIdx = headers.map((h, i) => h.trim() === "" ? i + 1 : -1).filter(i => i > 0);
  if (emptyIdx.length > 0) errors.push(`Empty header(s) at column(s): ${emptyIdx.join(", ")}`);

  // Duplicate headers
  const dupes = headers.filter((h, i) => h && headers.indexOf(h) !== i);
  if (dupes.length > 0) errors.push(`Duplicate header(s): ${[...new Set(dupes)].join(", ")}`);

  // Row length mismatches
  const expectedCols = headers.length;
  let mismatchCount = 0;
  for (const row of rows) {
    if (row.length !== expectedCols) mismatchCount++;
  }
  if (mismatchCount > 0) warnings.push(`${mismatchCount} row(s) have different column count than header (${expectedCols})`);

  // Very few rows
  if (rows.length === 0) errors.push("No data rows found");
  else if (rows.length < 3) warnings.push("Very few data rows – is this intentional?");

  // Very many columns
  if (headers.length > 50) warnings.push(`Large number of columns (${headers.length})`);

  return { valid: errors.length === 0, warnings, errors };
}

function parseCsvText(text: string) {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] as string[][], delimiter: ",", rowData: [] as Record<string, string>[] };
  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ""));
  const rawRows = lines.slice(1).map(line =>
    line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ""))
  );
  const rowData = rawRows.map(values =>
    headers.reduce((acc, h, i) => ({ ...acc, [h]: values[i] || "" }), {} as Record<string, string>)
  );
  return { headers, rows: rawRows, delimiter, rowData };
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const delimiterLabel: Record<string, string> = { ",": "Comma", ";": "Semicolon", "\t": "Tab", "|": "Pipe" };

const PAGE_SIZE = 10;

// ─── Component ────────────────────────────────────────────────────────

export default function DataCsvPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [replacingFileId, setReplacingFileId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingParsed, setPendingParsed] = useState<ReturnType<typeof parseCsvText> | null>(null);
  const [pendingValidation, setPendingValidation] = useState<ValidationResult | null>(null);
  const [pendingEncoding, setPendingEncoding] = useState<string>("utf-8");
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { t } = useLanguage();
  const wsId = currentWorkspace?.id;

  // ─── Queries ──────────────────────────────────────────────────────

  const { data: csvFiles = [], isLoading } = useQuery({
    queryKey: ["csv-files", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_csv_files" as any)
        .select("id, campaign_id, file_name, file_size, row_count, headers, created_at")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const campaignIds = [...new Set(csvFiles.map((f: any) => f.campaign_id).filter(Boolean))];
  const { data: campaigns = [] } = useQuery({
    queryKey: ["csv-campaigns", campaignIds],
    enabled: campaignIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .in("id", campaignIds);
      if (error) throw error;
      return data;
    },
  });

  const getCampaignName = (campaignId: string) =>
    campaigns.find((c: any) => c.id === campaignId)?.name || "—";

  // ─── Mutations ────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await (supabase.from("campaign_csv_files" as any) as any).delete().eq("id", fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["csv-files"] });
      toast({ title: "CSV file deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, parsed }: { file: File; parsed: ReturnType<typeof parseCsvText> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!wsId) throw new Error("No workspace selected");
      const text = await file.text();
      const { error } = await (supabase.from("campaign_csv_files" as any) as any).insert({
        campaign_id: null as any,
        workspace_id: wsId,
        user_id: user.id,
        file_name: file.name,
        file_size: text.length,
        raw_content: text,
        headers: parsed.headers,
        row_count: parsed.rowData.length,
      });
      if (error) throw error;
      return file.name;
    },
    onSuccess: (name) => {
      queryClient.invalidateQueries({ queryKey: ["csv-files"] });
      toast({ title: "CSV uploaded", description: `"${name}" is ready to use.` });
      resetUpload();
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const replaceMutation = useMutation({
    mutationFn: async ({ fileId, file }: { fileId: string; file: File }) => {
      const text = await file.text();
      const parsed = parseCsvText(text);
      await (supabase.from("campaign_csv_files" as any) as any)
        .update({
          file_name: file.name,
          file_size: text.length,
          raw_content: text,
          headers: parsed.headers,
          row_count: parsed.rowData.length,
        })
        .eq("id", fileId);
      return { fileName: file.name, rowCount: parsed.rowData.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["csv-files"] });
      toast({ title: "CSV replaced", description: `"${data.fileName}" uploaded with ${data.rowCount} rows.` });
      setReplacingFileId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // ─── File processing ─────────────────────────────────────────────

  const processFile = async (file: File) => {
    if (!file.name.match(/\.(csv|tsv|txt)$/i) && file.type !== "text/csv" && !file.type.includes("excel")) {
      toast({ title: "Invalid file", description: "Please upload a .csv, .tsv, or .txt file.", variant: "destructive" });
      return;
    }
    const buffer = await file.arrayBuffer();
    const encoding = detectEncoding(buffer);
    setPendingEncoding(encoding);
    const decoder = new TextDecoder(encoding === "latin1" ? "iso-8859-1" : encoding);
    const text = decoder.decode(buffer);
    const parsed = parseCsvText(text);
    const validation = validateCsv(parsed.headers, parsed.rows, parsed.delimiter);
    setPendingFile(file);
    setPendingParsed(parsed);
    setPendingValidation(validation);
    setUploadOpen(true);
  };

  const resetUpload = () => {
    setUploadOpen(false);
    setPendingFile(null);
    setPendingParsed(null);
    setPendingValidation(null);
    setPendingEncoding("utf-8");
  };

  // ─── Preview & Download ──────────────────────────────────────────

  const handlePreview = async (file: any) => {
    setPreviewFile(file);
    const { data, error } = await (supabase.from("campaign_csv_files" as any) as any)
      .select("raw_content, headers")
      .eq("id", file.id)
      .single();
    if (error || !data) {
      toast({ title: "Error loading preview", variant: "destructive" });
      return;
    }
    const headers = (data.headers as string[]) || [];
    setPreviewHeaders(headers);
    const lines = (data.raw_content as string).split("\n").filter((l: string) => l.trim());
    const delimiter = detectDelimiter(lines[0] || "");
    const rows = lines.slice(1, 11).map((line: string) => {
      const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ""));
      return headers.reduce((acc, h, i) => ({ ...acc, [h]: values[i] || "" }), {} as Record<string, string>);
    });
    setPreviewRows(rows);
  };

  const handleDownload = async (file: any) => {
    const { data, error } = await (supabase.from("campaign_csv_files" as any) as any)
      .select("raw_content")
      .eq("id", file.id)
      .single();
    if (error || !data?.raw_content) {
      toast({ title: "Error downloading file", variant: "destructive" });
      return;
    }
    const blob = new Blob([data.raw_content as string], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.file_name || "data.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkDownload = async () => {
    if (csvFiles.length === 0) return;
    toast({ title: "Downloading…", description: `Preparing ${csvFiles.length} file(s).` });
    for (const file of csvFiles) {
      await handleDownload(file);
      await new Promise(r => setTimeout(r, 300));
    }
  };

  // ─── Filtering & Pagination ───────────────────────────────────────

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return csvFiles;
    const q = searchQuery.toLowerCase();
    return csvFiles.filter((f: any) =>
      f.file_name?.toLowerCase().includes(q) ||
      getCampaignName(f.campaign_id).toLowerCase().includes(q)
    );
  }, [csvFiles, searchQuery, campaigns]);

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedFiles = filteredFiles.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ─── DnD handlers ────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display">{t("dataCsv.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("dataCsv.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {csvFiles.length > 0 && (
            <Button onClick={handleBulkDownload} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> {t("dataCsv.downloadAll", { count: csvFiles.length })}
            </Button>
          )}
          <Button onClick={() => fileInputRef.current?.click()} size="sm" className="gap-2 bg-gradient-primary hover:brightness-110">
            <Plus className="h-4 w-4" /> Upload CSV
          </Button>
        </div>
      </div>

      {/* Upload Dropzone */}
      <Card
        className={`border-2 border-dashed transition-all duration-200 cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5 shadow-lg"
            : "border-border hover:border-primary/40 hover:bg-muted/30"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors ${
            isDragging ? "bg-primary/20" : "bg-muted"
          }`}>
            <CloudUpload className={`h-7 w-7 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-semibold text-sm">
              {isDragging ? "Drop your CSV file here" : "Drag & drop a CSV file, or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports CSV, TSV, TXT · Auto-detects delimiter & encoding · Max 20 MB
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Future connectors hint */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium">Coming soon:</span>
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1.5 opacity-50 cursor-default">
                <Sheet className="h-3.5 w-3.5" /> Google Sheets
              </span>
            </TooltipTrigger>
            <TooltipContent>Import data directly from Google Sheets</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1.5 opacity-50 cursor-default">
                <Rss className="h-3.5 w-3.5" /> API Feed
              </span>
            </TooltipTrigger>
            <TooltipContent>Connect a REST API as a data source</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1.5 opacity-50 cursor-default">
                <Database className="h-3.5 w-3.5" /> Database
              </span>
            </TooltipTrigger>
            <TooltipContent>Query a database directly</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files or campaigns..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Files", value: csvFiles.length, icon: FileSpreadsheet, color: "text-primary" },
          { label: "Total Rows", value: csvFiles.reduce((s: number, f: any) => s + (f.row_count || 0), 0).toLocaleString(), icon: Database, color: "text-secondary" },
          { label: "Total Size", value: formatSize(csvFiles.reduce((s: number, f: any) => s + (f.file_size || 0), 0)), icon: HardDrive, color: "text-success" },
          { label: "Campaigns", value: campaignIds.length, icon: Layers, color: "text-warning" },
        ].map(stat => (
          <Card key={stat.label} className="border-0 shadow-surface">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* File Table */}
      {isLoading ? (
        <Card className="border-0 shadow-surface">
          <CardContent className="p-6 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
      ) : filteredFiles.length === 0 ? (
        <Card className="border-0 shadow-surface">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold">
                {csvFiles.length === 0 ? "No CSV files yet" : "No matching files"}
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                {csvFiles.length === 0
                  ? "Upload a CSV file above or create a campaign with data."
                  : "Try adjusting your search query."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-surface overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs uppercase tracking-wider font-medium">File Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Size</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Rows</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Columns</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Campaign</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Uploaded</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFiles.map((file: any) => (
                  <TableRow key={file.id} className="group">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="h-4 w-4 text-primary" />
                        </div>
                        <span className="truncate max-w-[200px]">{file.file_name || "data.csv"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{formatSize(file.file_size || 0)}</TableCell>
                    <TableCell className="tabular-nums">
                      <Badge variant="secondary" className="text-xs rounded-lg">{(file.row_count || 0).toLocaleString()}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {(file.headers as string[] | null)?.length || "—"}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate max-w-[180px] block">
                        {file.campaign_id ? getCampaignName(file.campaign_id) : <span className="italic">Standalone</span>}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(file.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => handlePreview(file)}>
                            <Eye className="h-4 w-4 mr-2" /> Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(file)}>
                            <Download className="h-4 w-4 mr-2" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setReplacingFileId(file.id);
                            document.getElementById("data-csv-replace-input")?.click();
                          }}>
                            <Upload className="h-4 w-4 mr-2" /> Replace
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(file.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredFiles.length)} of {filteredFiles.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={safePage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-xs text-muted-foreground px-1">…</span>}
                      <Button
                        variant={p === safePage ? "default" : "ghost"}
                        size="icon"
                        className="h-7 w-7 text-xs"
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </Button>
                    </span>
                  ))}
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={safePage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt,text/csv,application/vnd.ms-excel"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
          e.target.value = "";
        }}
      />
      <input
        type="file"
        accept=".csv,.tsv,.txt,text/csv,application/vnd.ms-excel"
        className="hidden"
        id="data-csv-replace-input"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file && replacingFileId) replaceMutation.mutate({ fileId: replacingFileId, file });
          e.target.value = "";
        }}
      />

      {/* Upload Validation Dialog */}
      <Dialog open={uploadOpen} onOpenChange={v => { if (!v) resetUpload(); }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              {pendingFile?.name || "Upload CSV"}
            </DialogTitle>
            <DialogDescription>
              Review file structure before uploading.
            </DialogDescription>
          </DialogHeader>

          {pendingParsed && pendingValidation && (
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Meta badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <FileSpreadsheet className="h-3 w-3" /> {formatSize(pendingFile?.size || 0)}
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  {pendingParsed.rowData.length.toLocaleString()} rows
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  {pendingParsed.headers.length} columns
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  Delimiter: {delimiterLabel[pendingParsed.delimiter] || pendingParsed.delimiter}
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  Encoding: {pendingEncoding.toUpperCase()}
                </Badge>
              </div>

              {/* Validation */}
              {(pendingValidation.errors.length > 0 || pendingValidation.warnings.length > 0) && (
                <div className="space-y-2">
                  {pendingValidation.errors.map((e, i) => (
                    <div key={`e-${i}`} className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-2.5">
                      <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{e}</span>
                    </div>
                  ))}
                  {pendingValidation.warnings.map((w, i) => (
                    <div key={`w-${i}`} className="flex items-start gap-2 text-xs text-warning bg-warning/5 border border-warning/20 rounded-lg p-2.5">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {pendingValidation.valid && pendingValidation.warnings.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-success bg-success/5 border border-success/20 rounded-lg p-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>File structure looks good – no issues detected.</span>
                </div>
              )}

              {/* Headers list */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Detected Headers</p>
                <div className="flex flex-wrap gap-1.5">
                  {pendingParsed.headers.map((h, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] rounded-md font-mono">
                      {h || <span className="italic text-destructive">(empty)</span>}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Preview (first 10 rows)</p>
                <ScrollArea className="max-h-[30vh] border border-border rounded-lg">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] font-semibold w-10">#</TableHead>
                          {pendingParsed.headers.map(h => (
                            <TableHead key={h} className="text-[10px] font-semibold whitespace-nowrap">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingParsed.rowData.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-[10px] text-muted-foreground tabular-nums">{i + 1}</TableCell>
                            {pendingParsed!.headers.map(h => (
                              <TableCell key={h} className="text-xs whitespace-nowrap max-w-[180px] truncate">
                                {row[h] || "—"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" onClick={resetUpload}>Cancel</Button>
                <Button
                  disabled={!pendingValidation.valid || uploadMutation.isPending}
                  onClick={() => {
                    if (pendingFile && pendingParsed)
                      uploadMutation.mutate({ file: pendingFile, parsed: pendingParsed });
                  }}
                  className="bg-gradient-primary hover:brightness-110 gap-2"
                >
                  {uploadMutation.isPending ? "Uploading…" : <><Upload className="h-4 w-4" /> Upload File</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={v => { if (!v) { setPreviewFile(null); setPreviewRows([]); setPreviewHeaders([]); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              {previewFile?.file_name || "CSV Preview"}
            </DialogTitle>
            <DialogDescription>
              Showing first 10 rows · {previewFile?.row_count?.toLocaleString()} total rows · {formatSize(previewFile?.file_size || 0)}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            {previewHeaders.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {previewHeaders.map(h => (
                        <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, i) => (
                      <TableRow key={i}>
                        {previewHeaders.map(h => (
                          <TableCell key={h} className="text-sm whitespace-nowrap max-w-[200px] truncate">
                            {row[h] || "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm">Loading preview...</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
