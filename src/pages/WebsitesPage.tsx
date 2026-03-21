import { useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { UsageLimitBanner } from "@/components/UpgradePrompt";
import { UsageLimitDialog } from "@/components/UsageLimitDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Loader2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WebsiteCard } from "@/components/websites/WebsiteCard";
import { SiteTypeFilter } from "@/components/websites/SiteTypeFilter";
import { WordPressCredentialFields, type WpAuthMethod } from "@/components/websites/WordPressCredentialFields";
import { ShopifyCredentialFields } from "@/components/websites/ShopifyCredentialFields";

type Website = Tables<"websites">;
type WebsiteType = Database["public"]["Enums"]["website_type"];

export default function WebsitesPage() {
  const [open, setOpen] = useState(false);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const { sitesConnected, sitesLimit, hasReachedSiteLimit } = useSubscription();
  const [siteType, setSiteType] = useState<WebsiteType | "">("");
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  // WordPress
  const [wpAuthMethod, setWpAuthMethod] = useState<WpAuthMethod>("application_password");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [jwtToken, setJwtToken] = useState("");
  // Other platforms
  const [shopifyToken, setShopifyToken] = useState("");
  const [prestashopApiKey, setPrestashopApiKey] = useState("");
  const [wooConsumerKey, setWooConsumerKey] = useState("");
  const [wooConsumerSecret, setWooConsumerSecret] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data: websites = [], isLoading } = useQuery({
    queryKey: ["websites", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Website[];
    },
  });

  const { data: sitemaps = [] } = useQuery({
    queryKey: ["sitemaps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sitemaps").select("*");
      if (error) throw error;
      return data;
    },
  });

  const getSitemap = (websiteId: string) => sitemaps.find((s: any) => s.website_id === websiteId);
  const { features } = useSubscription();
  const maxSites = features.websites;
  const filteredWebsites = filterType === "all" ? websites : websites.filter((s) => s.type === filterType);

  const buildCredentials = () => {
    if (siteType === "wordpress") {
      return wpAuthMethod === "application_password"
        ? { username, app_password: appPassword, auth_method: "application_password" }
        : { jwt_token: jwtToken, auth_method: "jwt" };
    }
    if (siteType === "shopify") return { admin_api_token: shopifyToken };
    if (siteType === "woocommerce") return { consumer_key: wooConsumerKey, consumer_secret: wooConsumerSecret };
    return { api_key: prestashopApiKey };
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!wsId) throw new Error("No workspace selected");
      if (maxSites > 0 && websites.length >= maxSites) {
        throw new Error(`Your plan allows a maximum of ${maxSites} website(s). Please upgrade to add more.`);
      }
      if (!siteUrl || !siteType) throw new Error("Missing website info");

      const { data, error } = await supabase.functions.invoke("save-website", {
        body: {
          name: siteName || new URL(siteUrl).hostname,
          url: siteUrl,
          type: siteType,
          credentials: buildCredentials(),
          workspace_id: wsId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      toast({ title: "Website connected", description: `Successfully connected to ${siteUrl}.` });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("test-connection", {
        body: { url: siteUrl, type: siteType, credentials: buildCredentials() },
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("websites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      toast({ title: "Website removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setOpen(false);
    setSiteUrl("");
    setSiteName("");
    setUsername("");
    setAppPassword("");
    setJwtToken("");
    setShopifyToken("");
    setPrestashopApiKey("");
    setWooConsumerKey("");
    setWooConsumerSecret("");
    setSiteType("");
    setWpAuthMethod("application_password");
  };

  return (
    <div className="space-y-6">
      <UsageLimitBanner type="sites" used={sitesConnected} limit={sitesLimit} />
      <UsageLimitDialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen} type="sites" used={sitesConnected} limit={sitesLimit === -1 ? sitesConnected : sitesLimit} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-display">Websites</h1>
          <p className="text-muted-foreground mt-1 text-sm">Connect your websites for page publishing.</p>
        </div>
        <div className="flex items-center gap-2">
          <SiteTypeFilter value={filterType} onChange={setFilterType} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
                onClick={(e) => {
                  if (hasReachedSiteLimit()) {
                    e.preventDefault();
                    setLimitDialogOpen(true);
                  }
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Connect Website
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Connect Website</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Platform</Label>
                  <Select value={siteType} onValueChange={(v) => setSiteType(v as WebsiteType)}>
                    <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wordpress">WordPress</SelectItem>
                      <SelectItem value="shopify">Shopify</SelectItem>
                      <SelectItem value="prestashop">PrestaShop</SelectItem>
                      <SelectItem value="woocommerce">WooCommerce</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="site-name">Site Name</Label>
                  <Input id="site-name" placeholder="My Blog" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="site-url">Site URL</Label>
                  <Input id="site-url" placeholder="https://example.com" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
                </div>

                {siteType === "wordpress" && (
                  <WordPressCredentialFields
                    authMethod={wpAuthMethod}
                    onAuthMethodChange={setWpAuthMethod}
                    username={username}
                    onUsernameChange={setUsername}
                    appPassword={appPassword}
                    onAppPasswordChange={setAppPassword}
                    jwtToken={jwtToken}
                    onJwtTokenChange={setJwtToken}
                  />
                )}
                {siteType === "shopify" && (
                  <div>
                    <Label htmlFor="shopify-token">Admin API Access Token</Label>
                    <Input id="shopify-token" type="password" placeholder="shpat_xxxxx" value={shopifyToken} onChange={(e) => setShopifyToken(e.target.value)} />
                  </div>
                )}
                {siteType === "prestashop" && (
                  <div>
                    <Label htmlFor="ps-key">Webservice API Key</Label>
                    <Input id="ps-key" type="password" placeholder="PrestaShop API key" value={prestashopApiKey} onChange={(e) => setPrestashopApiKey(e.target.value)} />
                    <p className="text-[11px] text-muted-foreground mt-1">Found in PrestaShop Back Office → Advanced Parameters → Webservice</p>
                  </div>
                )}
                {siteType === "woocommerce" && (
                  <>
                    <div>
                      <Label htmlFor="woo-key">Consumer Key</Label>
                      <Input id="woo-key" type="password" placeholder="ck_xxxxx" value={wooConsumerKey} onChange={(e) => setWooConsumerKey(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="woo-secret">Consumer Secret</Label>
                      <Input id="woo-secret" type="password" placeholder="cs_xxxxx" value={wooConsumerSecret} onChange={(e) => setWooConsumerSecret(e.target.value)} />
                      <p className="text-[11px] text-muted-foreground mt-1">Found in WooCommerce → Settings → Advanced → REST API</p>
                    </div>
                  </>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => testConnectionMutation.mutate()}
                    disabled={!siteUrl || !siteType || testConnectionMutation.isPending}
                  >
                    {testConnectionMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Testing...</>
                    ) : (
                      <><Zap className="h-4 w-4 mr-1" /> Test</>
                    )}
                  </Button>
                  <Button className="w-full sm:w-auto" onClick={() => createMutation.mutate()} disabled={!siteUrl || !siteType || createMutation.isPending}>
                    {createMutation.isPending ? "Connecting..." : "Connect"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-5 space-y-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-20" /></CardContent></Card>
          ))}
        </div>
      ) : filteredWebsites.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            {websites.length === 0
              ? "No websites connected. Connect your first website to start publishing."
              : "No websites match the selected filter."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWebsites.map((site) => (
            <WebsiteCard
              key={site.id}
              site={site}
              sitemap={getSitemap(site.id)}
              onDelete={(id) => deleteMutation.mutate(id)}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
