import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Upload, Play, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  completed: "bg-success/10 text-success",
  processing: "bg-primary/10 text-primary",
  draft: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive",
  queued: "bg-accent text-accent-foreground",
};

const mockCampaigns = [
  { id: "1", name: "Python Training Cities", status: "completed", template: "Course Landing", website: "blog.example.com", totalRows: 42, processedRows: 42, createdAt: "2026-03-14" },
  { id: "2", name: "SEO Landing Pages", status: "processing", template: "SEO Page", website: "store.example.com", totalRows: 50, processedRows: 18, createdAt: "2026-03-15" },
  { id: "3", name: "Product Pages Batch", status: "draft", template: "Product Page", website: "blog.example.com", totalRows: 200, processedRows: 0, createdAt: "2026-03-16" },
];

export default function CampaignsPage() {
  const [open, setOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const { toast } = useToast();

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const firstLine = text.split("\n")[0];
      const headers = firstLine.split(",").map((h) => h.trim());
      setCsvHeaders(headers);
    };
    reader.readAsText(file);
  };

  const handleCreate = () => {
    toast({
      title: "Campaign created",
      description: `"${campaignName}" has been saved as a draft.`,
    });
    setOpen(false);
    setCampaignName("");
    setCsvFile(null);
    setCsvHeaders([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Manage your page generation campaigns.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]">
              <Plus className="mr-2 h-4 w-4" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Python Training Cities"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>
              <div>
                <Label>Template</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="course">Course Landing</SelectItem>
                    <SelectItem value="seo">SEO Page</SelectItem>
                    <SelectItem value="product">Product Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>CSV File</Label>
                <div className="mt-1 border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors duration-150 cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {csvFile ? csvFile.name : "Drop CSV file or click to upload"}
                    </p>
                  </label>
                </div>
                {csvHeaders.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">Detected columns:</span>
                    {csvHeaders.map((h) => (
                      <Badge key={h} variant="secondary" className="text-xs">{h}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Website</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select website" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blog">blog.example.com</SelectItem>
                    <SelectItem value="store">store.example.com</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!campaignName}>
                  Create Campaign
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium text-muted-foreground">Campaign</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Template</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Website</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Progress</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {mockCampaigns.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors duration-150">
                  <td className="p-4 font-medium">{c.name}</td>
                  <td className="p-4">
                    <Badge variant="secondary" className={statusColors[c.status]}>{c.status}</Badge>
                  </td>
                  <td className="p-4 text-muted-foreground">{c.template}</td>
                  <td className="p-4 text-muted-foreground">{c.website}</td>
                  <td className="p-4 tabular-nums">{c.processedRows}/{c.totalRows}</td>
                  <td className="p-4 tabular-nums text-muted-foreground">{c.createdAt}</td>
                  <td className="p-4">
                    {c.status === "draft" && (
                      <Button size="sm" variant="ghost" className="text-primary">
                        <Play className="h-3 w-3 mr-1" /> Execute
                      </Button>
                    )}
                    {c.status === "completed" && (
                      <Button size="sm" variant="ghost" className="text-muted-foreground">
                        <ArrowRight className="h-3 w-3 mr-1" /> View
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
