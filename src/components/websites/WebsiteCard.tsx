import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Globe, CheckCircle, XCircle, Trash2, Map, RefreshCw, Download,
  ExternalLink, Loader2, Zap, Pencil, Languages, Lock, Package,
  Wifi, WifiOff, ShoppingBag, Clock, AlertTriangle, Unplug, RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import { EditWebsiteDialog } from "./EditWebsiteDialog";
import { RetranslateSiteDialog } from "./RetranslateSiteDialog";
import { ShopifyProductManager } from "./ShopifyProductManager";
import { extractEdgeError } from "@/lib/edge-function-error";
import { cn } from "@/lib/utils";

type Website = Tables<"websites">;

interface WebsiteCardProps {
  site: Website;
  sitemap: any;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  autoOpenProducts?: boolean;
}

export function WebsiteCard({ site, sitemap, onDelete, isDeleting, autoOpenProducts }: WebsiteCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [retransOpen, setRetransOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(() => !!autoOpenProducts);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isShopify = site.type === "shopify";

  // Live health check for Shopify — fetches 1 product to verify token works
  const { data: healthData, isLoading: healthLoading, isError: healthError } = useQuery({
    queryKey: ["shopify-health", site.id],
    enabled: isShopify && site.status === "connected",
    staleTime: 5 * 60 * 1000, // 5 min
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("shopify-products", {
        body: { action: "list_products", website_id: site.id, limit: 1 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { alive: true, productCount: data?.total ?? 0 };
    },
  });

  // Latest sync event
  const { data: latestSync } = useQuery({
    queryKey: ["shopify-latest-sync", site.id],
    enabled: isShopify && site.status === "connected",
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("shopify-products", {
        body: { action: "get_sync_events", website_id: site.id, sync_limit: 1 },
      });
      if (error) return null;
      const events = data?.events || [];
      return events.length > 0 ? events[0] : null;
    },
  });

  // --- existing mutations ---
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
      if (error) throw new Error(await extractEdgeError(error, "Connection test failed"));
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

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
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
            {site.language && (
              <Badge variant="outline" className="text-xs gap-1">
                <Languages className="h-3 w-3" />
                {site.language}
                {(site as unknown as { language_locked?: boolean }).language_locked && (
                  <Lock className="h-3 w-3 ml-0.5" />
                )}
              </Badge>
            )}
          </div>

          {/* Shopify live status panel */}
          {isShopify && site.status === "connected" && (
            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              {/* Health indicator */}
              <div className="flex items-center gap-2">
                {healthLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Checking store health…</span>
                  </>
                ) : healthError ? (
                  <>
                    <WifiOff className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-xs text-destructive font-medium">Store unreachable — check credentials</span>
                  </>
                ) : (
                  <>
                    <Wifi className="h-3.5 w-3.5 text-success" />
                    <span className="text-xs text-success font-medium">Store connected & responsive</span>
                  </>
                )}
              </div>

              {/* Product count */}
              {healthData && !healthError && (
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {healthData.productCount > 0
                      ? `${healthData.productCount}+ product${healthData.productCount !== 1 ? "s" : ""} available`
                      : "No products found"}
                  </span>
                </div>
              )}

              {/* Last sync event */}
              {latestSync && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Last sync: <span className="font-medium">{latestSync.event_type?.replace("products/", "")}</span>
                    {" — "}
                    {latestSync.product_title && (
                      <span className="italic">{latestSync.product_title}</span>
                    )}
                    {" · "}
                    {timeAgo(latestSync.created_at)}
                  </span>
                </div>
              )}

              {/* Last sync from DB */}
              {site.last_sync && !latestSync && (
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Last sync: {timeAgo(site.last_sync)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Non-Shopify last sync */}
          {!isShopify && site.last_sync && (
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
            {isShopify && (
              <Button
                size="sm"
                variant="secondary"
                className="h-7 text-xs gap-1"
                onClick={() => setProductsOpen(true)}
              >
                <Package className="h-3 w-3" />
                Manage Products
              </Button>
            )}
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
      {isShopify && (
        <ShopifyProductManager
          open={productsOpen}
          onOpenChange={setProductsOpen}
          website={site}
        />
      )}
    </>
  );
}