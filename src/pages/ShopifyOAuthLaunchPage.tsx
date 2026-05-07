import { ExternalLink, ShieldAlert } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isSafeShopifyAuthUrl } from "@/lib/shopify-auth-url";

const ShopifyOAuthLaunchPage = () => {
  const authUrl = useMemo(() => new URLSearchParams(window.location.search).get("auth_url"), []);
  const safe = isSafeShopifyAuthUrl(authUrl);

  useEffect(() => {
    if (!safe || !authUrl) return;
    const timer = window.setTimeout(() => {
      window.location.replace(authUrl);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [authUrl, safe]);

  const openShopify = () => {
    if (safe && authUrl) window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            {safe ? <ExternalLink className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
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