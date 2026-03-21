import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

const WARNING_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // warn 5 min before expiry
const CHECK_INTERVAL_MS = 60 * 1000; // check every minute

export function useSessionTimeout() {
  const { toast } = useToast();
  const warnedRef = useRef(false);

  useEffect(() => {
    const extendSession = async () => {
      const { error } = await supabase.auth.refreshSession();
      if (!error) {
        warnedRef.current = false;
        toast({
          title: "Session extended",
          description: "Your session has been refreshed successfully.",
          duration: 5000,
        });
      } else {
        toast({
          title: "Failed to extend session",
          description: "Please log in again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    };

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const expiresAt = session.expires_at;
      if (!expiresAt) return;

      const msUntilExpiry = expiresAt * 1000 - Date.now();

      if (msUntilExpiry <= 0) {
        warnedRef.current = false;
        await supabase.auth.signOut();
        return;
      }

      if (msUntilExpiry <= WARNING_BEFORE_EXPIRY_MS && !warnedRef.current) {
        warnedRef.current = true;
        const mins = Math.max(1, Math.round(msUntilExpiry / 60000));
        toast({
          title: "Session expiring soon",
          description: `Your session will expire in ~${mins} minute${mins > 1 ? "s" : ""}. Click below to extend it.`,
          duration: 30000,
          action: ToastAction({
            altText: "Extend session",
            onClick: extendSession,
            children: "Extend session",
          }),
        });
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);

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
