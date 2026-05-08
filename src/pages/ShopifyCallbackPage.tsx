import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

/**
 * Shopify OAuth callback page.
 *
 * Two phases:
 *  1. Initial redirect from Shopify → has `code`, `state`, `shop`. We forward
 *     the request to the edge function which performs the token exchange.
 *  2. Edge-function return → has `shopify_oauth=success|error`. We surface a
 *     toast and route the user back to the dashboard.
 */
const ShopifyCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handled = useRef(false);
  const [phase, setPhase] = useState<"exchanging" | "success" | "error">("exchanging");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const status = searchParams.get("shopify_oauth");

    // Phase 2 — edge function has finished and bounced us back here.
    if (status === "success" || status === "error") {
      localStorage.removeItem("allowEphemeralSessionNavigationOnce");
      if (status === "success") {
        const shop = searchParams.get("shop");
        setPhase("success");
        toast.success("Shopify store connected", {
          description: shop ? `Connected ${shop}` : "Your store is now linked.",
        });
      } else {
        const message = searchParams.get("message") || "Connection failed";
        const code = searchParams.get("error_code");
        setPhase("error");
        setErrorMsg(message);
        toast.error("Shopify connection failed", {
          description: code ? `${message} (${code})` : message,
        });
      }

      // Briefly let the toast render, then return to dashboard.
      const timer = setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
      return () => clearTimeout(timer);
    }

    // Phase 1 — fresh callback from Shopify; forward to the edge function.
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code || !state) {
      localStorage.removeItem("allowEphemeralSessionNavigationOnce");
      setPhase("error");
      setErrorMsg("Missing OAuth parameters from Shopify");
      toast.error("Shopify connection failed", {
        description: "Missing OAuth parameters from Shopify",
      });
      const timer = setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
      return () => clearTimeout(timer);
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    localStorage.setItem("allowEphemeralSessionNavigationOnce", "shopify-oauth");
    window.location.replace(
      `${supabaseUrl}/functions/v1/shopify-oauth-callback${window.location.search}`,
    );
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center px-6">
        {phase === "exchanging" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Finalising your Shopify connection…
            </p>
          </>
        )}
        {phase === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm text-muted-foreground">
              Connected — taking you to the dashboard.
            </p>
          </>
        )}
        {phase === "error" && (
          <>
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground max-w-sm">
              {errorMsg || "Something went wrong"} — returning to the dashboard.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ShopifyCallbackPage;
