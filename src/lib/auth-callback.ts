import { supabase } from "@/integrations/supabase/client";

const hasAuthPayload = () => {
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  if (params.has("access_token") || params.has("token_hash") || params.has("code")) return true;
  const q = new URLSearchParams(window.location.search);
  return q.has("token_hash") || q.has("type");
};

export async function processPendingAuthCallback(): Promise<boolean> {
  if (!hasAuthPayload()) return false;
  try {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const tokenHash = params.get("token_hash");
    const type = params.get("type") || new URLSearchParams(window.location.search).get("type");
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any });
      if (error) return false;
    } else {
      const { error } = await supabase.auth.initialize();
      if (error) return false;
    }
  } catch {
    return false;
  }
  stripAuthParamsFromUrl();
  return true;
}

export function stripAuthParamsFromUrl() {
  try {
    const url = new URL(window.location.href);
    const hadHash = !!url.hash;
    url.hash = "";
    url.searchParams.delete("token_hash");
    url.searchParams.delete("type");
    window.history.replaceState({}, "", url.pathname + url.search);
    void hadHash;
  } catch { /* ignore */ }
}