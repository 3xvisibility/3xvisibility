/**
 * Centralized edge-function environment configuration.
 *
 * All Deno.env.get() calls for Supabase infra and AI provider keys are
 * funneled through this module. To migrate or redeploy, update the
 * environment variables in Lovable Cloud secrets — no code changes needed.
 *
 * Import:
 *   import { edgeConfig } from "../_shared/config.ts";
 */

// ── helpers ──────────────────────────────────────────────────────────────────

function env(key: string, fallback?: string): string {
  return Deno.env.get(key) ?? fallback ?? "";
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
    url: requireEnv("SUPABASE_URL"),
    anonKey: requireEnv("SUPABASE_ANON_KEY"),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  },

  ai: {
    /** Active provider name (lowercase). Defaults to "lovable". */
    provider: (env("AI_PROVIDER", "lovable")).toLowerCase().trim(),

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
    keys: {
      lovable: env("LOVABLE_API_KEY"),
      openai: env("OPENAI_API_KEY"),
      gemini: env("GEMINI_API_KEY"),
      groq: env("GROQ_API_KEY"),
      deepseek: env("DEEPSEEK_API_KEY"),
    },
  },

  stripe: {
    secretKey: env("STRIPE_SECRET_KEY"),
  },

  /** Application base URL for links in emails, webhooks, etc. */
  appUrl: env("APP_URL", env("SUPABASE_URL").replace(".supabase.co", "")),
} as const;

// ── validation helper (call in entry-point if strict checks are wanted) ──────

export function validateEdgeConfig(required: (keyof typeof edgeConfig.supabase)[] = ["url", "serviceRoleKey"]): void {
  const missing = required.filter((k) => !edgeConfig.supabase[k]);
  if (missing.length) {
    throw new Error(`[edgeConfig] Missing Supabase env vars: ${missing.join(", ")}`);
  }
}
