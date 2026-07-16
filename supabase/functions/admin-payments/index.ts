import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json({ error: "Forbidden: admin role required" }, 403);

    const body = await req.json().catch(() => ({}));
    const action: string = body.action ?? "list";

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const mode: "live" | "test" = stripeKey.startsWith("sk_live_") ? "live" : "test";

    // ---- mode: report which Stripe key is active + configured methods ----
    if (action === "mode") {
      const { data: settings } = await serviceClient
        .from("system_settings")
        .select("feature_flags")
        .eq("id", "global")
        .maybeSingle();
      const flags = (settings?.feature_flags || {}) as Record<string, boolean>;
      return json({
        mode,
        key_prefix: stripeKey.slice(0, 8) + "…",
        methods: {
          card: flags.pay_method_card !== false, // default on
          paypal: flags.pay_method_paypal !== false, // default on
        },
      });
    }

    // ---- list: charges + linked app users ----
    if (action === "list") {
      const limit = Math.min(Math.max(Number(body.limit ?? 50), 1), 100);
      const starting_after: string | undefined = body.starting_after || undefined;

      const charges = await stripe.charges.list({
        limit,
        ...(starting_after ? { starting_after } : {}),
        expand: ["data.customer", "data.invoice", "data.payment_intent"],
      });

      // Resolve app users by email in one page fetch
      const emails = new Set<string>();
      for (const c of charges.data) {
        const email =
          c.billing_details?.email ||
          (typeof c.customer !== "string" && c.customer && !("deleted" in c.customer)
            ? c.customer.email
            : null) ||
          c.receipt_email ||
          undefined;
        if (email) emails.add(email.toLowerCase());
      }

      const usersByEmail = new Map<string, { id: string; email: string; full_name?: string | null }>();
      if (emails.size > 0) {
        // Paginate up to ~2000 users; adequate for admin views
        for (let page = 1; page <= 2; page++) {
          const { data: pageData } = await serviceClient.auth.admin.listUsers({ page, perPage: 1000 });
          for (const u of pageData?.users || []) {
            const em = u.email?.toLowerCase();
            if (em && emails.has(em) && !usersByEmail.has(em)) {
              usersByEmail.set(em, {
                id: u.id,
                email: u.email!,
                full_name: (u.user_metadata as any)?.full_name ?? null,
              });
            }
          }
          if (!pageData || (pageData.users || []).length < 1000) break;
        }
      }

      // Enrich with plan info
      const userIds = Array.from(usersByEmail.values()).map((u) => u.id);
      const plansByUser = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: subs } = await serviceClient
          .from("subscriptions")
          .select("user_id, plan")
          .in("user_id", userIds);
        for (const s of subs || []) plansByUser.set(s.user_id, s.plan);
      }

      const items = charges.data.map((c) => {
        const email =
          c.billing_details?.email ||
          (typeof c.customer !== "string" && c.customer && !("deleted" in c.customer)
            ? c.customer.email
            : null) ||
          c.receipt_email ||
          null;
        const emKey = email?.toLowerCase();
        const appUser = emKey ? usersByEmail.get(emKey) : undefined;

        const invoice =
          typeof c.invoice !== "string" && c.invoice ? (c.invoice as Stripe.Invoice) : null;
        const productName =
          invoice?.lines?.data?.[0]?.description ||
          c.description ||
          (c.metadata && c.metadata.product) ||
          null;

        const pi =
          typeof c.payment_intent !== "string" && c.payment_intent
            ? (c.payment_intent as Stripe.PaymentIntent)
            : null;

        return {
          id: c.id,
          created: c.created,
          amount: c.amount,
          amount_refunded: c.amount_refunded,
          currency: c.currency,
          status: c.status,
          refunded: c.refunded,
          disputed: c.disputed,
          description: c.description,
          product_name: productName,
          receipt_url: c.receipt_url,
          invoice_url: invoice?.hosted_invoice_url ?? null,
          customer_id: typeof c.customer === "string" ? c.customer : c.customer?.id ?? null,
          customer_email: email,
          payment_intent: pi?.id ?? (typeof c.payment_intent === "string" ? c.payment_intent : null),
          payment_method_brand: c.payment_method_details?.card?.brand ?? c.payment_method_details?.type ?? null,
          payment_method_last4: c.payment_method_details?.card?.last4 ?? null,
          app_user: appUser
            ? {
                id: appUser.id,
                email: appUser.email,
                full_name: appUser.full_name,
                plan: plansByUser.get(appUser.id) ?? null,
              }
            : null,
        };
      });

      return json({
        mode,
        items,
        has_more: charges.has_more,
        next_cursor: charges.has_more ? charges.data[charges.data.length - 1]?.id : null,
      });
    }

    // ---- refund a charge / payment_intent ----
    if (action === "refund") {
      const chargeId: string | undefined = body.charge_id;
      const paymentIntentId: string | undefined = body.payment_intent;
      const reason = body.reason as "duplicate" | "fraudulent" | "requested_by_customer" | undefined;
      const amount = body.amount ? Number(body.amount) : undefined;

      if (!chargeId && !paymentIntentId) {
        return json({ error: "charge_id or payment_intent required" }, 400);
      }

      const refund = await stripe.refunds.create({
        ...(chargeId ? { charge: chargeId } : {}),
        ...(paymentIntentId ? { payment_intent: paymentIntentId } : {}),
        ...(reason ? { reason } : {}),
        ...(amount ? { amount } : {}),
        metadata: { refunded_by_admin: user.id, refunded_by_email: user.email ?? "" },
      });

      return json({ success: true, refund });
    }

    // ---- update enabled methods (card, paypal) ----
    if (action === "update-methods") {
      const card = body.card !== false;
      const paypal = body.paypal !== false;
      const { data: settings } = await serviceClient
        .from("system_settings")
        .select("feature_flags")
        .eq("id", "global")
        .maybeSingle();
      const flags = { ...(settings?.feature_flags || {}) };
      flags.pay_method_card = card;
      flags.pay_method_paypal = paypal;
      const { error } = await serviceClient
        .from("system_settings")
        .upsert({ id: "global", feature_flags: flags, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (error) throw error;
      return json({ success: true, methods: { card, paypal } });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("[admin-payments] error", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
