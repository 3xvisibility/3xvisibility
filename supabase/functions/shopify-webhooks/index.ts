import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
// HMAC verification uses Web Crypto API (see below) — no external import needed.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-shopify-topic, x-shopify-hmac-sha256, x-shopify-shop-domain",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const topic = req.headers.get("x-shopify-topic") || "";
    const shopDomain = req.headers.get("x-shopify-shop-domain") || "";
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256") || "";

    if (!topic || !shopDomain) {
      return json({ error: "Missing Shopify webhook headers" }, 400);
    }

    const rawBody = await req.text();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the website by shop domain to get client_secret for HMAC verification
    const { data: websites } = await supabase
      .from("websites")
      .select("id, user_id, workspace_id, credentials")
      .eq("type", "shopify")
      .ilike("url", `%${shopDomain}%`);

    // Also check credentials->shop_domain
    let website = websites?.find((w) => {
      const creds = w.credentials as Record<string, string> | null;
      const domain = creds?.shop_domain || "";
      return domain === shopDomain || (w as any).url?.includes(shopDomain);
    });

    if (!website && websites && websites.length > 0) {
      website = websites[0];
    }

    if (!website) {
      console.warn(`No website found for shop domain: ${shopDomain}`);
      return json({ error: "Unknown shop" }, 404);
    }

    // Verify HMAC if client_secret is available
    const creds = website.credentials as Record<string, string> | null;
    if (creds?.client_secret && hmacHeader) {
      try {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(creds.client_secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
        const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
        const computed = btoa(String.fromCharCode(...new Uint8Array(signature)));
        if (computed !== hmacHeader) {
          console.warn("HMAC verification failed for", shopDomain);
          return json({ error: "Invalid HMAC" }, 401);
        }
      } catch (e) {
        console.warn("HMAC verification error:", e);
        // Continue processing even if HMAC check fails (some setups may not have secret)
      }
    }

    // Parse the product payload
    let product: Record<string, any>;
    try {
      product = JSON.parse(rawBody);
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    // Map topic to event_type
    let eventType = topic; // e.g. "products/create", "products/update"
    if (topic === "products/create") eventType = "product/create";
    else if (topic === "products/update") eventType = "product/update";
    else if (topic === "products/delete") eventType = "product/delete";

    // Insert sync event
    const { error: insertError } = await supabase
      .from("shopify_sync_events")
      .insert({
        website_id: website.id,
        workspace_id: website.workspace_id,
        user_id: website.user_id,
        shopify_product_id: product.id,
        event_type: eventType,
        product_title: product.title || null,
        details: {
          handle: product.handle,
          status: product.status,
          vendor: product.vendor,
          updated_at: product.updated_at,
          variants_count: product.variants?.length || 0,
          images_count: product.images?.length || 0,
        },
      });

    if (insertError) {
      console.error("Failed to insert sync event:", insertError);
      return json({ error: "Failed to store event" }, 500);
    }

    console.log(`Webhook processed: ${eventType} for product ${product.id} on ${shopDomain}`);
    return json({ success: true, event_type: eventType, product_id: product.id });
  } catch (err: any) {
    console.error("shopify-webhooks error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});
