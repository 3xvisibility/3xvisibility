import { ExternalLink, Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isSafeShopifyAuthUrl, navigateToShopifyAuth } from "@/lib/shopify-auth-url";
import { supabase } from "@/integrations/supabase/client";
import { extractEdgeError } from "@/lib/edge-function-error";

const ShopifyOAuthLaunchPage = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const authUrl = params.get("auth_url");
  const shopDomain = params.get("shop_domain");
  const workspaceId = params.get("workspace_id");
  const siteName = params.get("site_name");
  const language = params.get("language");
  const safe = authUrl ? isSafeShopifyAuthUrl(authUrl) : !!shopDomain && !!workspaceId;

  useEffect(() => {
    if (!safe) return;

    const startOAuth = async () => {
      try {
        if (authUrl) {
          navigateToShopifyAuth(authUrl);
          return;
        }

        const { data, error } = await supabase.functions.invoke("shopify-oauth-init", {
          body: {
            shop_domain: shopDomain,
            workspace_id: workspaceId,
            site_name: siteName || shopDomain,
            language,
          },
        });

        if (error) throw new Error(await extractEdgeError(error, "OAuth init failed"));
        if (data?.error) throw new Error(data.error);
        if (!data?.auth_url) throw new Error("No auth URL returned");

        navigateToShopifyAuth(data.auth_url);
      } catch (err: any) {
        const message = encodeURIComponent(err?.message || "Could not start Shopify OAuth");
        window.location.replace(`/websites?shopify_oauth=error&message=${message}`);
      }
    };

    void startOAuth();
  }, [authUrl, language, safe, shopDomain, siteName, workspaceId]);

  const openShopify = () => {
    if (safe && authUrl) navigateToShopifyAuth(authUrl);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            {safe ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldAlert className="h-5 w-5" />}
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {safe ? "Opening Shopify authorization" : "Invalid Shopify authorization link"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {safe
              ? "A new top-level Shopify authorization page is opening now. If it does not open automatically, continue manually."
              : "The authorization link could not be verified. Please return to the app and start the Shopify connection again."}
          </p>
        </div>

        {safe && authUrl && (
          <>
            <Alert className="bg-muted/50 border-border">
              <AlertDescription className="text-xs leading-relaxed">
                Shopify blocks embedded authorization pages, so this page redirects outside the app preview.
              </AlertDescription>
            </Alert>
            <Button type="button" className="w-full" onClick={openShopify}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Continue to Shopify
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ShopifyOAuthLaunchPage;