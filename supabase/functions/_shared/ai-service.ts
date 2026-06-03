/**
 * Centralized AI Service — multi-provider router with Lovable AI fallback.
 * Now includes automatic credit check & deduction on every AI request.
 *
 * Usage from any edge function:
 *   import { aiGenerate } from "../_shared/ai-service.ts";
 *   const result = await aiGenerate({ messages, model?, userId?, promptType? });
 *
 * Provider is selected via the AI_PROVIDER secret (default: "lovable").
 * If the chosen external provider fails, automatically falls back to Lovable AI.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { edgeConfig } from "./config.ts";

// ── Types ────────────────────────────────────────────────────────────────────

export type AiProvider = "lovable" | "openai" | "gemini" | "groq" | "deepseek" | "openrouter";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiGenerateOptions {
  messages: AiMessage[];
  model?: string;                // override per-call; otherwise provider default
  stream?: boolean;              // return raw SSE stream (Response.body)
  tools?: any[];                 // tool/function calling
  tool_choice?: any;
  response_format?: any;
  temperature?: number;
  // Credit system fields — pass these to enable credit deduction
  userId?: string;               // auth user id — if omitted, resolved from authToken
  authToken?: string;            // JWT token — used to resolve userId if not provided
  promptType?: string;           // maps to CREDIT_COSTS (e.g. "seo_optimization")
  skipCredits?: boolean;         // explicitly skip credit check (e.g. internal/system calls)
}

// ── Credit costs (mirrors ai-credits edge function) ──────────────────────────

const CREDIT_COSTS: Record<string, number> = {
  short_content: 1,
  medium_content: 2,
  full_page: 4,
  seo_optimization: 2,
  rewrite: 1,
  translation: 2,
  social_caption: 1,
  product_description: 2,
  template_scan: 2,
  default: 1,
};

// ── Credit helpers ───────────────────────────────────────────────────────────

function getServiceClient() {
  const url = edgeConfig.supabase.url;
  const key = edgeConfig.supabase.serviceRoleKey;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function logGateEvent(
  sb: any,
  userId: string | null,
  promptType: string,
  model: string | undefined,
  status: string,
  reason: string,
  details: Record<string, unknown> = {},
) {
  try {
    if (!sb) return;
    await sb.from("ai_credit_gate_logs").insert({
      user_id: userId,
      prompt_type: promptType,
      model: model || null,
      status,
      reason,
      details,
    });
  } catch (e) {
    console.warn("[ai-service] failed to log gate event:", e);
  }
}

async function checkAndDeductCredits(
  userId: string,
  promptType: string,
  model?: string,
): Promise<{ allowed: boolean; remaining?: number; error?: string }> {
  const sb = getServiceClient();
  try {
    if (!sb) {
      // Infrastructure misconfig — not an auth issue, but we can't verify credits.
      // Fail-open so AI keeps working; admins will see the log entry.
      console.error("[ai-service] No service client — fail-open");
      return { allowed: true, error: "credit_system_unavailable" };
    }

    const cost = CREDIT_COSTS[promptType] ?? CREDIT_COSTS.default;

    const { data, error } = await sb.rpc("deduct_ai_credits", {
      p_user_id: userId,
      p_credits: cost,
      p_prompt_type: promptType,
      p_model: model || null,
      p_metadata: {},
    });

    if (error) {
      const msg = (error.message || "").toLowerCase();
      const code = (error as any).code || "";

      // Real authorization / permission failures → fail-closed.
      // These indicate the caller is not allowed to deduct credits, which is a
      // security signal we should not silently bypass.
      const isAuthError =
        code === "42501" ||                           // insufficient_privilege
        code === "PGRST301" || code === "PGRST302" || // PostgREST JWT errors
        msg.includes("permission denied") ||
        msg.includes("not authorized") ||
        msg.includes("unauthorized") ||
        msg.includes("rls") ||
        msg.includes("row-level security") ||
        msg.includes("row level security") ||
        msg.includes("jwt") ||
        msg.includes("invalid token") ||
        msg.includes("forbidden");

      if (isAuthError) {
        console.error("[ai-service] credit gate auth error — fail-closed:", error.message);
        await logGateEvent(sb, userId, promptType, model, "blocked", "auth_error", { message: error.message, code });
        return { allowed: false, remaining: 0, error: "unauthorized" };
      }

      // RPC missing → transient (function not yet deployed). Fail-open.
      if (msg.includes("could not find the function") || msg.includes("does not exist") || code === "42883") {
        console.warn("[ai-service] deduct_ai_credits RPC missing — fail-open");
        await logGateEvent(sb, userId, promptType, model, "fail_open", "rpc_missing", { message: error.message });
        return { allowed: true };
      }

      // Other transient DB errors → fail-open so AI keeps working.
      console.error("[ai-service] credit deduction error — fail-open:", error.message);
      await logGateEvent(sb, userId, promptType, model, "fail_open", "rpc_error", { message: error.message, code });
      return { allowed: true };
    }

    if (data && typeof data === "object" && data.success === false) {
      await logGateEvent(sb, userId, promptType, model, "blocked", "insufficient_credits", { remaining: data.remaining });
      return { allowed: false, remaining: data.remaining, error: "insufficient_credits" };
    }

    return { allowed: true, remaining: data?.remaining };
  } catch (err: any) {
    // Network / runtime exceptions — transient. Fail-open.
    console.error("[ai-service] credit check exception — fail-open:", err);
    await logGateEvent(sb, userId, promptType, model, "fail_open", "exception", { message: String(err?.message ?? err) });
    return { allowed: true };
  }
}

async function resolveUserId(opts: AiGenerateOptions): Promise<string | undefined> {
  if (opts.userId) return opts.userId;
  if (!opts.authToken) return undefined;
  try {
    const sb = getServiceClient();
    if (!sb) return undefined;
    const { data: { user } } = await sb.auth.getUser(opts.authToken);
    return user?.id;
  } catch (_) {
    return undefined;
  }
}

/** Extract bearer token from a Request for passing as authToken to aiGenerate */
export function extractAuthToken(req: Request): string | undefined {
  const h = req.headers.get("Authorization");
  return h ? h.replace("Bearer ", "") : undefined;
}

