import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Database,
  Search,
  MoreHorizontal,
  Eye,
  Upload,
  Trash2,
  FileSpreadsheet,
  HardDrive,
  Calendar,
  Layers,
  AlertTriangle,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function DataCsvPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [replacingFileId, setReplacingFileId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

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

  // Get campaign names for the CSV files
  const campaignIds = [...new Set(csvFiles.map((f: any) => f.campaign_id))];
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
    campaigns.find((c: any) => c.id === campaignId)?.name || "Unknown";

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await (supabase.from("campaign_csv_files" as any) as any)
        .delete()
        .eq("id", fileId);
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

  const replaceMutation = useMutation({
    mutationFn: async ({ fileId, file }: { fileId: string; file: File }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) throw new Error("CSV must have at least a header and one data row.");

      const firstLine = lines[0];
      let delimiter = ",";
      if (firstLine.includes("\t")) delimiter = "\t";
      else if (firstLine.split(";").length > firstLine.split(",").length) delimiter = ";";
      else if (firstLine.split("|").length > firstLine.split(",").length) delimiter = "|";

      const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ""));

      await (supabase.from("campaign_csv_files" as any) as any)
        .update({
          file_name: file.name,
          file_size: text.length,
          raw_content: text,
          headers: headers,
          row_count: lines.length - 1,
        })
        .eq("id", fileId);

      return { fileName: file.name, rowCount: lines.length - 1 };
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

  const handlePreview = async (file: any) => {
    setPreviewFile(file);
    // Fetch raw content for preview
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
    let delimiter = ",";
    if (lines[0]?.includes("\t")) delimiter = "\t";
    else if ((lines[0]?.split(";").length || 0) > (lines[0]?.split(",").length || 0)) delimiter = ";";

    const rows = lines.slice(1, 11).map((line: string) => {
      const values = line.split(delimiter).map((v) => v.trim().replace(/^["']|["']$/g, ""));
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
      // Small delay to avoid browser blocking multiple downloads
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const filteredFiles = csvFiles.filter((f: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.file_name?.toLowerCase().includes(q) ||
      getCampaignName(f.campaign_id).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display">Data / CSV</h1>
          <p className="text-muted-foreground mt-1">
            Manage your uploaded CSV files across all campaigns.
          </p>
        </div>
        {csvFiles.length > 0 && (
          <Button onClick={handleBulkDownload} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Download All ({csvFiles.length})
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files or campaigns..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Files", value: csvFiles.length, icon: FileSpreadsheet, color: "text-primary" },
          { label: "Total Rows", value: csvFiles.reduce((sum: number, f: any) => sum + (f.row_count || 0), 0).toLocaleString(), icon: Database, color: "text-secondary" },
          { label: "Total Size", value: formatSize(csvFiles.reduce((sum: number, f: any) => sum + (f.file_size || 0), 0)), icon: HardDrive, color: "text-success" },
          { label: "Campaigns", value: campaignIds.length, icon: Layers, color: "text-warning" },
        ].map((stat) => (
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
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
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
                  ? "CSV files will appear here when you create campaigns with data uploads."
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
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Campaign</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium">Uploaded</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.map((file: any) => (
                  <TableRow key={file.id} className="group">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="h-4 w-4 text-primary" />
                        </div>
                        <span className="truncate max-w-[200px]">{file.file_name || "data.csv"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {formatSize(file.file_size || 0)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      <Badge variant="secondary" className="text-xs rounded-lg">
                        {(file.row_count || 0).toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate max-w-[180px] block">
                        {getCampaignName(file.campaign_id)}
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
        </Card>
      )}

      {/* Hidden replace input */}
      <input
        type="file"
        accept=".csv"
        className="hidden"
        id="data-csv-replace-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && replacingFileId) {
            replaceMutation.mutate({ fileId: replacingFileId, file });
          }
          e.target.value = "";
        }}
      />

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(v) => { if (!v) { setPreviewFile(null); setPreviewRows([]); setPreviewHeaders([]); } }}>
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
                      {previewHeaders.map((h) => (
                        <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, i) => (
                      <TableRow key={i}>
                        {previewHeaders.map((h) => (
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
