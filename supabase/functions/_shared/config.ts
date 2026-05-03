/**
 * Centralized edge-function environment configuration.
 *
 * All Deno.env.get() calls for Supabase infra and AI provider keys are
 * funneled through this module. To migrate or redeploy, update the
 * environment variables in Lovable Cloud secrets — no code changes needed.
 *
 * Runtime overrides: admin users can set overrides in the `app_config`
 * table (per workspace). Call `loadConfigOverrides(workspaceId)` to
 * activate them for the current request. Values from the DB take priority
 * over environment variables.
 *
 * Import:
 *   import { edgeConfig, loadConfigOverrides } from "../_shared/config.ts";
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// ── override cache ───────────────────────────────────────────────────────────

let _overrides: Record<string, string> = {};

/**
 * Load config overrides from the app_config table for a workspace.
 * Call once at the start of a request when workspace_id is known.
 * Fails silently if the table doesn't exist yet.
 */
export async function loadConfigOverrides(workspaceId: string): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;

    const sb = createClient(url, key);
    const { data, error } = await sb
      .from("app_config")
      .select("config_key, config_value")
      .eq("workspace_id", workspaceId);

    if (error) {
      console.warn("[edgeConfig] Failed to load overrides:", error.message);
      return;
    }

    _overrides = {};
    for (const row of data ?? []) {
      _overrides[row.config_key] = row.config_value;
    }
  } catch (e) {
    console.warn("[edgeConfig] Override load error:", e);
  }
}

/** Clear any loaded overrides (useful between requests in long-lived workers). */
export function clearConfigOverrides(): void {
  _overrides = {};
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Get a config value: DB override → env var → fallback. */
function env(key: string, fallback?: string): string {
  return _overrides[key] ?? Deno.env.get(key) ?? fallback ?? "";
}

function requireEnv(key: string): string {
  const val = env(key);
  if (!val) {
    console.warn(`[edgeConfig] Missing required env var: ${key}`);
  }
  return val;
}

// ── AI provider registry ─────────────────────────────────────────────────────

export interface AiProviderInfo {
  label: string;
  keyEnv: string;
  baseUrl: string;
}

export const AI_PROVIDERS: Record<string, AiProviderInfo> = {
  lovable: {
    label: "Lovable AI",
    keyEnv: "LOVABLE_API_KEY",
    baseUrl: "https://api.lovable.dev/v1",
  },
  openai: {
    label: "OpenAI",
    keyEnv: "OPENAI_API_KEY",
    baseUrl: "https://api.openai.com/v1",
  },
  gemini: {
    label: "Google Gemini",
    keyEnv: "GEMINI_API_KEY",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  },
  groq: {
    label: "Groq",
    keyEnv: "GROQ_API_KEY",
    baseUrl: "https://api.groq.com/openai/v1",
  },
  deepseek: {
    label: "DeepSeek",
    keyEnv: "DEEPSEEK_API_KEY",
    baseUrl: "https://api.deepseek.com/v1",
  },
};

// ── structured config ────────────────────────────────────────────────────────

export const edgeConfig = {
  supabase: {
    get url() { return requireEnv("SUPABASE_URL"); },
    get anonKey() { return requireEnv("SUPABASE_ANON_KEY"); },
    get serviceRoleKey() { return requireEnv("SUPABASE_SERVICE_ROLE_KEY"); },
  },

  ai: {
    /** Active provider name (lowercase). Defaults to "lovable". */
    get provider() {
      return (env("AI_PROVIDER", "lovable")).toLowerCase().trim();
    },

    /** Shortcut: API key for the active provider. */
    get activeKey(): string {
      const info = AI_PROVIDERS[this.provider] ?? AI_PROVIDERS.lovable;
      return env(info.keyEnv);
    },

    /** Shortcut: base URL for the active provider. */
    get activeBaseUrl(): string {
      const info = AI_PROVIDERS[this.provider] ?? AI_PROVIDERS.lovable;
      return info.baseUrl;
    },

    /** Individual keys — use when you need a specific provider regardless of active. */
    get keys() {
      return {
        lovable: env("LOVABLE_API_KEY"),
        openai: env("OPENAI_API_KEY"),
        gemini: env("GEMINI_API_KEY"),
        groq: env("GROQ_API_KEY"),
        deepseek: env("DEEPSEEK_API_KEY"),
      };
    },
  },

  stripe: {
    get secretKey() { return env("STRIPE_SECRET_KEY"); },
  },

  /** Application base URL for links in emails, webhooks, etc. */
  get appUrl() {
    return env("APP_URL", env("SUPABASE_URL").replace(".supabase.co", ""));
  },
};

// ── validation helper (call in entry-point if strict checks are wanted) ──────

export function validateEdgeConfig(required: (keyof typeof edgeConfig.supabase)[] = ["url", "serviceRoleKey"]): void {
  const missing = required.filter((k) => !edgeConfig.supabase[k]);
  if (missing.length) {
    throw new Error(`[edgeConfig] Missing Supabase env vars: ${missing.join(", ")}`);
  }
}