export interface AiResult {
  success: boolean;
  content: string;
  provider: AiProvider;
  fallback_used: boolean;
  raw?: any;                     // full API response for advanced consumers
}

// ── Provider configs ─────────────────────────────────────────────────────────

interface ProviderConfig {
  url: string;
  keyEnv: string;
  defaultModel: string;
  mapBody?: (body: any) => any;
  mapHeaders?: (key: string) => Record<string, string>;
}

const PROVIDERS: Record<Exclude<AiProvider, "lovable">, ProviderConfig> = {
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    keyEnv: "OPENAI_API_KEY",
    defaultModel: "gpt-4o-mini",
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyEnv: "GEMINI_API_KEY",
    defaultModel: "gemini-2.5-flash",
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    keyEnv: "GROQ_API_KEY",
    defaultModel: "llama-3.3-70b-versatile",
  },
  deepseek: {
    url: "https://api.deepseek.com/v1/chat/completions",
    keyEnv: "DEEPSEEK_API_KEY",
    defaultModel: "deepseek-chat",
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    keyEnv: "OPENROUTER_API_KEY",
    defaultModel: "openai/gpt-4o-mini",
  },
};

// ── Lovable AI (default) ─────────────────────────────────────────────────────

async function callLovable(
  opts: AiGenerateOptions,
): Promise<Response> {
  const key = edgeConfig.ai.keys.lovable;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  const body: any = {
    model: opts.model || "google/gemini-2.5-flash",
    messages: opts.messages,
    stream: opts.stream ?? false,
  };
  if (opts.tools) body.tools = opts.tools;
  if (opts.tool_choice) body.tool_choice = opts.tool_choice;
  if (opts.response_format) body.response_format = opts.response_format;
  if (opts.temperature !== undefined) body.temperature = opts.temperature;

  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// ── External provider call ───────────────────────────────────────────────────

async function callExternal(
  provider: Exclude<AiProvider, "lovable">,
  opts: AiGenerateOptions,
): Promise<Response> {
  const cfg = PROVIDERS[provider];
  const key = Deno.env.get(cfg.keyEnv); // stays dynamic — provider-specific key lookup
  if (!key) throw new Error(`${cfg.keyEnv} not configured for provider "${provider}"`);

  const body: any = {
    model: opts.model || cfg.defaultModel,
    messages: opts.messages,
    stream: opts.stream ?? false,
  };
  if (opts.tools) body.tools = opts.tools;
  if (opts.tool_choice) body.tool_choice = opts.tool_choice;
  if (opts.response_format) body.response_format = opts.response_format;
  if (opts.temperature !== undefined) body.temperature = opts.temperature;

  const headers: Record<string, string> = cfg.mapHeaders
    ? cfg.mapHeaders(key)
    : { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";

  return fetch(cfg.url, {
    method: "POST",
    headers,
    body: JSON.stringify(cfg.mapBody ? cfg.mapBody(body) : body),
  });
}

// ── Resolve active provider ──────────────────────────────────────────────────

const VALID_PROVIDERS: AiProvider[] = ["lovable", "openai", "gemini", "groq", "deepseek", "openrouter"];

/** Env-based provider (last-resort fallback when the DB is unreachable). */
export function getActiveProvider(): AiProvider {
  const raw = edgeConfig.ai.provider;
  return VALID_PROVIDERS.includes(raw as AiProvider) ? (raw as AiProvider) : "lovable";
}

/**
 * Resolve the SINGLE global AI provider that every user shares.
 *
 * The admin picks this in Admin → System Settings, which writes
 * `system_settings.ai_provider` (id = 'global'). That choice is the source of
 * truth for ALL users and ALL prompts. We fall back to the AI_PROVIDER env
 * secret, then to "lovable", only when the DB value is missing/unreachable.
 */
export async function getGlobalProvider(): Promise<AiProvider> {
  const sb = getServiceClient();
  if (!sb) return getActiveProvider();
  try {
    const { data } = await sb
      .from("system_settings")
      .select("ai_provider")
      .eq("id", "global")
      .maybeSingle();
    const raw = (data?.ai_provider || "").toLowerCase().trim();
    if (VALID_PROVIDERS.includes(raw as AiProvider)) return raw as AiProvider;
    return getActiveProvider();
  } catch {
    return getActiveProvider();
  }
}

export interface UserAiAccess {
  enabled: boolean;
  provider: AiProvider;
  purposes: string[];
}

/**
 * Resolve AI access for a user. The PROVIDER is always the admin-configured
 * global provider — every user uses exactly what the admin set up. The
 * per-user `user_ai_access` row is only used by the admin to disable a user
 * or restrict which AI purposes/features they may use; it can NEVER change
 * which provider is used.
 */
export async function resolveUserAiAccess(userId?: string): Promise<UserAiAccess> {
  const globalProvider = await getGlobalProvider();
  if (!userId) return { enabled: true, provider: globalProvider, purposes: [] };
  const sb = getServiceClient();
  if (!sb) return { enabled: true, provider: globalProvider, purposes: [] };
  try {
    const { data } = await sb
      .from("user_ai_access")
      .select("enabled, purposes")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return { enabled: true, provider: globalProvider, purposes: [] };
    return {
      enabled: data.enabled !== false,
      provider: globalProvider,
      purposes: Array.isArray(data.purposes) ? data.purposes : [],
    };
  } catch {
    return { enabled: true, provider: globalProvider, purposes: [] };
  }
}


// ── Main entry: generate (non-streaming) ─────────────────────────────────────

export async function aiGenerate(opts: AiGenerateOptions): Promise<AiResult> {
  // Resolve user + admin-controlled AI access
  const uid = await resolveUserId(opts);
  let provider = await getGlobalProvider();
  if (!opts.skipCredits) {
    if (!uid) {
      return {
        success: false,
        content: "Authentication required. Please sign in to use AI features.",
        provider: "lovable",
        fallback_used: false,
      };
    }
    const access = await resolveUserAiAccess(uid);
    if (!access.enabled) {
      return {
        success: false,
        content: "AI access is disabled for your account. Please contact your administrator.",
        provider: "lovable",
        fallback_used: false,
      };
    }
    if (access.purposes.length > 0 && opts.promptType && !access.purposes.includes(opts.promptType)) {
      return {
        success: false,
        content: "Your administrator has not enabled this AI feature for your account.",
        provider: "lovable",
        fallback_used: false,
      };
    }
    provider = access.provider;
    const credit = await checkAndDeductCredits(uid, opts.promptType || "default", opts.model);
    if (!credit.allowed) {
      return {
        success: false,
        content: `Insufficient AI credits (remaining: ${credit.remaining ?? 0}). Please upgrade your plan.`,
        provider: "lovable",
        fallback_used: false,
      };
    }
  }

  // ── Provider routing ─────────────────────────────────────────────────────
  let fallbackUsed = false;
  let response: Response;

  if (provider === "lovable") {
    response = await callLovable(opts);
  } else {
    try {
      response = await callExternal(provider, opts);
      if (!response.ok) {
        console.warn(`[ai-service] ${provider} returned ${response.status}, falling back to lovable`);
        response = await callLovable(opts);
        fallbackUsed = true;
      }
    } catch (err) {
      console.warn(`[ai-service] ${provider} failed:`, err, "— falling back to lovable");
      response = await callLovable(opts);
      fallbackUsed = true;
    }
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return {
      success: false,
      content: text || `AI request failed with status ${response.status}`,
      provider: fallbackUsed ? "lovable" : provider,
      fallback_used: fallbackUsed,
    };
  }

  const json = await response.json();
  const content =
    json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ??
    json.choices?.[0]?.message?.content ??
    "";

  return {
    success: true,
    content: typeof content === "string" ? content : JSON.stringify(content),
    provider: fallbackUsed ? "lovable" : provider,
    fallback_used: fallbackUsed,
    raw: json,
  };
}

// ── Streaming entry ──────────────────────────────────────────────────────────

export async function aiGenerateStream(opts: AiGenerateOptions): Promise<{
  response: Response;
  provider: AiProvider;
  fallback_used: boolean;
}> {
  const uid = await resolveUserId(opts);
  let provider = await getGlobalProvider();
  if (!opts.skipCredits) {
    if (!uid) {
      return {
        response: new Response(
          JSON.stringify({ error: "auth_required", message: "Authentication required for AI features." }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
        provider: "lovable",
        fallback_used: false,
      };
    }
    const access = await resolveUserAiAccess(uid);
    if (!access.enabled) {
      return {
        response: new Response(
          JSON.stringify({ error: "ai_disabled", message: "AI access is disabled for your account." }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        ),
        provider: "lovable",
        fallback_used: false,
      };
    }
    if (access.purposes.length > 0 && opts.promptType && !access.purposes.includes(opts.promptType)) {
      return {
        response: new Response(
          JSON.stringify({ error: "ai_purpose_not_allowed", message: "This AI feature is not enabled for your account." }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        ),
        provider: "lovable",
        fallback_used: false,
      };
    }
    provider = access.provider;
    const credit = await checkAndDeductCredits(uid, opts.promptType || "default", opts.model);
    if (!credit.allowed) {
      return {
        response: new Response(
          JSON.stringify({ error: "insufficient_credits", remaining: credit.remaining ?? 0 }),
          { status: 402, headers: { "Content-Type": "application/json" } },
        ),
        provider: "lovable",
        fallback_used: false,
      };
    }
  }

  const streamOpts = { ...opts, stream: true };

  if (provider === "lovable") {
    return { response: await callLovable(streamOpts), provider, fallback_used: false };
  }

  try {
    const resp = await callExternal(provider, streamOpts);
    if (!resp.ok) {
      console.warn(`[ai-service] ${provider} stream returned ${resp.status}, falling back`);
      return { response: await callLovable(streamOpts), provider: "lovable", fallback_used: true };
    }
    return { response: resp, provider, fallback_used: false };
  } catch (err) {
    console.warn(`[ai-service] ${provider} stream failed:`, err);
    return { response: await callLovable(streamOpts), provider: "lovable", fallback_used: true };
  }
}
