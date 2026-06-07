import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "invalid" | "done" | "submitting";

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        setState(res.ok ? "valid" : "invalid");
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const { error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      setState(error ? "invalid" : "done");
    } catch {
      setState("invalid");
    }
  };

  return (
    <>
      <Seo title="Unsubscribe" description="Manage your email preferences." path="/unsubscribe" />
      <StaticPageLayout title="Unsubscribe" subtitle="Manage your email preferences">
        {state === "loading" && <p>Checking your request…</p>}
        {state === "invalid" && (
          <p>This unsubscribe link is invalid or has already been used.</p>
        )}
        {(state === "valid" || state === "submitting") && (
          <div className="not-prose">
            <p className="mb-4 text-sm text-[hsl(250,15%,60%)]">
              Click below to stop receiving emails from 3Xvisibility.
            </p>
            <Button onClick={confirm} disabled={state === "submitting"}>
              {state === "submitting" ? "Processing…" : "Confirm Unsubscribe"}
            </Button>
          </div>
        )}
        {state === "done" && (
          <p>You have been unsubscribed. You will no longer receive these emails.</p>
        )}
      </StaticPageLayout>
    </>
  );
}
