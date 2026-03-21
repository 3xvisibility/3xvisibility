import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const WARNING_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // warn 5 min before expiry
const CHECK_INTERVAL_MS = 60 * 1000; // check every minute

export function useSessionTimeout() {
  const { toast } = useToast();
  const warnedRef = useRef(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const expiresAt = session.expires_at; // unix seconds
      if (!expiresAt) return;

      const msUntilExpiry = expiresAt * 1000 - Date.now();

      if (msUntilExpiry <= 0) {
        // Already expired – sign out
        warnedRef.current = false;
        await supabase.auth.signOut();
        return;
      }

      if (msUntilExpiry <= WARNING_BEFORE_EXPIRY_MS && !warnedRef.current) {
        warnedRef.current = true;
        const mins = Math.max(1, Math.round(msUntilExpiry / 60000));
        toast({
          title: "Session expiring soon",
          description: `Your session will expire in ~${mins} minute${mins > 1 ? "s" : ""}. Save your work or refresh to extend it.`,
          duration: 15000,
        });

        // Attempt silent refresh
        const { error } = await supabase.auth.refreshSession();
        if (!error) {
          warnedRef.current = false;
          toast({
            title: "Session extended",
            description: "Your session has been refreshed successfully.",
            duration: 5000,
          });
        }
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    // Reset warning flag on new auth events (e.g. after refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        warnedRef.current = false;
      }
    });

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [toast]);
}
