/**
 * Centralized client-side environment configuration.
 *
 * All environment variables consumed by the frontend are accessed through
 * this module. To migrate or redeploy, update the corresponding VITE_*
 * environment variables — no code changes required.
 *
 * NOTE: `src/integrations/supabase/client.ts` is auto-generated and reads
 * VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY directly.
 * This config re-exports the same values for convenience elsewhere.
 */

// ── helpers ──────────────────────────────────────────────────────────────────

function env(key: string, fallback?: string): string {
  const val = (import.meta.env as Record<string, string | undefined>)[key] ?? fallback;
  return val ?? "";
}

function requireEnv(key: string): string {
  const val = env(key);
  if (!val) {
    console.error(`[config] Missing required environment variable: ${key}`);
  }
  return val;
}

// ── structured config ────────────────────────────────────────────────────────

export const config = {
  /** Current environment */
  env: env("MODE", "development"),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,

  /** Application base URL (for absolute links, emails, etc.) */
  appUrl: env("VITE_APP_URL", typeof window !== "undefined" ? window.location.origin : ""),

  supabase: {
    url: requireEnv("VITE_SUPABASE_URL"),
    anonKey: requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY"),
    projectId: env("VITE_SUPABASE_PROJECT_ID"),
  },

  /** Client-side AI settings (provider selection is server-side via secrets) */
  ai: {
    /** Override default provider from the client — rarely needed */
    provider: env("VITE_AI_PROVIDER", "lovable"),
  },
} as const;

// ── validation (runs once at import time) ────────────────────────────────────

const REQUIRED_CLIENT_VARS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
] as const;

const missing = REQUIRED_CLIENT_VARS.filter((k) => !env(k));

if (missing.length > 0) {
  console.error(
    `[config] Missing required environment variable(s): ${missing.join(", ")}.\n` +
    `The app may not function correctly. Check your .env or deployment settings.`,
  );
}
