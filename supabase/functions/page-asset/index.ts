// Public, unauthenticated delivery endpoint for published-page design assets.
//
// v1 publishing is HTML/CSS/JS only: the generated page's CSS and JS are stored
// once (content-addressed) and referenced from the published HTML with real
// <link rel="stylesheet"> / <script src> tags. CMS platforms (WordPress
// wp_kses_post, Shopify body_html sanitizer) strip inline <style>/<script>, but
// external files loaded from a stable URL always render, so the live page looks
// exactly like the preview.
//
// URL shape: /functions/v1/page-asset/<hash>.css  |  /<hash>.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const file = url.pathname.split("/").filter(Boolean).pop() || "";
    const match = file.match(/^([a-f0-9]{8,64})\.(css|js)$/i);
    const hash = match ? match[1].toLowerCase() : (url.searchParams.get("h") || "").toLowerCase();
    const kind = match ? match[2].toLowerCase() : (url.searchParams.get("k") || "").toLowerCase();

    if (!/^[a-f0-9]{8,64}$/.test(hash) || (kind !== "css" && kind !== "js")) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("page_assets")
      .select("content")
      .eq("hash", hash)
      .eq("kind", kind)
      .maybeSingle();

    if (error) {
      console.error("page-asset lookup failed", error.message);
      return new Response("Lookup failed", { status: 500, headers: corsHeaders });
    }
    if (!data) return new Response("Not found", { status: 404, headers: corsHeaders });

    return new Response(req.method === "HEAD" ? null : data.content, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": kind === "css" ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8",
        // Content-addressed → safe to cache forever.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("page-asset error", e);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});
