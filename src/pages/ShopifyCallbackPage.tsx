import { useEffect } from "react";

/**
 * Shopify OAuth callback proxy page.
 *
 * Shopify redirects here (the App URL) after the merchant authorises.
 * We immediately forward all query params to the real edge-function
 * callback so the token exchange happens server-side.
 */
const ShopifyCallbackPage = () => {
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const params = window.location.search; // ?code=…&state=…&hmac=…&shop=…
    window.location.replace(
      `${supabaseUrl}/functions/v1/shopify-oauth-callback${params}`
    );
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
};

export default ShopifyCallbackPage;
