import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, ShieldCheck, ShieldX, Plus, Unplug, RotateCcw, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { launchShopifyOAuthInTopWindow } from "@/lib/shopify-auth-url";
import { extractEdgeError } from "@/lib/edge-function-error";

interface ConnectionRow {
  id: string;
  shop_domain: string;
  scopes: string | null;
  updated_at: string;
}

export function ShopifyConnectionsWidget() {
  const { currentWorkspace, basePath } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [newDomain, setNewDomain] = useState("");

  const { data: sites, isLoading: sitesLoading } = useQuery({
    queryKey: ["dashboard-shopify-sites", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("id, name, url, language, workspace_id")
        .eq("workspace_id", wsId!)
        .eq("type", "shopify")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: connections, isLoading: connsLoading } = useQuery({
    queryKey: ["dashboard-shopify-connections", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shopify_connections_safe" as any)
        .select("id, shop_domain, scopes, updated_at, website_id")
        .eq("workspace_id", wsId!) as { data: (ConnectionRow & { website_id: string })[] | null; error: any };
      if (error) throw error;
      const map = new Map<string, ConnectionRow>();
      (data ?? []).forEach((c) => map.set(c.website_id, c));
      return map;
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (websiteId: string) => {
      const { data, error } = await supabase.functions.invoke("shopify-disconnect", {
        body: { website_id: websiteId },
      });
      if (error) throw new Error(await extractEdgeError(error, "Disconnect failed"));
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-shopify-connections", wsId] });
      queryClient.invalidateQueries({ queryKey: ["shopify-connection"] });
      toast({ title: "Shopify disconnected", description: "The store access token has been revoked." });
    },
    onError: (err: Error) => {
      toast({ title: "Disconnect failed", description: err.message, variant: "destructive" });
    },
  });

  const handleConnect = (shopDomain: string, siteName?: string, language?: string | null) => {
    const normalized = shopDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
    if (!/\.myshopify\.com$/i.test(normalized)) {
      toast({
        title: "Invalid store domain",
        description: "Domain must end with .myshopify.com",
        variant: "destructive",
      });
      return;
    }
    if (!wsId) return;
    launchShopifyOAuthInTopWindow({
      shopDomain: normalized,
      workspaceId: wsId,
      siteName: siteName || normalized,
      language: language || null,
    });
  };

  const loading = sitesLoading || connsLoading;
  const connectedCount = sites?.filter((s) => connections?.has(s.id)).length ?? 0;
  const totalCount = sites?.length ?? 0;

  return (
    <Card className="shadow-surface">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">Shopify Stores</CardTitle>
            <p className="text-xs text-muted-foreground">
              {connectedCount} of {totalCount} connected
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : (
          <>
            {(sites?.length ?? 0) === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-center">
                <p className="text-sm text-muted-foreground">No Shopify stores yet. Connect one below.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {sites!.map((site) => {
                  const conn = connections?.get(site.id);
                  const isConnected = !!conn;
                  const busy = disconnectMutation.isPending && disconnectMutation.variables === site.id;
                  const shopDomain = conn?.shop_domain || site.url?.replace(/^https?:\/\//, "").replace(/\/+$/, "") || "";
                  return (
                    <li
                      key={site.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-border bg-card/50 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate">{site.name}</p>
                          {isConnected ? (
                            <Badge variant="outline" className="gap-1 border-success/30 bg-success/10 text-success text-[10px]">
                              <ShieldCheck className="h-3 w-3" /> Connected
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 border-destructive/30 bg-destructive/10 text-destructive text-[10px]">
                              <ShieldX className="h-3 w-3" /> Disconnected
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate font-mono">{shopDomain}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isConnected ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConnect(shopDomain, site.name, site.language)}
                              disabled={busy}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              Reconnect
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" disabled={busy} className="text-destructive hover:text-destructive">
                                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Disconnect {site.name}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will revoke the access token. You can reconnect anytime.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => disconnectMutation.mutate(site.id)}>
                                    Disconnect
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleConnect(shopDomain, site.name, site.language)}
                            disabled={!shopDomain}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            Connect
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Connect a new store */}
            <div className="border-t border-border pt-3">
              <p className="text-xs font-medium text-foreground mb-2">Connect a new Shopify store</p>
              <div className="flex gap-2">
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="mystore.myshopify.com"
                  className="h-9 font-mono text-xs"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (!newDomain.trim()) return;
                    handleConnect(newDomain.trim());
                  }}
                  disabled={!newDomain.trim() || !wsId}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Connect
                </Button>
              </div>
              <button
                type="button"
                onClick={() => navigate(`${basePath}/websites`)}
                className="mt-2 text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              >
                Manage all websites →
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
