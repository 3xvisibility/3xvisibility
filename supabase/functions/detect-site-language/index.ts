import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Map ISO codes (or locales like fr_FR) to our SITE_LANGUAGE_OPTIONS values. */
const ISO_TO_LANGUAGE: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  ar: "Arabic",
  hi: "Hindi",
  bn: "Bengali",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ru: "Russian",
  tr: "Turkish",
};

function normalizeLocale(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const code = raw.trim().toLowerCase().split(/[-_]/)[0];
  return ISO_TO_LANGUAGE[code] || null;
}

function extractLangFromHtml(html: string): string | null {
  // <html lang="fr-FR"> or <html lang="fr">
  const m = html.match(/<html[^>]*\blang\s*=\s*["']([a-zA-Z-_]+)["']/i);
  if (m) {
    const lang = normalizeLocale(m[1]);
    if (lang) return lang;
  }
  // Open Graph locale
  const og = html.match(/<meta[^>]*property\s*=\s*["']og:locale["'][^>]*content\s*=\s*["']([a-zA-Z-_]+)["']/i);
  if (og) {
    const lang = normalizeLocale(og[1]);
    if (lang) return lang;
  }
  return null;
}

async function detectWordPressLanguage(baseUrl: string, headers: HeadersInit): Promise<string | null> {
  const root = baseUrl.replace(/\/+$/, "");

  // 1. WP REST settings (requires auth, returns site language e.g. "fr_FR")
  try {
    const r = await fetch(`${root}/wp-json/wp/v2/settings`, { headers });
    if (r.ok) {
      const data = await r.json();
      const lang = normalizeLocale(data?.language);
      if (lang) return lang;
    }
  } catch { /* ignore */ }

  // 2. Public WP REST root usually exposes "lang" or no field; fallback to homepage HTML <html lang="...">
  try {
    const r = await fetch(root, { headers: { Accept: "text/html" } });
    if (r.ok) {
      const html = await r.text();
      const lang = extractLangFromHtml(html);
      if (lang) return lang;
    }
  } catch { /* ignore */ }

  return null;
}

async function detectShopifyLanguage(shopDomain: string, accessToken: string): Promise<string | null> {
  try {
    const domain = shopDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const r = await fetch(`https://${domain}/admin/api/2024-01/shop.json`, {
      headers: { "X-Shopify-Access-Token": accessToken, Accept: "application/json" },
    });
    if (r.ok) {
      const data = await r.json();
      const lang = normalizeLocale(data?.shop?.primary_locale);
      if (lang) return lang;
    }
  } catch { /* ignore */ }
  return null;
}

async function detectGenericLanguage(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { Accept: "text/html" } });
    if (!r.ok) return null;
    const html = await r.text();
    return extractLangFromHtml(html);
  } catch {
    return null;
  }
}

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

    const { url, type, credentials } = await req.json();
    if (!url || !type) {
      return new Response(JSON.stringify({ error: "url and type are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let language: string | null = null;

    if (type === "wordpress") {
      const creds = credentials || {};
      let headers: HeadersInit = { Accept: "application/json" };
      if (creds.auth_method === "jwt" && creds.jwt_token) {
        headers = { ...headers, Authorization: `Bearer ${creds.jwt_token}` };
      } else if (creds.username && creds.app_password) {
        headers = { ...headers, Authorization: `Basic ${btoa(`${creds.username}:${creds.app_password}`)}` };
      }
      language = await detectWordPressLanguage(url, headers);
    } else if (type === "shopify") {
      if (credentials?.shop_domain && credentials?.admin_api_token) {
        language = await detectShopifyLanguage(credentials.shop_domain, credentials.admin_api_token);
      }
    } else {
      language = await detectGenericLanguage(url);
    }

    return new Response(
      JSON.stringify({ success: true, language }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Detection failed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
