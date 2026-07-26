/**
 * Admin-only management of AI provider API keys.
 *
 * GET  → { active_provider, providers: [{ id, name, has_key, key_preview, default_model, enabled, docs_url }] }
 * POST → { action: "save-key" | "delete-key" | "set-active", provider, api_key?, default_model?, enabled? }
 *
 * Keys are stored in public.ai_provider_keys (service-role only; no client access).
 * The active provider is stored in system_settings.ai_provider (id = 'global').
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROVIDERS: Record<string, { name: string; keyEnv: string; docsUrl: string; defaultModel: string }> = {
  lovable: { name: "Lovable AI (Default)", keyEnv: "LOVABLE_API_KEY", docsUrl: "", defaultModel: "google/gemini-2.5-flash" },
  openai: { name: "OpenAI", keyEnv: "OPENAI_API_KEY", docsUrl: "https://platform.openai.com/api-keys", defaultModel: "gpt-4o-mini" },
  gemini: { name: "Google Gemini", keyEnv: "GEMINI_API_KEY", docsUrl: "https://aistudio.google.com/apikey", defaultModel: "gemini-2.5-flash" },
  groq: { name: "Groq", keyEnv: "GROQ_API_KEY", docsUrl: "https://console.groq.com/keys", defaultModel: "llama-3.3-70b-versatile" },
  deepseek: { name: "DeepSeek", keyEnv: "DEEPSEEK_API_KEY", docsUrl: "https://platform.deepseek.com/api_keys", defaultModel: "deepseek-chat" },
  openrouter: { name: "OpenRouter", keyEnv: "OPENROUTER_API_KEY", docsUrl: "https://openrouter.ai/keys", defaultModel: "openai/gpt-4o-mini" },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function preview(key: string | null | undefined) {
  if (!key) return null;
  const k = key.trim();
  if (k.length <= 8) return "••••";
  return `${k.slice(0, 4)}••••${k.slice(-4)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden: platform admin role required" }, 403);

    const loadState = async () => {
      const { data: settings } = await sb
        .from("system_settings")
        .select("ai_provider, ai_provider_design, ai_provider_content")
        .eq("id", "global")
        .maybeSingle();
      const { data: rows } = await sb.from("ai_provider_keys").select("*");
      const byProvider = new Map((rows || []).map((r: any) => [r.provider, r]));
      const active = (settings?.ai_provider || "lovable").toLowerCase();
      const norm = (v: any) => {
        const s = String(v || "").toLowerCase().trim();
        return PROVIDERS[s] ? s : null;
      };
      const routing = {
        design: norm((settings as any)?.ai_provider_design) || active,
        content: norm((settings as any)?.ai_provider_content) || active,
        split_enabled: !!(norm((settings as any)?.ai_provider_design) || norm((settings as any)?.ai_provider_content)),
      };

      const providers = Object.entries(PROVIDERS).map(([id, info]) => {
        const row: any = byProvider.get(id);
        const envKey = Deno.env.get(info.keyEnv);
        return {
          id,
          name: info.name,
          docs_url: info.docsUrl,
          key_env: info.keyEnv,
          default_model: row?.default_model || info.defaultModel,
          enabled: row?.enabled !== false,
          has_key: id === "lovable" ? !!envKey : !!(row?.api_key || envKey),
          key_source: row?.api_key ? "admin" : envKey ? "secret" : null,
          key_preview: preview(row?.api_key) ?? (envKey ? "•••• (project secret)" : null),
          updated_at: row?.updated_at ?? null,
          active: active === id,
        };
      });

      return { active_provider: active, routing, providers };
    };

    if (req.method === "GET") return json(await loadState());


    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const action = String(body.action || "");
      const provider = String(body.provider || "").toLowerCase().trim();

      if (!PROVIDERS[provider]) return json({ error: "Unknown provider" }, 400);

      if (action === "save-key") {
        const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : "";
        if (provider === "lovable") {
          return json({ error: "Lovable AI uses the built-in project key — no API key needed." }, 400);
        }
        if (apiKey && apiKey.length < 8) return json({ error: "API key looks too short." }, 400);

        const payload: Record<string, unknown> = {
          provider,
          default_model: body.default_model || PROVIDERS[provider].defaultModel,
          enabled: body.enabled !== false,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        };
        if (apiKey) payload.api_key = apiKey;

        const { error } = await sb.from("ai_provider_keys").upsert(payload, { onConflict: "provider" });
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, ...(await loadState()) });
      }

      if (action === "delete-key") {
        const { error } = await sb.from("ai_provider_keys").delete().eq("provider", provider);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, ...(await loadState()) });
      }

      if (action === "set-active") {
        if (provider !== "lovable") {
          const { data: row } = await sb
            .from("ai_provider_keys")
            .select("api_key, enabled")
            .eq("provider", provider)
            .maybeSingle();
          const hasKey = !!row?.api_key || !!Deno.env.get(PROVIDERS[provider].keyEnv);
          if (!hasKey) {
            return json({ error: `Add an API key for ${PROVIDERS[provider].name} before activating it.` }, 400);
          }
        }

        const { error } = await sb
          .from("system_settings")
          .upsert({ id: "global", ai_provider: provider, updated_at: new Date().toISOString() }, { onConflict: "id" });
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, ...(await loadState()) });
      }

      return json({ error: "Unknown action" }, 400);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err: any) {
    console.error("[admin-ai-providers]", err);
    return json({ error: err?.message || "Unexpected error" }, 500);
  }
});
