import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const APP_ORIGIN = Deno.env.get("APP_ORIGIN") ?? "https://3xvisibility.com";
const YEAR_SECONDS = 60 * 60 * 24 * 365;

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const service = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden: admin role required" }, 403);

    const body = await req.json().catch(() => ({}));
    const invoiceId = String(body.invoiceId ?? "");
    const pdfBase64 = String(body.pdfBase64 ?? "");
    const notify = body.notify !== false;

    if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return json({ error: "Invalid invoiceId" }, 400);
    if (!pdfBase64 || pdfBase64.length < 100) return json({ error: "pdfBase64 is required" }, 400);
    if (pdfBase64.length > 8_000_000) return json({ error: "PDF too large" }, 400);

    const { data: invoice, error: findErr } = await service
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();
    if (findErr) return json({ error: findErr.message }, 500);
    if (!invoice) return json({ error: "Invoice not found" }, 404);

    // ---- store the PDF ----
    const bytes = base64ToBytes(pdfBase64);
    const safeNumber = String(invoice.invoice_number).replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${invoice.user_id ?? "unassigned"}/Facture-${safeNumber}.pdf`;

    const { error: uploadErr } = await service.storage
      .from("invoices")
      .upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (uploadErr) return json({ error: `Upload failed: ${uploadErr.message}` }, 500);

    const { data: signed, error: signErr } = await service.storage
      .from("invoices")
      .createSignedUrl(path, YEAR_SECONDS);
    if (signErr) return json({ error: `Signing failed: ${signErr.message}` }, 500);

    const pdfUrl = signed?.signedUrl ?? null;
    const recipient = invoice.customer_email as string | null;

    // ---- email the customer ----
    let emailed = false;
    let emailError: string | null = null;
    if (notify && recipient) {
      const amount = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: (invoice.currency || "eur").toUpperCase(),
      }).format((invoice.amount_total || 0) / 100);

      const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          templateName: "invoice-document",
          recipientEmail: recipient,
          idempotencyKey: `invoice-pdf-${invoice.id}`,
          templateData: {
            name: invoice.customer_name ?? undefined,
            email: recipient,
            invoiceNumber: invoice.invoice_number,
            amount,
            issuedAt: invoice.issued_at,
            planName: invoice.plan ?? invoice.description ?? undefined,
            pdfUrl,
            origin: APP_ORIGIN,
          },
        }),
      });
      emailed = res.ok;
      if (!res.ok) emailError = await res.text().catch(() => "Email delivery failed");
    }

    const { error: updateErr } = await service
      .from("invoices")
      .update({
        pdf_storage_path: path,
        pdf_signed_url: pdfUrl,
        pdf_sent_at: emailed ? new Date().toISOString() : invoice.pdf_sent_at,
        pdf_sent_to: emailed ? recipient : invoice.pdf_sent_to,
      })
      .eq("id", invoiceId);
    if (updateErr) return json({ error: updateErr.message }, 500);

    return json({ success: true, pdfUrl, emailed, recipient, emailError });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
