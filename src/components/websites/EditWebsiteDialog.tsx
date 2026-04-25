import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";
import { WordPressCredentialFields, type WpAuthMethod } from "./WordPressCredentialFields";
import { ShopifyCredentialFields } from "./ShopifyCredentialFields";
import { PrestaShopCredentialFields } from "./PrestaShopCredentialFields";
import { ConnectionSetupGuide } from "./ConnectionSetupGuide";
import { WebsiteLanguageSelect } from "./WebsiteLanguageSelect";
import { validateShopifyDomain, validateShopifyToken } from "@/lib/shopify-validation";

type Website = Tables<"websites">;

interface EditWebsiteDialogProps {
  site: Website;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditWebsiteDialog({ site, open, onOpenChange }: EditWebsiteDialogProps) {
  const [name, setName] = useState(site.name);
  const [url, setUrl] = useState(site.url);
  const [language, setLanguage] = useState<string | null>(
    (site as unknown as { language?: string | null }).language ?? null
  );
  // WordPress credential fields
  const creds = (site.credentials as Record<string, string> | null) || {};
  const [wpAuthMethod, setWpAuthMethod] = useState<WpAuthMethod>(
    (creds.auth_method as WpAuthMethod) || "application_password"
  );
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [jwtToken, setJwtToken] = useState("");
  // Shopify
  const [shopifyToken, setShopifyToken] = useState("");
  // PrestaShop
  const [prestashopApiKey, setPrestashopApiKey] = useState("");
  // WooCommerce
  const [wooConsumerKey, setWooConsumerKey] = useState("");
  const [wooConsumerSecret, setWooConsumerSecret] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setName(site.name);
      setUrl(site.url);
      // Reset credential fields (don't pre-fill encrypted values)
      setUsername("");
      setAppPassword("");
      setJwtToken("");
      setShopifyToken("");
      setPrestashopApiKey("");
      setWooConsumerKey("");
      setWooConsumerSecret("");
      const c = (site.credentials as Record<string, string> | null) || {};
      setWpAuthMethod((c.auth_method as WpAuthMethod) || "application_password");
    }
  }, [open, site]);

  const buildCredentials = () => {
    if (site.type === "wordpress") {
      return wpAuthMethod === "application_password"
        ? { username, app_password: appPassword, auth_method: "application_password" }
        : { jwt_token: jwtToken, auth_method: "jwt" };
    }
    if (site.type === "shopify") return { admin_api_token: shopifyToken };
    if (site.type === "woocommerce") return { consumer_key: wooConsumerKey, consumer_secret: wooConsumerSecret };
    return { api_key: prestashopApiKey };
  };

  const hasCredentialInput = () => {
    if (site.type === "wordpress") {
      return wpAuthMethod === "application_password" ? !!(username && appPassword) : !!jwtToken;
    }
    if (site.type === "shopify") return !!shopifyToken;
    if (site.type === "woocommerce") return !!(wooConsumerKey && wooConsumerSecret);
    return !!prestashopApiKey;
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        id: site.id,
        name,
        url,
        type: site.type,
        workspace_id: site.workspace_id,
      };
      // Only send credentials if user filled them in
      if (hasCredentialInput()) {
        body.credentials = buildCredentials();
      }
      const { data, error } = await supabase.functions.invoke("save-website", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      toast({ title: "Website updated" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (!hasCredentialInput()) throw new Error("Enter new credentials to test");
      if (site.type === "shopify") {
        const shopDomain = (url || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
        const dErr = validateShopifyDomain(shopDomain);
        const tErr = validateShopifyToken(shopifyToken);
        if (dErr || tErr) throw new Error(dErr || tErr || "Invalid Shopify credentials");
      }
      const { data, error } = await supabase.functions.invoke("test-connection", {
        body: { url, type: site.type, credentials: buildCredentials() },
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Website</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="credentials">Credentials</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit-name">Site Name</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-url">Site URL</Label>
              <Input id="edit-url" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="credentials" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Enter new credentials to update them. Leave empty to keep existing ones.
            </p>

            {site.type === "wordpress" && (
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
            {site.type === "shopify" && (
              <>
                <ConnectionSetupGuide
                  provider="shopify"
                  siteHint={(url || "").replace(/^https?:\/\//, "").replace(/\/+$/, "")}
                />
                <ShopifyCredentialFields
                  shopDomain={(url || "").replace(/^https?:\/\//, "").replace(/\/+$/, "")}
                  onShopDomainChange={(v) => setUrl(`https://${(v || "").replace(/^https?:\/\//, "").replace(/\/+$/, "")}`)}
                  accessToken={shopifyToken}
                  onAccessTokenChange={setShopifyToken}
                />
              </>
            )}
            {site.type === "prestashop" && (
              <>
                <ConnectionSetupGuide provider="prestashop" siteHint={url} />
                <PrestaShopCredentialFields
                  apiKey={prestashopApiKey}
                  onApiKeyChange={setPrestashopApiKey}
                />
              </>
            )}
            {site.type === "woocommerce" && (
              <>
                <div>
                  <Label htmlFor="edit-woo-key">Consumer Key</Label>
                  <Input id="edit-woo-key" type="password" placeholder="ck_xxxxx" value={wooConsumerKey} onChange={(e) => setWooConsumerKey(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="edit-woo-secret">Consumer Secret</Label>
                  <Input id="edit-woo-secret" type="password" placeholder="cs_xxxxx" value={wooConsumerSecret} onChange={(e) => setWooConsumerSecret(e.target.value)} />
                </div>
              </>
            )}

            {hasCredentialInput() && (() => {
              const shopifyInvalid = site.type === "shopify" && (
                !!validateShopifyDomain((url || "").replace(/^https?:\/\//, "").replace(/\/+$/, "")) ||
                !!validateShopifyToken(shopifyToken)
              );
              return (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending || shopifyInvalid}
                >
                  {testMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Testing...</>
                  ) : (
                    <><Zap className="h-4 w-4 mr-1" /> Test Connection</>
                  )}
                </Button>
              );
            })()}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => updateMutation.mutate()} disabled={!name || !url || updateMutation.isPending}>
            {updateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</> : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
