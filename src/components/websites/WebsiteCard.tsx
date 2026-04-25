import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, CheckCircle, XCircle, Trash2, Map, RefreshCw, Download, ExternalLink, Loader2, Zap, Pencil, Languages } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import { EditWebsiteDialog } from "./EditWebsiteDialog";
import { RetranslateSiteDialog } from "./RetranslateSiteDialog";

type Website = Tables<"websites">;

interface WebsiteCardProps {
  site: Website;
  sitemap: any;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function WebsiteCard({ site, sitemap, onDelete, isDeleting }: WebsiteCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [retransOpen, setRetransOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateSitemapMutation = useMutation({
    mutationFn: async (websiteId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-sitemap", {
        body: { website_id: websiteId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sitemaps"] });
      toast({ title: "Sitemap generated", description: `${data.page_count} pages included in sitemap.` });
    },
    onError: (err: Error) => {
      toast({ title: "Sitemap generation failed", description: err.message, variant: "destructive" });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("test-connection", {
        body: { url: site.url, type: site.type, credentials: site.credentials },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Connection successful", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
    },
  });

  const isGenerating = generateSitemapMutation.isPending;

  const handleDownloadSitemap = () => {
    if (!sitemap) return;
    const blob = new Blob([sitemap.content], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sitemap-${site.name.toLowerCase().replace(/\s+/g, "-")}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Card className="shadow-surface hover:shadow-surface-hover transition-shadow duration-150">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">{site.name}</h3>
            </div>
            <div className="flex items-center gap-1">
              {site.status === "connected" ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(site.id)} disabled={isDeleting}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground truncate">{site.url}</p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="capitalize text-xs">{site.type}</Badge>
            <Badge variant={site.status === "connected" ? "secondary" : "destructive"} className={site.status === "connected" ? "bg-success/10 text-success" : ""}>
              {site.status}
            </Badge>
          </div>
          {site.last_sync && (
            <p className="mt-3 text-xs text-muted-foreground tabular-nums">
              Last sync: {new Date(site.last_sync).toLocaleString()}
            </p>
          )}

          {/* Per-site actions */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={testConnectionMutation.isPending}
              onClick={() => testConnectionMutation.mutate()}
            >
              {testConnectionMutation.isPending ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Testing...</>
              ) : (
                <><Zap className="h-3 w-3 mr-1" /> Test Connection</>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setRetransOpen(true)}
              title={
                site.language
                  ? `Re-translate the most recent pages to ${site.language} and republish them`
                  : "Set a Site Language first to enable this action"
              }
            >
              <Languages className="h-3 w-3 mr-1" />
              Re-translate to {site.language || "site language"}
            </Button>
          </div>

          {/* Sitemap Section */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <Map className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold">Sitemap</span>
            </div>
            {sitemap ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="tabular-nums">{sitemap.page_count} pages</span>
                  <span>•</span>
                  <span className="tabular-nums">{new Date(sitemap.last_generated_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleDownloadSitemap}>
                    <Download className="h-3 w-3 mr-1" /> Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={isGenerating}
                    onClick={() => generateSitemapMutation.mutate(site.id)}
                  >
                    {isGenerating ? (
                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating...</>
                    ) : (
                      <><RefreshCw className="h-3 w-3 mr-1" /> Regenerate</>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">No sitemap generated yet.</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={isGenerating}
                  onClick={() => generateSitemapMutation.mutate(site.id)}
                >
                  {isGenerating ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating...</>
                  ) : (
                    <><Map className="h-3 w-3 mr-1" /> Generate Sitemap</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <EditWebsiteDialog site={site} open={editOpen} onOpenChange={setEditOpen} />
      <RetranslateSiteDialog
        open={retransOpen}
        onOpenChange={setRetransOpen}
        websiteId={site.id}
        websiteName={site.name}
        siteLanguage={site.language}
      />
    </>
  );
}
