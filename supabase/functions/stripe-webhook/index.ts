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

// Persist an invoice record for a successful payment. Returns the stored row
// (or the existing one when the same Stripe object was already recorded).
async function recordInvoice(input: {
  stripeInvoiceId?: string | null;
  stripeChargeId?: string | null;
  stripeCustomerId?: string | null;
  stripePaymentIntent?: string | null;
  email?: string | null;
  name?: string | null;
  userId?: string | null;
  description?: string | null;
  plan?: string | null;
  amountTotal: number;
  currency: string;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
  receiptUrl?: string | null;
  lineItems: Array<{ description: string; quantity: number; amount: number }>;
  billingDetails?: Record<string, unknown>;
  issuedAt?: string;
}) {
  // Idempotency: never create two invoices for the same Stripe object.
  const match = input.stripeInvoiceId
    ? { column: "stripe_invoice_id", value: input.stripeInvoiceId }
    : input.stripeChargeId
      ? { column: "stripe_charge_id", value: input.stripeChargeId }
      : null;

  if (match) {
    const { data: existing } = await supabase
      .from("invoices")
      .select("*")
      .eq(match.column, match.value)
      .maybeSingle();
    if (existing) {
      log("invoice_exists", { invoice_number: existing.invoice_number });
      return existing;
    }
  }

  const { data: numberData, error: numberError } = await supabase.rpc("next_invoice_number");
  if (numberError) log("invoice_number_error", { error: numberError.message });
  const invoiceNumber =
    (numberData as string | null) ??
    `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      user_id: input.userId ?? null,
      customer_email: input.email ?? null,
      customer_name: input.name ?? null,
      stripe_invoice_id: input.stripeInvoiceId ?? null,
      stripe_charge_id: input.stripeChargeId ?? null,
      stripe_customer_id: input.stripeCustomerId ?? null,
      stripe_payment_intent: input.stripePaymentIntent ?? null,
      description: input.description ?? null,
      plan: input.plan ?? null,
      amount_total: input.amountTotal,
      currency: input.currency,
      status: "paid",
      hosted_invoice_url: input.hostedInvoiceUrl ?? null,
      invoice_pdf_url: input.invoicePdfUrl ?? null,
      receipt_url: input.receiptUrl ?? null,
      line_items: input.lineItems,
      billing_details: input.billingDetails ?? {},
      issued_at: input.issuedAt ?? new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    log("invoice_insert_error", { error: error.message });
    return null;
  }
  log("invoice_created", { invoice_number: data.invoice_number, amount: data.amount_total });
  return data;
}

// Create the invoice + send the customer receipt and the admin notification.
async function handleSuccessfulPayment(params: Parameters<typeof recordInvoice>[0]) {
  const invoice = await recordInvoice(params);
  const amount = (params.amountTotal / 100).toFixed(2);
  const invoiceNumber = invoice?.invoice_number ?? undefined;
  const key = params.stripeInvoiceId || params.stripeChargeId || crypto.randomUUID();

  await sendEmail("payment-receipt", params.email ?? undefined, `rcpt-${key}`, {
    name: params.name ?? undefined,
    email: params.email ?? undefined,
    planName: params.plan ?? params.description ?? undefined,
    amount,
    currency: params.currency,
    invoiceNumber,
    paidAt: params.issuedAt ?? new Date().toISOString(),
    origin: APP_ORIGIN,
  });

  await sendEmail("admin-payment-received", undefined, `apr-${key}`, {
    email: params.email ?? undefined,
    name: params.name ?? undefined,
    userId: params.userId ?? undefined,
    customerId: params.stripeCustomerId ?? undefined,
    planName: params.plan ?? params.description ?? undefined,
    amount,
    currency: params.currency,
    invoiceNumber,
    paidAt: params.issuedAt ?? new Date().toISOString(),
    invoiceUrl: params.hostedInvoiceUrl ?? undefined,
    origin: APP_ORIGIN,
  });

  return invoice;
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
      // ---- successful subscription / invoice payment ----
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        const email =
          invoice.customer_email ??
          (invoice as any).customer_details?.email ??
          undefined;
        const name =
          invoice.customer_name ?? (invoice as any).customer_details?.name ?? undefined;
        const userId = await findUserIdByEmail(email);
        const lines = (invoice.lines?.data ?? []).map((l) => ({
          description: l.description ?? "Subscription",
          quantity: l.quantity ?? 1,
          amount: l.amount ?? 0,
        }));

        await handleSuccessfulPayment({
          stripeInvoiceId: invoice.id,
          stripeChargeId: typeof (invoice as any).charge === "string" ? (invoice as any).charge : null,
          stripeCustomerId: customerId,
          stripePaymentIntent:
            typeof (invoice as any).payment_intent === "string"
              ? (invoice as any).payment_intent
              : null,
          email,
          name,
          userId,
          description: lines[0]?.description ?? invoice.description ?? null,
          plan: invoice.lines?.data?.[0]?.description ?? null,
          amountTotal: invoice.amount_paid || invoice.amount_due || 0,
          currency: invoice.currency,
          hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
          invoicePdfUrl: invoice.invoice_pdf ?? null,
          receiptUrl: null,
          lineItems: lines,
          billingDetails: {
            address: (invoice as any).customer_address ?? null,
            phone: (invoice as any).customer_phone ?? null,
          },
          issuedAt: new Date((invoice.created ?? Date.now() / 1000) * 1000).toISOString(),
        });
        break;
      }

      // ---- one-off payment succeeded (no Stripe invoice attached) ----
      case "charge.succeeded": {
        const charge = event.data.object as Stripe.Charge;
        if (charge.invoice) {
          // Already covered by the invoice.paid handler.
          log("event_ignored", { type: event.type, reason: "has_invoice" });
          break;
        }
        const email = charge.billing_details?.email ?? charge.receipt_email ?? undefined;
        const name = charge.billing_details?.name ?? undefined;
        const userId = await findUserIdByEmail(email);

        await handleSuccessfulPayment({
          stripeInvoiceId: null,
          stripeChargeId: charge.id,
          stripeCustomerId: typeof charge.customer === "string" ? charge.customer : charge.customer?.id,
          stripePaymentIntent:
            typeof charge.payment_intent === "string" ? charge.payment_intent : null,
          email,
          name,
          userId,
          description: charge.description ?? "One-time payment",
          plan: (charge.metadata?.plan as string) ?? null,
          amountTotal: charge.amount,
          currency: charge.currency,
          hostedInvoiceUrl: null,
          invoicePdfUrl: null,
          receiptUrl: charge.receipt_url ?? null,
          lineItems: [
            {
              description: charge.description ?? "One-time payment",
              quantity: 1,
              amount: charge.amount,
            },
          ],
          billingDetails: {
            address: charge.billing_details?.address ?? null,
            phone: charge.billing_details?.phone ?? null,
          },
          issuedAt: new Date(charge.created * 1000).toISOString(),
        });
        break;
      }

      // ---- refunds keep the invoice in sync ----
      case "charge.refunded":
      case "charge.refund.updated":
      case "refund.created":
      case "refund.updated": {
        let chargeId: string | null = null;
        let paymentIntentId: string | null = null;
        let amountRefunded: number | null = null;
        let chargeAmount: number | null = null;

        if (event.type === "charge.refunded") {
          const charge = event.data.object as Stripe.Charge;
          chargeId = charge.id;
          paymentIntentId =
            typeof charge.payment_intent === "string" ? charge.payment_intent : null;
          amountRefunded = charge.amount_refunded;
          chargeAmount = charge.amount;
        } else {
          const refund = event.data.object as Stripe.Refund;
          chargeId = typeof refund.charge === "string" ? refund.charge : refund.charge?.id ?? null;
          paymentIntentId =
            typeof refund.payment_intent === "string" ? refund.payment_intent : null;
          // Re-read the charge so the totals stay authoritative.
          if (chargeId) {
            try {
              const charge = await stripe.charges.retrieve(chargeId);
              amountRefunded = charge.amount_refunded;
              chargeAmount = charge.amount;
            } catch (err) {
              log("charge_lookup_error", {
                chargeId,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
        }

        const target = await findInvoice({ chargeId, paymentIntentId });
        if (!target) {
          log("invoice_not_found_for_refund", { chargeId, paymentIntentId });
          break;
        }

        const refundedTotal = amountRefunded ?? target.amount_refunded ?? 0;
        const total = chargeAmount ?? target.amount_total ?? 0;
        const fullyRefunded = total > 0 && refundedTotal >= total;

        await supabase
          .from("invoices")
          .update({
            amount_refunded: refundedTotal,
            status:
              refundedTotal <= 0
                ? target.status
                : fullyRefunded
                  ? "refunded"
                  : "partially_refunded",
            refunded_at: refundedTotal > 0 ? new Date().toISOString() : null,
          })
          .eq("id", target.id);

        log("invoice_refund_synced", {
          invoice: target.invoice_number,
          refunded: refundedTotal,
          fullyRefunded,
        });
        break;
      }

      // ---- chargebacks / disputes void the invoice ----
      case "charge.dispute.created":
      case "charge.dispute.updated":
      case "charge.dispute.funds_withdrawn":
      case "charge.dispute.funds_reinstated":
      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId =
          typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id ?? null;
        const paymentIntentId =
          typeof dispute.payment_intent === "string" ? dispute.payment_intent : null;

        const target = await findInvoice({ chargeId, paymentIntentId });
        if (!target) {
          log("invoice_not_found_for_dispute", { chargeId, paymentIntentId });
          break;
        }

        // Dispute won -> the payment stands; lost/closed against us -> voided.
        const won = dispute.status === "won";
        const lost = dispute.status === "lost";
        const nextStatus = won
          ? (target.amount_refunded ?? 0) > 0
            ? target.status
            : "paid"
          : lost
            ? "voided"
            : "disputed";

        await supabase
          .from("invoices")
          .update({
            dispute_status: dispute.status,
            dispute_reason: dispute.reason ?? null,
            disputed_amount: dispute.amount ?? 0,
            disputed_at: new Date(dispute.created * 1000).toISOString(),
            status: nextStatus,
            voided_at: lost ? new Date().toISOString() : null,
          })
          .eq("id", target.id);

        await sendEmail("admin-payment-received", undefined, `dsp-${dispute.id}-${dispute.status}`, {
          email: target.customer_email ?? undefined,
          name: target.customer_name ?? undefined,
          userId: target.user_id ?? undefined,
          customerId: target.stripe_customer_id ?? undefined,
          planName: `Chargeback ${dispute.status} — ${dispute.reason ?? "unknown reason"}`,
          amount: ((dispute.amount ?? 0) / 100).toFixed(2),
          currency: dispute.currency ?? target.currency,
          invoiceNumber: target.invoice_number,
          paidAt: new Date().toISOString(),
          origin: APP_ORIGIN,
        });

        log("invoice_dispute_synced", {
          invoice: target.invoice_number,
          disputeStatus: dispute.status,
          nextStatus,
        });
        break;
      }


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
