import { Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { navigateToShopifyAuth } from "@/lib/shopify-auth-url";
import { supabase } from "@/integrations/supabase/client";

/**
 * First-party launcher page for Shopify OAuth.
 *
 * Flow:
 * 1. The app navigates the top window here with query params
 *    (shop_domain, workspace_id, etc.)
 * 2. This page calls the `shopify-oauth-init` edge function to get the
 *    Shopify authorization URL.
 * 3. It then redirects the current window to Shopify.
 *
 * Because this page runs at the top level (not inside an iframe),
 * `window.location.href` works without cross-origin issues.
 */
const ShopifyOAuthLaunchPage = () => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const shopDomain = params.get("shop_domain");
  const workspaceId = params.get("workspace_id");
  const siteName = params.get("site_name");
  const language = params.get("language");

  const [error, setError] = useState<string | null>(null);
  const valid = !!shopDomain && !!workspaceId;

  useEffect(() => {
    if (!valid) return;

    const startOAuth = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (sessionError || !accessToken) {
          throw new Error("Your session expired. Please sign in again before connecting Shopify.");
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-oauth-init`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              shop_domain: shopDomain,
              workspace_id: workspaceId,
              site_name: siteName || shopDomain,
              language,
            }),
          },
        );
        const data = await response.json().catch(() => null);

        if (!response.ok) throw new Error(data?.message || data?.error || `OAuth init failed (${response.status})`);
        if (data?.error) throw new Error(data.error);
        if (data?.setup_required) throw new Error(data.message || "Shopify OAuth not configured");
        if (!data?.auth_url) throw new Error("No auth URL returned");

        // We're already at the top level — just redirect.
        navigateToShopifyAuth(data.auth_url);
      } catch (err: unknown) {
        console.error("ShopifyOAuthLaunchPage error:", err);
        setError(err instanceof Error ? err.message : "Could not start Shopify OAuth");
      }
    };

    void startOAuth();
  }, [valid, shopDomain, workspaceId, siteName, language]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            {error || !valid ? (
              <ShieldAlert className="h-5 w-5" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
          </div>

          <h1 className="text-xl font-semibold text-foreground">
            {error
              ? "Shopify connection failed"
              : !valid
                ? "Invalid authorization link"
                : "Redirecting to Shopify…"}
          </h1>

          <p className="text-sm text-muted-foreground">
            {error
              ? error
              : !valid
                ? "Missing required parameters. Please go back and try connecting again."
                : "You will be redirected to Shopify to authorize your store. This may take a moment."}
          </p>
        </div>

        {(error || !valid) && (
          <button
            type="button"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => window.history.back()}
          >
            Go Back
          </button>
        )}
      </div>
    </div>
  );
};

export default ShopifyOAuthLaunchPage;
