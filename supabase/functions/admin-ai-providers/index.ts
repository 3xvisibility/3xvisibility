import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUILTIN_PROVIDERS: Record<string, { name: string; keyEnv: string; docsUrl: string; defaultModel: string; baseUrl: string }> = {
  lovable: { name: "Lovable AI (Default)", keyEnv: "LOVABLE_API_KEY", docsUrl: "", defaultModel: "google/gemini-2.5-flash", baseUrl: "https://ai.gateway.lovable.dev/v1" },
  openai: { name: "OpenAI", keyEnv: "OPENAI_API_KEY", docsUrl: "https://platform.openai.com/api-keys", defaultModel: "gpt-4o-mini", baseUrl: "https://api.openai.com/v1" },
  gemini: { name: "Google Gemini", keyEnv: "GEMINI_API_KEY", docsUrl: "https://aistudio.google.com/apikey", defaultModel: "gemini-2.5-flash", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" },
  groq: { name: "Groq", keyEnv: "GROQ_API_KEY", docsUrl: "https://console.groq.com/keys", defaultModel: "llama-3.3-70b-versatile", baseUrl: "https://api.groq.com/openai/v1" },
  deepseek: { name: "DeepSeek", keyEnv: "DEEPSEEK_API_KEY", docsUrl: "https://platform.deepseek.com/api_keys", defaultModel: "deepseek-chat", baseUrl: "https://api.deepseek.com/v1" },
  openrouter: { name: "OpenRouter", keyEnv: "OPENROUTER_API_KEY", docsUrl: "https://openrouter.ai/keys", defaultModel: "openai/gpt-4o-mini", baseUrl: "https://openrouter.ai/api/v1" },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function preview(key: string | null | undefined) {
  if (!key) return null;
  const k = key.trim();
  if (k.length <= 8) return "\u2022\u2022\u2022\u2022";
  return `${k.slice(0, 4)}\u2022\u2022\u2022\u2022${k.slice(-4)}`;
}

async function fetchModels(baseUrl: string, apiKey: string): Promise<string[]> {
  try {
    const url = `${baseUrl.replace(/\/+$/, "")}/models`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    return list
      .map((m: any) => m.id || m.name || "")
      .filter(Boolean)
      .sort();
  } catch {
    return [];
  }
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

      const allIds = new Set([...Object.keys(BUILTIN_PROVIDERS), ...(rows || []).map((r: any) => r.provider)]);

      const providers = [...allIds].map((id) => {
        const builtin = BUILTIN_PROVIDERS[id];
        const row: any = byProvider.get(id);
        const envKey = builtin ? Deno.env.get(builtin.keyEnv) : null;
        const apiKey = row?.api_key || envKey || null;
        const isCustom = !builtin;

        return {
          id,
          name: row?.provider_name || builtin?.name || id,
          provider_name: row?.provider_name || builtin?.name || id,
          base_url: row?.base_url || builtin?.baseUrl || "",
          docs_url: builtin?.docsUrl || "",
          key_env: builtin?.keyEnv || "",
          default_model: row?.default_model || builtin?.defaultModel || "",
          models: Array.isArray(row?.models) ? row.models : [],
          enabled: row?.enabled !== false,
          has_key: id === "lovable" ? !!envKey : !!apiKey,
          key_source: row?.api_key ? "admin" : envKey ? "secret" : null,
          key_preview: preview(row?.api_key) ?? (envKey ? "\u2022\u2022\u2022\u2022 (project secret)" : null),
          updated_at: row?.updated_at ?? null,
          active: active === id,
          is_custom: isCustom,
        };
      });

      const norm = (v: any) => {
        const s = String(v || "").toLowerCase().trim();
        return allIds.has(s) ? s : null;
      };
      const routing = {
        design: norm((settings as any)?.ai_provider_design) || "inherit",
        content: norm((settings as any)?.ai_provider_content) || "inherit",
        split_enabled: !!(norm((settings as any)?.ai_provider_design) || norm((settings as any)?.ai_provider_content)),
      };

      return { active_provider: active, routing, providers };
    };

    if (req.method === "GET") return json(await loadState());

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const action = String(body.action || "");

      if (action === "fetch-models") {
        const baseUrl = String(body.base_url || "").trim();
        const apiKey = String(body.api_key || "").trim();
        if (!baseUrl || !apiKey) return json({ error: "base_url and api_key are required" }, 400);
        const models = await fetchModels(baseUrl, apiKey);
        return json({ models });
      }

      if (action === "set-routing") {
        const state = await loadState();
        const validIds = new Set(state.providers.map((p) => p.id));
        const norm = (v: unknown) => {
          const s = String(v ?? "").toLowerCase().trim();
          if (!s || s === "inherit") return null;
          if (!validIds.has(s)) throw new Error(`Unknown provider "${s}"`);
          return s;
        };
        let design: string | null;
        let content: string | null;
        try {
          design = norm(body.design);
          content = norm(body.content);
        } catch (e: any) {
          return json({ error: e.message }, 400);
        }

        for (const p of [design, content]) {
          if (!p || p === "lovable") continue;
          const prov = state.providers.find((x) => x.id === p);
          if (!prov?.has_key) {
            return json({ error: `Add an API key for ${prov?.name || p} before routing traffic to it.` }, 400);
          }
        }

        const { error } = await sb.from("system_settings").upsert(
          {
            id: "global",
            ai_provider_design: design,
            ai_provider_content: content,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, ...(await loadState()) });
      }

      const provider = String(body.provider || "").toLowerCase().trim();
      if (!provider) return json({ error: "provider is required" }, 400);

      if (action === "add-provider" || action === "save-key") {
        const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : "";
        const baseUrl = typeof body.base_url === "string" ? body.base_url.trim() : "";
        const providerName = typeof body.provider_name === "string" ? body.provider_name.trim() : "";
        const defaultModel = typeof body.default_model === "string" ? body.default_model.trim() : "";
        const models = Array.isArray(body.models) ? body.models : [];

        if (provider === "lovable") {
          return json({ error: "Lovable AI uses the built-in project key." }, 400);
        }
        if (action === "add-provider" && !baseUrl) {
          return json({ error: "Base URL is required for custom providers." }, 400);
        }
        if (apiKey && apiKey.length < 8) return json({ error: "API key looks too short." }, 400);

        const payload: Record<string, unknown> = {
          provider,
          enabled: body.enabled !== false,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        };
        if (apiKey) payload.api_key = apiKey;
        if (baseUrl) payload.base_url = baseUrl;
        if (providerName) payload.provider_name = providerName;
        if (defaultModel) payload.default_model = defaultModel;
        if (models.length > 0) payload.models = models;

        const { error } = await sb.from("ai_provider_keys").upsert(payload, { onConflict: "provider" });
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, ...(await loadState()) });
      }

      if (action === "delete-provider" || action === "delete-key") {
        if (provider === "lovable") return json({ error: "Cannot delete built-in Lovable provider." }, 400);
        const { error } = await sb.from("ai_provider_keys").delete().eq("provider", provider);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, ...(await loadState()) });
      }

      if (action === "set-active") {
        const state = await loadState();
        const prov = state.providers.find((p) => p.id === provider);
        if (!prov) return json({ error: "Unknown provider" }, 400);
        if (provider !== "lovable" && !prov.has_key) {
          return json({ error: `Add an API key for ${prov.name} before activating it.` }, 400);
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