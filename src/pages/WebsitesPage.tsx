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
import { Plus, Loader2, Zap, Languages, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import type { Tables, Database } from "@/integrations/supabase/types";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WebsiteCard } from "@/components/websites/WebsiteCard";
import { SiteTypeFilter } from "@/components/websites/SiteTypeFilter";
import { useLanguage } from "@/i18n/LanguageContext";
import { WordPressCredentialFields, type WpAuthMethod } from "@/components/websites/WordPressCredentialFields";
import { ShopifyCredentialFields } from "@/components/websites/ShopifyCredentialFields";
import { PrestaShopCredentialFields } from "@/components/websites/PrestaShopCredentialFields";
import { ConnectionSetupGuide } from "@/components/websites/ConnectionSetupGuide";
import { WebsiteLanguageSelect } from "@/components/websites/WebsiteLanguageSelect";
import { validateShopifyDomain, validateShopifyToken } from "@/lib/shopify-validation";
import { ConnectionProgressSteps, type ProgressStep, type StepStatus } from "@/components/websites/ConnectionProgressSteps";

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
  // Shopify
  const [shopDomain, setShopDomain] = useState("");
  const [shopifyToken, setShopifyToken] = useState("");
  const [prestashopApiKey, setPrestashopApiKey] = useState("");
  const [wooConsumerKey, setWooConsumerKey] = useState("");
  const [wooConsumerSecret, setWooConsumerSecret] = useState("");
  const [siteLanguage, setSiteLanguage] = useState<string | null>(null);
  const [languageLocked, setLanguageLocked] = useState<boolean>(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { t } = useLanguage();
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

  // Shopify-specific frontend validation (Bengali warnings shown inline in fields).
  const shopifyDomainError = siteType === "shopify" ? validateShopifyDomain(shopDomain) : null;
  const shopifyTokenError = siteType === "shopify" ? validateShopifyToken(shopifyToken) : null;
  const shopifyInvalid = siteType === "shopify" && (!!shopifyDomainError || !!shopifyTokenError);

  const buildCredentials = () => {
    if (siteType === "wordpress") {
      return wpAuthMethod === "application_password"
        ? { username, app_password: appPassword, auth_method: "application_password" }
        : { jwt_token: jwtToken, auth_method: "jwt" };
    }
    if (siteType === "shopify") return { admin_api_token: shopifyToken, shop_domain: shopDomain };
    if (siteType === "woocommerce") return { consumer_key: wooConsumerKey, consumer_secret: wooConsumerSecret };
    return { api_key: prestashopApiKey };
  };

  const updateStep = (key: string, status: StepStatus, detail?: string) => {
    setProgressSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, status, detail: detail ?? s.detail } : s))
    );
  };

  const runConnectFlow = async () => {
    if (!wsId) {
      toast({ title: "Error", description: "No workspace selected", variant: "destructive" });
      return;
    }
    if (maxSites > 0 && websites.length >= maxSites) {
      toast({
        title: "Error",
        description: `Your plan allows a maximum of ${maxSites} website(s). Please upgrade to add more.`,
        variant: "destructive",
      });
      return;
    }
    if (!siteUrl && !(siteType === "shopify" && shopDomain)) {
      toast({ title: "Error", description: "Missing website info", variant: "destructive" });
      return;
    }

    const finalUrl = siteType === "shopify" && shopDomain
      ? `https://${shopDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`
      : siteUrl;

    // Initialize step list — three explicit phases the user asked to see.
    const steps: ProgressStep[] = [
      { key: "verify", label: "Verifying connection", description: "Reaching your site and authenticating credentials", status: "pending" },
      { key: "save", label: "Saving credentials", description: "Storing the connection securely in your workspace", status: "pending" },
      { key: "test", label: "Publishing test page", description: "Creating a hidden draft to confirm publishing works", status: "pending" },
    ];
    setProgressSteps(steps);
    setIsConnecting(true);

    try {
      // ---- Step 1: Verify connection ----
      updateStep("verify", "running");
      try {
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke("test-connection", {
          body: { url: finalUrl, type: siteType, credentials: buildCredentials() },
        });
        if (verifyError) throw verifyError;
        if (verifyData?.error) throw new Error(verifyData.error);
        updateStep("verify", "success", verifyData?.message || "Credentials accepted");
      } catch (err: any) {
        updateStep("verify", "error", err?.message || "Could not reach the site");
        throw err;
      }

      // ---- Step 2: Save credentials ----
      updateStep("save", "running");
      let savedWebsiteId: string | null = null;
      try {
        const { data, error } = await supabase.functions.invoke("save-website", {
          body: {
            name: siteName || (siteType === "shopify" ? shopDomain : new URL(finalUrl).hostname),
            url: finalUrl,
            type: siteType,
            credentials: buildCredentials(),
            workspace_id: wsId,
            language: siteLanguage,
            language_locked: languageLocked,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        savedWebsiteId = data?.website?.id || data?.id || null;
        updateStep("save", "success", "Connection saved to your workspace");
      } catch (err: any) {
        updateStep("save", "error", err?.message || "Failed to save credentials");
        throw err;
      }

      // ---- Step 3: Publish test page (best-effort, non-fatal) ----
      updateStep("test", "running");
      try {
        const { data: testData, error: testError } = await supabase.functions.invoke("test-connection", {
          body: {
            url: finalUrl,
            type: siteType,
            credentials: buildCredentials(),
            publish_test_page: true,
          },
        });
        if (testError) throw testError;
        if (testData?.error) throw new Error(testData.error);
        if (testData?.test_page_published || testData?.test_page_url) {
          updateStep(
            "test",
            "success",
            testData.test_page_url
              ? `Draft created: ${testData.test_page_url}`
              : "Test draft created successfully"
          );
        } else {
          updateStep("test", "skipped", "Skipped — connector reachable but no test draft created");
        }
      } catch (err: any) {
        // Non-fatal: site is connected even if test publish fails
        updateStep("test", "skipped", err?.message || "Skipped — you can publish from the Pages tab");
      }

      // Done!
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      toast({ title: "Website connected", description: `Successfully connected to ${finalUrl}.` });
      if (wsId) logAudit(wsId, "site_created", "website", savedWebsiteId, { url: finalUrl, type: siteType });

      // Brief pause so user can see all green checks before the dialog closes
      setTimeout(() => {
        setIsConnecting(false);
        resetForm();
      }, 1200);
    } catch (err: any) {
      setIsConnecting(false);
      toast({ title: "Connection failed", description: err?.message || "Unknown error", variant: "destructive" });
    }
  };

  const buildTestUrl = () =>
    siteType === "shopify" && shopDomain
      ? `https://${shopDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`
      : siteUrl;

  const detectLanguageMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("detect-site-language", {
        body: { url: buildTestUrl(), type: siteType, credentials: buildCredentials() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.language as string | null;
    },
    onSuccess: (lang) => {
      if (lang) {
        setSiteLanguage(lang);
        toast({ title: "Site language detected", description: `Preselected: ${lang}` });
      } else {
        toast({
          title: "Could not detect language",
          description: "Please pick the site language manually.",
          variant: "destructive",
        });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Detection failed", description: err.message, variant: "destructive" });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      if (siteType === "shopify") {
        const dErr = validateShopifyDomain(shopDomain);
        const tErr = validateShopifyToken(shopifyToken);
        if (dErr || tErr) throw new Error(dErr || tErr || "Invalid Shopify credentials");
      }
      const { data, error } = await supabase.functions.invoke("test-connection", {
        body: { url: buildTestUrl(), type: siteType, credentials: buildCredentials() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Connection successful", description: data.message });
      // Auto-detect site language after successful connection (only if not already chosen).
      if (!siteLanguage) detectLanguageMutation.mutate();
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
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      toast({ title: "Website removed" });
      if (wsId) logAudit(wsId, "site_deleted", "website", id);
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
    setShopDomain("");
    setPrestashopApiKey("");
    setWooConsumerKey("");
    setWooConsumerSecret("");
    setSiteType("");
    setWpAuthMethod("application_password");
    setSiteLanguage(null);
    setLanguageLocked(false);
  };

  return (
    <div className="space-y-6">
      <UsageLimitBanner type="sites" used={sitesConnected} limit={sitesLimit} />
      <UsageLimitDialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen} type="sites" used={sitesConnected} limit={sitesLimit === -1 ? sitesConnected : sitesLimit} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-display">{t("websites.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("websites.description")}</p>
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
                <Plus className="mr-2 h-4 w-4" /> {t("websites.connectWebsite")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("websites.connectWebsite")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>{t("websites.platform")}</Label>
                  <Select value={siteType} onValueChange={(v) => setSiteType(v as WebsiteType)}>
                    <SelectTrigger><SelectValue placeholder={t("common.selectPlatform")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wordpress">WordPress</SelectItem>
                      <SelectItem value="shopify">Shopify</SelectItem>
                      <SelectItem value="prestashop">PrestaShop</SelectItem>
                      <SelectItem value="woocommerce">WooCommerce</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="site-name">{t("websites.siteName")}</Label>
                  <Input id="site-name" placeholder={t("websites.siteNamePlaceholder")} value={siteName} onChange={(e) => setSiteName(e.target.value)} />
                </div>
                {siteType !== "shopify" && (
                  <div>
                  <Label htmlFor="site-url">{t("websites.siteUrl")}</Label>
                    <Input id="site-url" placeholder={t("websites.siteUrlPlaceholder")} value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
                  </div>
                )}

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
                  <>
                    <ConnectionSetupGuide provider="shopify" siteHint={shopDomain} />
                    <ShopifyCredentialFields
                      shopDomain={shopDomain}
                      onShopDomainChange={setShopDomain}
                      accessToken={shopifyToken}
                      onAccessTokenChange={setShopifyToken}
                    />
                  </>
                )}
                {siteType === "prestashop" && (
                  <>
                    <ConnectionSetupGuide provider="prestashop" siteHint={siteUrl} />
                    <PrestaShopCredentialFields
                      apiKey={prestashopApiKey}
                      onApiKeyChange={setPrestashopApiKey}
                    />
                  </>
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

                {siteType && (
                  <div className="space-y-2">
                    <WebsiteLanguageSelect value={siteLanguage} onChange={setSiteLanguage} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={() => detectLanguageMutation.mutate()}
                      disabled={
                        !(siteType === "shopify" ? shopDomain : siteUrl) ||
                        detectLanguageMutation.isPending
                      }
                    >
                      {detectLanguageMutation.isPending ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Detecting…</>
                      ) : (
                        <><Languages className="h-3 w-3 mr-1" /> Auto-detect from site</>
                      )}
                    </Button>
                    <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 mt-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <Label htmlFor="lang-lock" className="text-sm font-medium">Lock language</Label>
                          <p className="text-[11px] text-muted-foreground">
                            When on, campaign per-run overrides and edits cannot change this site's language.
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="lang-lock"
                        checked={languageLocked}
                        onCheckedChange={setLanguageLocked}
                        disabled={!siteLanguage}
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">{t("common.cancel")}</Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => testConnectionMutation.mutate()}
                    disabled={!(siteType === "shopify" ? shopDomain : siteUrl) || !siteType || shopifyInvalid || testConnectionMutation.isPending}
                  >
                    {testConnectionMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> {t("common.testing")}</>
                    ) : (
                      <><Zap className="h-4 w-4 mr-1" /> {t("common.test")}</>
                    )}
                  </Button>
                  <Button className="w-full sm:w-auto" onClick={() => createMutation.mutate()} disabled={!(siteType === "shopify" ? shopDomain : siteUrl) || !siteType || shopifyInvalid || createMutation.isPending}>
                    {createMutation.isPending ? t("common.connecting") : t("common.connect")}
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
              ? t("websites.noWebsitesYet")
              : t("websites.noWebsitesFiltered")}
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
