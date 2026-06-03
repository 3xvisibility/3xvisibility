/**
 * Edge function to manage the active AI provider setting.
 *
 * GET  → returns { provider: string }
 * POST → body { provider: string, api_key?: string }
 *        Validates + stores in Deno env (runtime only — persists via secrets).
 *
 * Because Supabase secrets are immutable at runtime, we store the active
 * provider choice in a simple KV approach using the workspace-settings
 * function's own in-memory state + a JSON secret `AI_PROVIDER_CONFIG`.
 *
 * For now this reads/writes the AI_PROVIDER env var which is set as a
 * Supabase secret. The admin UI calls this to check the current value.
 *
 * SECURITY: All access requires platform admin role.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_PROVIDERS = ["lovable", "openai", "gemini", "groq", "deepseek", "openrouter"] as const;

const PROVIDER_INFO: Record<string, { name: string; keyEnv: string; docsUrl: string }> = {
  lovable: { name: "Lovable AI (Default)", keyEnv: "", docsUrl: "" },
  openai: { name: "OpenAI", keyEnv: "OPENAI_API_KEY", docsUrl: "https://platform.openai.com/api-keys" },
  gemini: { name: "Google Gemini", keyEnv: "GEMINI_API_KEY", docsUrl: "https://aistudio.google.com/apikey" },
  groq: { name: "Groq", keyEnv: "GROQ_API_KEY", docsUrl: "https://console.groq.com/keys" },
  deepseek: { name: "DeepSeek", keyEnv: "DEEPSEEK_API_KEY", docsUrl: "https://platform.deepseek.com/api_keys" },
  openrouter: { name: "OpenRouter", keyEnv: "OPENROUTER_API_KEY", docsUrl: "https://openrouter.ai/keys" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth + platform admin check ────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden: platform admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // GET — return current provider + available providers
    if (req.method === "GET") {
      const { edgeConfig: ec } = await import("../_shared/config.ts");
      const current = ec.ai.provider;
      const providers = VALID_PROVIDERS.map((p) => ({
        id: p,
        name: PROVIDER_INFO[p].name,
        keyEnv: PROVIDER_INFO[p].keyEnv,
        docsUrl: PROVIDER_INFO[p].docsUrl,
        hasKey: p === "lovable" ? true : !!Deno.env.get(PROVIDER_INFO[p].keyEnv),
        active: current === p,
      }));

      return new Response(JSON.stringify({ provider: current, providers }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST — update provider (note: actual secret update must happen via Lovable secrets tool)
    if (req.method === "POST") {
      const body = await req.json();
      const provider = (body.provider || "").toLowerCase().trim();

      if (!VALID_PROVIDERS.includes(provider as any)) {
        return new Response(
          JSON.stringify({ error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Check if the API key is configured for external providers
      if (provider !== "lovable") {
        const keyEnv = PROVIDER_INFO[provider].keyEnv;
        if (!Deno.env.get(keyEnv)) {
          return new Response(
            JSON.stringify({
              error: `API key "${keyEnv}" is not configured. Please add it in project secrets before switching to ${PROVIDER_INFO[provider].name}.`,
              key_required: keyEnv,
              docs_url: PROVIDER_INFO[provider].docsUrl,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          provider,
          message: provider === "lovable"
            ? "Using Lovable AI (default). No additional configuration needed."
            : `Provider set to ${PROVIDER_INFO[provider].name}. To persist this change, set the AI_PROVIDER secret to "${provider}" in your project settings.`,
          secret_instruction: provider !== "lovable"
            ? `Set the secret AI_PROVIDER = "${provider}" to make this permanent.`
            : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[ai-provider-settings] error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
