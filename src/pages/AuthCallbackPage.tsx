import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
        const params = new URLSearchParams(hash);
        const code = params.get("code");
        const tokenHash = params.get("token_hash");
        const type = params.get("type");
        const err = params.get("error_description") || params.get("error");

        if (err) {
          if (active) setError(err.replace(/_/g, " "));
          return;
        }

        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) { if (active) setError(exErr.message); return; }
        } else if (tokenHash && type) {
          const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any });
          if (vErr) { if (active) setError(vErr.message); return; }
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) { if (active) setError("No authentication data found in the callback URL."); return; }
        }

        if (!active) return;
        const pendingPlan = (() => {
          try { return localStorage.getItem("pendingCheckoutPlan"); } catch { return null; }
        })();
        window.history.replaceState({}, "", "/dashboard");
        navigate(pendingPlan ? `/billing?plan=${pendingPlan}` : "/dashboard", { replace: true });
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { active = false; };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md text-center space-y-4 px-6">
          <h1 className="text-xl font-semibold text-destructive">Sign-in failed</h1>
          <p className="text-sm text-muted-foreground capitalize">{error}</p>
          <Button onClick={() => navigate("/auth", { replace: true })}>Back to sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Completing sign-in…
      </div>
    </div>
  );
}