import { supabase } from "@/integrations/supabase/client";

const REF_KEY = "pending_referral_code";
const ATTRIBUTED_KEY = "referral_attributed";

/** Read ?ref= from the URL, store it, and record a click event. Call once on app load. */
export async function captureReferralFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref");
    if (!code) return;

    localStorage.setItem(REF_KEY, code);

    // Fire-and-forget click tracking (works for anonymous visitors)
    await supabase.functions.invoke("affiliate-track", {
      body: {
        action: "click",
        code,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
      },
    });
  } catch {
    // best-effort
  }
}

/** Attribute a stored referral code to the current user (after they sign up / log in). */
export async function attributeReferralIfPending() {
  try {
    const code = localStorage.getItem(REF_KEY);
    if (!code) return;
    if (localStorage.getItem(ATTRIBUTED_KEY) === "1") {
      localStorage.removeItem(REF_KEY);
      return;
    }

    const { data, error } = await supabase.functions.invoke("affiliate-track", {
      body: { action: "attribute", code },
    });

    if (!error && data?.success) {
      localStorage.setItem(ATTRIBUTED_KEY, "1");
      localStorage.removeItem(REF_KEY);
    }
  } catch {
    // best-effort
  }
}
