import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const ADMIN_EMAIL = "3xvisibility@gmail.com";
const APP_ORIGIN = "https://3xvisibility.com";

// Structured logger — emits one JSON line per event so Stripe-driven email
// flows can be traced end to end (event received -> rendered -> send result).
function log(stage: string, fields: Record<string, unknown> = {}) {
  console.log(
    JSON.stringify({
      source: "stripe-webhook",
      stage,
      at: new Date().toISOString(),
      ...fields,
    }),
  );
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Best-effort lookup of an app user id by email (for the admin deep-link).
async function findUserIdByEmail(email?: string): Promise<string | undefined> {
  if (!email) return undefined;
  try {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) return undefined;
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    return match?.id;
  } catch {
    return undefined;
  }
}

// Create a Stripe Customer Billing Portal session so emails can deep-link
// users straight to where they can update payment details.
async function createPortalUrl(
  stripe: Stripe,
  customerId?: string,
): Promise<string | undefined> {
  if (!customerId) return undefined;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_ORIGIN}/billing`,
    });
    return session.url;
  } catch (err) {
    log("portal_session_error", {
      customerId,
      error: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  }
}

// Send one transactional email and return a structured result for logging.
async function sendEmail(
  templateName: string,
  recipientEmail: string | undefined,
  idempotencyKey: string,
  templateData: Record<string, unknown>,
) {
  const result: Record<string, unknown> = {
    templateName,
    recipientEmail: recipientEmail ?? "(template default)",
    idempotencyKey,
  };
  try {
    const { data, error } = await supabase.functions.invoke(
      "send-transactional-email",
      {
        body: { templateName, recipientEmail, idempotencyKey, templateData },
        headers: { Authorization: `Bearer ${serviceKey}` },
      },
    );
    if (error) {
      result.ok = false;
      result.error = error.message;
    } else {
      result.ok = (data as any)?.success !== false;
      result.response = data;
    }
  } catch (err) {
    result.ok = false;
    result.error = err instanceof Error ? err.message : String(err);
  }
  log("email_send_result", result);
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    log("config_error", { reason: "STRIPE_SECRET_KEY missing" });
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (webhookSecret) {
      const signature = req.headers.get("stripe-signature") ?? "";
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
      );
    } else {
      // No signing secret configured yet — parse without verification.
      event = JSON.parse(body) as Stripe.Event;
      log("signature_skipped", {
        warning: "STRIPE_WEBHOOK_SECRET not set; event not verified",
      });
    }
  } catch (err) {
    log("signature_verification_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  log("event_received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const email = invoice.customer_email ?? undefined;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        const planName = invoice.lines?.data?.[0]?.description ?? undefined;
        const amount = (invoice.amount_due / 100).toFixed(2);
        const currency = invoice.currency;
        const reason =
          invoice.last_finalization_error?.message ||
          (invoice as any).last_payment_error?.message ||
          "The payment was declined";
        const nextAttemptDate = invoice.next_payment_attempt
          ? new Date(invoice.next_payment_attempt * 1000).toISOString()
          : undefined;

        const [portalUrl, userId] = await Promise.all([
          createPortalUrl(stripe, customerId),
          findUserIdByEmail(email),
        ]);

        log("processing", {
          type: event.type,
          email,
          customerId,
          userId,
          amount,
          currency,
          hasPortalUrl: Boolean(portalUrl),
        });

        // Notify the affected user.
        await sendEmail("payment-failed", email, `pf-${invoice.id}`, {
          email,
          planName,
          amount,
          currency,
          reason,
          nextAttemptDate,
          origin: APP_ORIGIN,
          portalUrl,
        });

        // Notify the platform admin (template has a fixed recipient).
        await sendEmail(
          "admin-payment-failed",
          undefined,
          `apf-${invoice.id}`,
          {
            email,
            userId,
            customerId,
            planName,
            amount,
            currency,
            reason,
            nextAttemptDate,
            invoiceUrl: invoice.hosted_invoice_url ?? undefined,
            origin: APP_ORIGIN,
          },
        );
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        let email: string | undefined;
        try {
          if (customerId) {
            const customer = await stripe.customers.retrieve(customerId);
            if (!(customer as any).deleted) {
              email = (customer as Stripe.Customer).email ?? undefined;
            }
          }
        } catch (err) {
          log("customer_lookup_error", {
            customerId,
            error: err instanceof Error ? err.message : String(err),
          });
        }

        const planName =
          sub.items?.data?.[0]?.price?.nickname ?? undefined;
        const cancelledAt = sub.canceled_at
          ? new Date(sub.canceled_at * 1000).toISOString()
          : new Date().toISOString();
        const accessUntil = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : undefined;

        const portalUrl = await createPortalUrl(stripe, customerId);

        log("processing", {
          type: event.type,
          email,
          customerId,
          hasPortalUrl: Boolean(portalUrl),
        });

        await sendEmail("subscription-cancelled", email, `sc-${sub.id}`, {
          email,
          planName,
          cancelledAt,
          accessUntil,
          origin: APP_ORIGIN,
          portalUrl,
        });
        break;
      }

      default:
        log("event_ignored", { type: event.type });
    }
  } catch (err) {
    log("handler_error", {
      type: event.type,
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response(JSON.stringify({ error: "Handler error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
