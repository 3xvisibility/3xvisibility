import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, description, url, tone, length } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const lengthGuide: Record<string, string> = {
      short: "1-2 sentences, under 100 characters",
      medium: "2-3 sentences, around 150-200 characters",
      long: "3-5 sentences, around 250-300 characters",
    };

    const toneGuide: Record<string, string> = {
      professional: "formal, authoritative, trustworthy",
      casual: "friendly, conversational, approachable",
      marketing: "persuasive, action-oriented, exciting with a call-to-action",
    };

    const systemPrompt = `You are a social media copywriter. Generate engaging social media captions for sharing web pages.
Rules:
- Tone: ${toneGuide[tone] || toneGuide.professional}
- Length: ${lengthGuide[length] || lengthGuide.medium}
- Include relevant emojis
- Do NOT include the URL in the caption (it will be added separately)
- Do NOT use hashtags unless specifically relevant
- Return ONLY the caption text, no quotes or extra formatting`;

    const userPrompt = `Generate a social media caption for this page:
Title: ${title}
${description ? `Description: ${description}` : ""}
${url ? `URL: ${url}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ caption }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-caption error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
