import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HEX = /#([0-9a-f]{6}|[0-9a-f]{3})\b/gi;
const RGB = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi;

function rgbToHex(r: number, g: number, b: number) {
  const c = (n: number) => n.toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toLowerCase();
}
function expandHex(h: string) {
  if (h.length === 4) return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toLowerCase();
  return h.toLowerCase();
}
function luminance(hex: string) {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function extractColors(html: string) {
  const counts = new Map<string, number>();
  const bump = (h: string) => {
    if (!h) return;
    // Skip pure white, pure black, near-white, near-black
    const L = luminance(h);
    if (L > 0.97 || L < 0.03) return;
    counts.set(h, (counts.get(h) ?? 0) + 1);
  };
  const m1 = html.match(HEX) ?? [];
  for (const h of m1) bump(expandHex(h));
  const m2 = [...html.matchAll(RGB)];
  for (const [, r, g, b] of m2) bump(rgbToHex(+r, +g, +b));

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);
  // Pick a vivid (not too gray) primary
  const isVivid = (hex: string) => {
    const m = hex.replace("#", "");
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    return max - min > 30;
  };
  const primary = sorted.find(isVivid) ?? sorted[0] ?? "#2563eb";
  const accent = sorted.filter((c) => c !== primary).find(isVivid) ?? primary;

  // Background: prefer near-white or near-black (dominant non-vivid)
  const allRaw = (html.match(HEX) ?? []).map(expandHex)
    .concat([...html.matchAll(RGB)].map(([, r, g, b]) => rgbToHex(+r, +g, +b)));
  const bgCounts = new Map<string, number>();
  for (const h of allRaw) {
    const L = luminance(h);
    if (L > 0.93 || L < 0.07) bgCounts.set(h, (bgCounts.get(h) ?? 0) + 1);
  }
  const bgSorted = [...bgCounts.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);
  const background = bgSorted[0] ?? "#ffffff";
  const text = luminance(background) > 0.5 ? "#111827" : "#f9fafb";

  return { primary, accent, background, text, palette: sorted.slice(0, 6) };
}

function extractFonts(html: string): string[] {
  const fonts = new Set<string>();
  const ff = [...html.matchAll(/font-family\s*:\s*([^;}"']+)/gi)];
  for (const m of ff) {
    const parts = m[1].split(",").map((s) => s.trim().replace(/['"]/g, ""));
    for (const p of parts.slice(0, 1)) {
      if (p && !/^(inherit|sans-serif|serif|monospace|system-ui|ui-|var\()/i.test(p)) fonts.add(p);
    }
  }
  // Google Fonts links
  const gf = [...html.matchAll(/fonts\.googleapis\.com\/css2?\?family=([A-Za-z0-9+_-]+)/gi)];
  for (const m of gf) fonts.add(m[1].replace(/\+/g, " "));
  return [...fonts].slice(0, 3);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { url, website_id } = await req.json();
    let targetUrl: string | null = url ?? null;

    if (!targetUrl && website_id) {
      const supa = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data, error } = await supa.from("websites").select("url").eq("id", website_id).maybeSingle();
      if (error) throw error;
      targetUrl = data?.url ?? null;
    }
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "url or website_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = `https://${targetUrl}`;

    const res = await fetch(targetUrl, { headers: { "User-Agent": "Mozilla/5.0 PageGenColorBot" } });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    let html = await res.text();

    // Also fetch first 2 stylesheets for richer color signal
    const cssLinks = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)]
      .map((m) => m[1]).slice(0, 2);
    for (const link of cssLinks) {
      try {
        const cssUrl = new URL(link, targetUrl).toString();
        const cssRes = await fetch(cssUrl);
        if (cssRes.ok) html += "\n" + (await cssRes.text());
      } catch { /* ignore */ }
    }

    const colors = extractColors(html);
    const fonts = extractFonts(html);

    return new Response(
      JSON.stringify({ url: targetUrl, colors, fonts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("extract-site-colors error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
