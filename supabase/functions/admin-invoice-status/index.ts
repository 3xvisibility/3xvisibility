import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

const APP_ORIGIN = Deno.env.get("APP_ORIGIN") ?? "https://3xvisibility.com";

const STATUS_LABEL: Record<string, string> = {
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  voided: "Voided",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    const service = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json({ error: "Forbidden: admin role required" }, 403);

    // ---- validate input ----
    const body = await req.json().catch(() => ({}));
    const invoiceId: string = String(body.invoiceId ?? "");
    const status: string = String(body.status ?? "");
    const reason: string = String(body.reason ?? "").trim();
    const amountRefundedInput = body.amountRefunded; // in cents, optional
    const notify: boolean = body.notify !== false;

    if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return json({ error: "Invalid invoiceId" }, 400);
    if (!["refunded", "partially_refunded", "voided"].includes(status)) {
      return json({ error: "status must be refunded, partially_refunded or voided" }, 400);
    }
    if (reason.length < 3 || reason.length > 500) {
      return json({ error: "A reason between 3 and 500 characters is required" }, 400);
    }

    const { data: invoice, error: findErr } = await service
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();
    if (findErr) return json({ error: findErr.message }, 500);
    if (!invoice) return json({ error: "Invoice not found" }, 404);

    const now = new Date().toISOString();
    const total = invoice.amount_total ?? 0;
    let amountRefunded = invoice.amount_refunded ?? 0;
    if (status === "refunded") {
      amountRefunded = total;
    } else if (status === "partially_refunded") {
      const parsed = Number(amountRefundedInput);
      if (!Number.isFinite(parsed) || parsed <= 0 || parsed > total) {
        return json({ error: "amountRefunded must be between 1 and the invoice total (in cents)" }, 400);
      }
      amountRefunded = Math.round(parsed);
    }

    const update: Record<string, unknown> = {
      status,
      manual_status_reason: reason,
      manual_status_by: user.id,
      manual_status_at: now,
    };
    if (status === "voided") {
      update.voided_at = now;
    } else {
      update.amount_refunded = amountRefunded;
      update.refunded_at = now;
    }

    const { data: updated, error: updErr } = await service
      .from("invoices")
      .update(update)
      .eq("id", invoiceId)
      .select()
      .single();
    if (updErr) return json({ error: updErr.message }, 500);

    // ---- notify the customer (same channels as the Stripe-driven flow) ----
    if (notify) {
      const label = STATUS_LABEL[status] ?? status;
      if (invoice.customer_email) {
        await service.functions.invoke("send-transactional-email", {
          body: {
            templateName: "invoice-status-update",
            recipientEmail: invoice.customer_email,
            idempotencyKey: `inv-${invoiceId}-manual-${status}-${amountRefunded}`,
            templateData: {
              name: invoice.customer_name ?? undefined,
              email: invoice.customer_email,
              invoiceNumber: invoice.invoice_number,
              statusKey: status,
              statusLabel: label,
              amount: ((status === "voided" ? total : amountRefunded) / 100).toFixed(2),
              currency: invoice.currency,
              reason,
              occurredAt: now,
              origin: APP_ORIGIN,
            },
          },
          headers: { Authorization: `Bearer ${serviceKey}` },
        });
      }
      if (invoice.user_id) {
        await service.from("notifications").insert({
          user_id: invoice.user_id,
          title: `Invoice ${invoice.invoice_number}: ${label}`,
          message:
            status === "voided"
              ? `This invoice has been voided. Reason: ${reason}`
              : `${(amountRefunded / 100).toFixed(2)} ${(invoice.currency ?? "usd").toUpperCase()} has been refunded. Reason: ${reason}`,
          type: status === "voided" ? "warning" : "success",
        });
      }
    }

    return json({ success: true, invoice: updated });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
