import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

function buildSystemPrompt(tone: string, length: string) {
  return `You are a social media copywriter. Generate engaging social media captions for sharing web pages.
Rules:
- Tone: ${toneGuide[tone] || toneGuide.professional}
- Length: ${lengthGuide[length] || lengthGuide.medium}
- Include relevant emojis
- Do NOT include the URL in the caption (it will be added separately)
- Do NOT use hashtags unless specifically relevant
- Return ONLY the caption text, no quotes or extra formatting`;
}

async function generateSingle(
  apiKey: string,
  title: string,
  description: string,
  url: string,
  tone: string,
  length: string
): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: buildSystemPrompt(tone, length) },
        {
          role: "user",
          content: `Generate a social media caption for this page:\nTitle: ${title}${description ? `\nDescription: ${description}` : ""}${url ? `\nURL: ${url}` : ""}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("RATE_LIMIT");
    if (response.status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error("AI generation failed");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const tone = body.tone || "professional";
    const length = body.length || "medium";

    // Bulk mode: pages array
    if (body.pages && Array.isArray(body.pages)) {
      const results: { id: string; title: string; caption: string; error?: string }[] = [];

      for (const page of body.pages) {
        try {
          const caption = await generateSingle(
            LOVABLE_API_KEY,
            page.title || "",
            page.description || "",
            page.url || "",
            tone,
            length
          );
          results.push({ id: page.id, title: page.title, caption });
        } catch (e) {
          if (e instanceof Error && e.message === "RATE_LIMIT") {
            return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later.", partial_results: results }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (e instanceof Error && e.message === "PAYMENT_REQUIRED") {
            return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage.", partial_results: results }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          results.push({ id: page.id, title: page.title, caption: "", error: (e as Error).message });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single mode (backward compatible)
    const caption = await generateSingle(
      LOVABLE_API_KEY,
      body.title || "",
      body.description || "",
      body.url || "",
      tone,
      length
    );

    return new Response(JSON.stringify({ caption }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "RATE_LIMIT") {
      return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (e instanceof Error && e.message === "PAYMENT_REQUIRED") {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("generate-caption error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
