// Receives e-invoicing (Factur-X) status callbacks from the connected PA
// (Plateforme Agréée) — e.g. Pennylane, Billit — installed via the Stripe
// App Marketplace. The PA converts each Stripe invoice to a structured
// Factur-X file, transmits it through its access point, and posts the
// transmission status back to this endpoint.
//
// Verification: when EINVOICING_PA_WEBHOOK_SECRET is configured, the
// request is verified with an HMAC-SHA256 signature over the raw body
// (header "X-Einvoice-Signature" or "Stripe-Signature"-style "t=...,v1=...").
// When no secret is set, the payload is accepted but a warning is logged —
// the same graceful behaviour the Stripe webhook uses.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { hmac } from "https://deno.land/std@0.190.0/node/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-einvoice-signature",
};

function log(stage: string, fields: Record<string, unknown> = {}) {
  console.log(
    JSON.stringify({
      source: "einvoicing-pa-webhook",
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

// Verify an HMAC-SHA256 signature over the raw body. Supports two header
// conventions: a bare hex signature, or Stripe-style "t=<ts>,v1=<hex>".
function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const key = new TextEncoder().encode(secret);
  // Stripe-style: t=<ts>,v1=<hex>
  const v1Match = header.match(/v1=([0-9a-f]+)/i);
  if (v1Match) {
    const tsMatch = header.match(/t=(\d+)/);
    const payload = tsMatch ? `${tsMatch[1]}.${rawBody}` : rawBody;
    const mac = hmac("sha256", key, new TextEncoder().encode(payload));
    const hex = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex === v1Match[1];
  }
  // Bare hex signature
  const mac = hmac("sha256", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === header.trim().toLowerCase();
}

// Resolve the invoices row touched by a PA callback. PAs reference the
// source invoice by its Stripe invoice id, charge id, or our internal
// invoice number — try them in order.
async function findInvoice(refs: {
  stripeInvoiceId?: string | null;
  stripeChargeId?: string | null;
  invoiceNumber?: string | null;
}) {
  if (refs.stripeInvoiceId) {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("stripe_invoice_id", refs.stripeInvoiceId)
      .maybeSingle();
    if (data) return data;
  }
  if (refs.stripeChargeId) {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("stripe_charge_id", refs.stripeChargeId)
      .maybeSingle();
    if (data) return data;
  }
  if (refs.invoiceNumber) {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("invoice_number", refs.invoiceNumber)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

const STATUS_MAP: Record<string, string> = {
  // Normalise the various status strings PAs send into our canonical set.
  pending: "pending",
  queued: "pending",
  sent: "transmitted",
  transmitted: "transmitted",
  delivered: "delivered",
  accepted: "delivered",
  rejected: "rejected",
  failed: "rejected",
  error: "rejected",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const secret = Deno.env.get("EINVOICING_PA_WEBHOOK_SECRET");
  const rawBody = await req.text();
  const signature = req.headers.get("x-einvoice-signature") ?? req.headers.get("stripe-signature");

  if (secret) {
    if (!verifySignature(rawBody, signature, secret)) {
      log("signature_verification_failed", { hasSignature: !!signature });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    log("signature_skipped", { warning: "EINVOICING_PA_WEBHOOK_SECRET not set" });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    log("invalid_json", { error: err instanceof Error ? err.message : String(err) });
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Tolerant extraction — PA payload shapes differ, so read several aliases.
  const stripeInvoiceId =
    (payload.stripe_invoice_id as string) ??
    (payload.invoice_id as string) ??
    (payload.metadata?.stripe_invoice_id as string) ??
    null;
  const stripeChargeId =
    (payload.stripe_charge_id as string) ??
    (payload.charge_id as string) ??
    null;
  const invoiceNumber =
    (payload.invoice_number as string) ??
    (payload.external_invoice_number as string) ??
    null;

  const rawStatus = String(
    payload.status ?? payload.einvoicing_status ?? payload.transmission_status ?? "pending",
  ).toLowerCase();
  const status = STATUS_MAP[rawStatus] ?? "pending";
  const paName =
    (payload.provider as string) ??
    (payload.pa_name as string) ??
    (payload.metadata?.provider as string) ??
    null;
  const einvoiceUrl =
    (payload.einvoice_url as string) ??
    (payload.invoice_url as string) ??
    (payload.download_url as string) ??
    null;
  const format = (payload.format as string) ?? (payload.einvoice_format as string) ?? "factur-x";
  const transmittedAt =
    (payload.transmitted_at as string) ??
    (payload.transmission_date as string) ??
    (payload.delivered_at as string) ??
    new Date().toISOString();

  const target = await findInvoice({ stripeInvoiceId, stripeChargeId, invoiceNumber });
  if (!target) {
    log("invoice_not_found", { stripeInvoiceId, stripeChargeId, invoiceNumber });
    return new Response(JSON.stringify({ received: true, matched: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const update: Record<string, unknown> = {
    einvoicing_status: status,
    einvoicing_pa: paName ?? target.einvoicing_pa ?? null,
    einvoicing_url: einvoiceUrl ?? target.einvoicing_url ?? null,
    einvoicing_format: format ?? target.einvoicing_format ?? "factur-x",
    einvoicing_metadata: { ...(target.einvoicing_metadata || {}), ...payload },
    updated_at: new Date().toISOString(),
  };
  if (status === "transmitted" || status === "delivered") {
    update.einvoicing_transmitted_at = transmittedAt;
  }

  const { error } = await supabase.from("invoices").update(update).eq("id", target.id);
  if (error) {
    log("update_error", { invoice: target.invoice_number, error: error.message });
    return new Response(JSON.stringify({ error: "Update failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  log("invoice_updated", {
    invoice: target.invoice_number,
    einvoicing_status: status,
    pa: paName,
  });

  return new Response(JSON.stringify({ received: true, matched: true, status }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
