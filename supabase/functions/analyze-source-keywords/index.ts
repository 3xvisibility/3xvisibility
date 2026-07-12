import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiGenerate, extractAuthToken } from "../_shared/ai-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Analyzes a source — either an existing website URL or a new-business
 * niche/category — and returns the best business description, keywords,
 * spintax terms and target locations to feed the AI page generator.
 *
 * Body: { mode: "website" | "niche", url?, niche?, category?, brand?, language? }
 * Returns: { businessDescription, keywords[], terms[], locations[] }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { mode, url, niche, category, brand, language } = body ?? {};

    let sourceContext = "";

    if (mode === "website") {
      if (!url || typeof url !== "string") {
        return new Response(JSON.stringify({ error: "A website URL is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch the live public HTML and extract readable text.
      let text = "";
      try {
        const target = url.startsWith("http") ? url : `https://${url}`;
        const res = await fetch(target, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; 3xVisibilityBot/1.0)" },
          redirect: "follow",
        });
        const html = await res.text();
        text = html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&[a-z]+;/gi, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 6000);
      } catch (e) {
        return new Response(
          JSON.stringify({ error: `Could not fetch the website: ${e instanceof Error ? e.message : "unknown error"}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!text) {
        return new Response(JSON.stringify({ error: "No readable content found on that website." }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      sourceContext = `EXISTING WEBSITE URL: ${url}\n\nWEBSITE CONTENT (extracted text):\n${text}`;
    } else {
      // New business — base everything on the niche / category / brand.
      if (!niche && !category) {
        return new Response(JSON.stringify({ error: "Provide a niche or category." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      sourceContext = `NEW BUSINESS PROFILE:\nBrand: ${brand || "(not provided)"}\nNiche: ${niche || "(not provided)"}\nCategory: ${category || "(not provided)"}`;
    }

    const systemPrompt = `You are an expert SEO strategist. Analyze the provided source and produce the strongest keyword strategy for generating high-ranking landing pages.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "businessDescription": "1-2 sentence clear description of the business, its offering and audience",
  "keywords": ["primary keyword", "..."],   // 8-15 high-intent SEO keywords, ordered by value
  "terms": ["service or product term", "..."], // 6-12 spintax/variation terms (services, product types) usable as {term} variables
  "locations": ["City ST", "..."]           // 0-8 realistic target locations if the source implies a location; empty array otherwise
}
Language for all output: ${language || "en"}.`;

    const result = await aiGenerate({
      authToken: extractAuthToken(req),
      promptType: "seo_optimization",
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: sourceContext },
      ],
    });

    if (!result.success) {
      const statusCode = result.content.includes("429") ? 429 : result.content.includes("402") ? 402 : 500;
      return new Response(JSON.stringify({ error: result.content }), {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any = {};
    try {
      const cleaned = result.content.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(JSON.stringify({ error: "AI returned an unexpected format. Please try again." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        businessDescription: typeof parsed.businessDescription === "string" ? parsed.businessDescription : "",
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.filter((k: unknown) => typeof k === "string") : [],
        terms: Array.isArray(parsed.terms) ? parsed.terms.filter((k: unknown) => typeof k === "string") : [],
        locations: Array.isArray(parsed.locations) ? parsed.locations.filter((k: unknown) => typeof k === "string") : [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("analyze-source-keywords error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
