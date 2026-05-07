/**
 * Edge function: manage-config
 *
 * GET  ?workspace_id=...           → list all config entries for a workspace
 * POST { workspace_id, key, value, is_secret? } → upsert a config entry
 * DELETE { workspace_id, key }     → remove a config entry
 *
 * Reads/writes from public.app_config table.
 * Falls back gracefully if the table doesn't exist yet.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Well-known config keys the admin UI can set. */
const ALLOWED_KEYS = [
  "AI_PROVIDER",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "GROQ_API_KEY",
  "DEEPSEEK_API_KEY",
  "OPENROUTER_API_KEY",
  "APP_URL",
  "ENVIRONMENT",
  "SHOPIFY_REDIRECT_URI",
];

const SECRET_KEYS = new Set([
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "GROQ_API_KEY",
  "DEEPSEEK_API_KEY",
  "OPENROUTER_API_KEY",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
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

    // ── Helper: verify caller is workspace owner or admin ────────────────
    async function requireAdmin(workspaceId: string): Promise<Response | null> {
      const { data: role } = await sb.rpc("get_workspace_role", {
        _user_id: user!.id,
        _workspace_id: workspaceId,
      });
      if (!role || !["owner", "admin"].includes(role)) {
        return new Response(
          JSON.stringify({ error: "Forbidden: must be workspace owner or admin" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return null;
    }

    // ── GET ─────────────────────────────────────────────────────────────────
    if (req.method === "GET") {
      const url = new URL(req.url);
      const workspaceId = url.searchParams.get("workspace_id");
      if (!workspaceId) {
        return new Response(JSON.stringify({ error: "workspace_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const forbidden = await requireAdmin(workspaceId);
      if (forbidden) return forbidden;

      const { data: rows, error } = await sb
        .from("app_config")
        .select("config_key, config_value, is_secret, updated_at")
        .eq("workspace_id", workspaceId)
        .order("config_key");

      if (error) {
        // Table might not exist yet
        console.warn("[manage-config] read error:", error.message);
        return new Response(
          JSON.stringify({
            configs: ALLOWED_KEYS.map((k) => ({
              key: k,
              value: "",
              is_secret: SECRET_KEYS.has(k),
              source: "env",
              env_value: SECRET_KEYS.has(k)
                ? (Deno.env.get(k) ? "••••••••" : "")
                : (Deno.env.get(k) ?? ""),
            })),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const rowMap = new Map(rows?.map((r: any) => [r.config_key, r]) ?? []);

      const configs = ALLOWED_KEYS.map((k) => {
        const row = rowMap.get(k) as any;
        const isSecret = SECRET_KEYS.has(k);
        const envVal = Deno.env.get(k) ?? "";

        if (row) {
          return {
            key: k,
            value: isSecret ? "••••••••" : row.config_value,
            has_override: true,
            is_secret: isSecret,
            source: "database",
            env_value: isSecret ? (envVal ? "••••••••" : "") : envVal,
            updated_at: row.updated_at,
          };
        }

        return {
          key: k,
          value: "",
          has_override: false,
          is_secret: isSecret,
          source: "env",
          env_value: isSecret ? (envVal ? "••••••••" : "") : envVal,
          updated_at: null,
        };
      });

      return new Response(JSON.stringify({ configs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── POST (upsert) ───────────────────────────────────────────────────────
    if (req.method === "POST") {
      const body = await req.json();
      const { workspace_id, key, value } = body;

      if (!workspace_id || !key || value === undefined) {
        return new Response(
          JSON.stringify({ error: "workspace_id, key, and value are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const forbidden = await requireAdmin(workspace_id);
      if (forbidden) return forbidden;

      if (!ALLOWED_KEYS.includes(key)) {
        return new Response(
          JSON.stringify({ error: `Invalid config key. Allowed: ${ALLOWED_KEYS.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Validate AI_PROVIDER value
      if (key === "AI_PROVIDER") {
        const validProviders = ["lovable", "openai", "gemini", "groq", "deepseek", "openrouter"];
        if (!validProviders.includes(value.toLowerCase().trim())) {
          return new Response(
            JSON.stringify({ error: `Invalid provider. Must be one of: ${validProviders.join(", ")}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      const { error } = await sb.from("app_config").upsert(
        {
          workspace_id,
          config_key: key,
          config_value: value,
          is_secret: SECRET_KEYS.has(key),
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,config_key" },
      );

      if (error) {
        console.error("[manage-config] upsert error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: `Config "${key}" updated successfully.` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (req.method === "DELETE") {
      const body = await req.json();
      const { workspace_id, key } = body;

      if (!workspace_id || !key) {
        return new Response(
          JSON.stringify({ error: "workspace_id and key are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const forbidden = await requireAdmin(workspace_id);
      if (forbidden) return forbidden;

      const { error } = await sb.from("app_config").delete()
        .eq("workspace_id", workspace_id)
        .eq("config_key", key);

      if (error) {
        console.error("[manage-config] delete error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: `Config "${key}" reset to environment default.` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[manage-config] error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
