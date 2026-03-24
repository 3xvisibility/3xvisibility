import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createConnector } from "../_shared/connectors/factory.ts";
import type { WebsiteRecord } from "../_shared/connectors/factory.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { website_id, content_type } = await req.json();
    if (!website_id) {
      return new Response(JSON.stringify({ error: "website_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: website, error: wsError } = await supabase
      .from("websites")
      .select("*")
      .eq("id", website_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (wsError || !website) {
      return new Response(JSON.stringify({ error: "Website not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = website.url.replace(/\/$/, "");
    const fullUrl = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
    const hostname = new URL(fullUrl).hostname;

    const type = content_type || "pages";

    // Return demo data for placeholder / example domains so users can test the UI
    if (hostname.endsWith("example.com") || hostname.endsWith("example.org") || hostname.endsWith("example.net")) {
      console.log(`Returning demo ${type} for placeholder domain ${hostname}`);
      const demoPages = [
        { id: "demo-1", title: "Home Page", slug: "home", url: `${fullUrl}/home`, type: "page" as const, status: "publish", content: "<h1>Welcome to Our Clinic</h1><p>We provide the best {service} in {city}.</p>", excerpt: "Welcome to our clinic", modified: new Date().toISOString() },
        { id: "demo-2", title: "About Us", slug: "about", url: `${fullUrl}/about`, type: "page" as const, status: "publish", content: "<h1>About Us</h1><p>Learn more about our {service} team in {city}, {state}.</p>", excerpt: "About our team", modified: new Date().toISOString() },
        { id: "demo-3", title: "Services", slug: "services", url: `${fullUrl}/services`, type: "page" as const, status: "publish", content: "<h1>Our Services</h1><p>We offer {service} including {specialty} in the {city} area.</p>", excerpt: "Our services", modified: new Date().toISOString() },
        { id: "demo-4", title: "Contact", slug: "contact", url: `${fullUrl}/contact`, type: "page" as const, status: "publish", content: "<h1>Contact Us</h1><p>Visit us at {address}, {city}, {state} {zip_code}. Call {phone}.</p>", excerpt: "Contact information", modified: new Date().toISOString() },
        { id: "demo-5", title: "Testimonials", slug: "testimonials", url: `${fullUrl}/testimonials`, type: "page" as const, status: "publish", content: "<h1>Testimonials</h1><p>See what our {city} patients say about our {service}.</p>", excerpt: "Patient testimonials", modified: new Date().toISOString() },
      ];
      const demoProducts = [
        { id: "demo-p1", title: "Basic Package", slug: "basic-package", url: `${fullUrl}/product/basic-package`, type: "product" as const, status: "publish", content: "<h1>Basic {service} Package</h1><p>Starting at {price}. Available in {city}.</p>", excerpt: "Basic service package", modified: new Date().toISOString() },
        { id: "demo-p2", title: "Premium Package", slug: "premium-package", url: `${fullUrl}/product/premium-package`, type: "product" as const, status: "publish", content: "<h1>Premium {service} Package</h1><p>Our best offering at {price}. SKU: {sku}.</p>", excerpt: "Premium service package", modified: new Date().toISOString() },
      ];
      const items = type === "products" ? demoProducts : demoPages;
      return new Response(
        JSON.stringify({ success: true, items, total: items.length, demo: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      const record: WebsiteRecord = {
        url: baseUrl,
        type: website.type,
        credentials: website.credentials as Record<string, string> | null,
      };
      const connector = await createConnector(record);
      const items = await connector.listContent(type);

      console.log(`Fetched ${items.length} ${type} from ${website.name}`);

      return new Response(
        JSON.stringify({ success: true, items, total: items.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchErr: any) {
      const msg = fetchErr?.message || "";
      if (msg.includes("dns error") || msg.includes("failed to lookup address")) {
        return new Response(
          JSON.stringify({ error: `Could not connect to "${hostname}". Please verify the website URL is correct and the site is online.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw fetchErr;
    }
  } catch (err: any) {
    console.error("fetch-site-content error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to fetch site content" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
