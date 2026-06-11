import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action: string = body.action ?? "list";

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Resolve or create Stripe customer
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = existing.data[0]?.id;

    // ---- LIST ----
    if (action === "list") {
      if (!customerId) {
        return json({ paymentMethods: [], defaultPaymentMethodId: null });
      }
      const customer = await stripe.customers.retrieve(customerId);
      const defaultPm =
        typeof customer !== "string" && !("deleted" in customer)
          ? (customer.invoice_settings?.default_payment_method as string | null) ?? null
          : null;

      const cards = await stripe.paymentMethods.list({ customer: customerId, type: "card" });
      const paypals = await stripe.paymentMethods
        .list({ customer: customerId, type: "paypal" })
        .catch(() => ({ data: [] as Stripe.PaymentMethod[] }));

      const paymentMethods = [...cards.data, ...paypals.data].map((pm) => ({
        id: pm.id,
        type: pm.type,
        brand: pm.card?.brand ?? null,
        last4: pm.card?.last4 ?? null,
        expMonth: pm.card?.exp_month ?? null,
        expYear: pm.card?.exp_year ?? null,
        email: (pm as any).paypal?.payer_email ?? null,
      }));

      return json({ paymentMethods, defaultPaymentMethodId: defaultPm });
    }

    // ---- ADD (Checkout in setup mode) ----
    if (action === "add") {
      if (!customerId) {
        const created = await stripe.customers.create({ email: user.email });
        customerId = created.id;
      }
      const origin = req.headers.get("origin") ?? "";
      let session;
      try {
        session = await stripe.checkout.sessions.create({
          mode: "setup",
          customer: customerId,
          payment_method_types: ["card", "paypal"],
          currency: "eur",
          success_url: `${origin}/billing?card_added=true`,
          cancel_url: `${origin}/billing`,
        });
      } catch (_e) {
        // Fallback when PayPal is not enabled on the Stripe account
        session = await stripe.checkout.sessions.create({
          mode: "setup",
          customer: customerId,
          payment_method_types: ["card"],
          success_url: `${origin}/billing?card_added=true`,
          cancel_url: `${origin}/billing`,
        });
      }
      return json({ url: session.url });
    }

    // ---- DELETE ----
    if (action === "delete") {
      const pmId: string = body.paymentMethodId;
      if (!pmId) throw new Error("paymentMethodId is required");
      await stripe.paymentMethods.detach(pmId);
      return json({ success: true });
    }

    // ---- SET DEFAULT ----
    if (action === "set_default") {
      const pmId: string = body.paymentMethodId;
      if (!pmId || !customerId) throw new Error("paymentMethodId and customer required");
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: pmId },
      });
      return json({ success: true });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}
