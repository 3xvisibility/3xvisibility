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
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key);
}

async function checkAndDeductCredits(
  userId: string,
  promptType: string,
  model?: string,
): Promise<{ allowed: boolean; remaining?: number; error?: string }> {
  try {
    const sb = getServiceClient();
    if (!sb) {
      console.error("[ai-service] No service client — blocking AI request (fail-closed)");
      return { allowed: false, remaining: 0, error: "credit_system_unavailable" };
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
      console.error("[ai-service] credit deduction error:", error.message);
      return { allowed: false, remaining: 0, error: "credit_check_failed" };
    }

    if (data && typeof data === "object" && data.success === false) {
      return { allowed: false, remaining: data.remaining, error: "insufficient_credits" };
    }

    return { allowed: true, remaining: data?.remaining };
  } catch (err) {
    console.error("[ai-service] credit check exception — blocking request (fail-closed):", err);
    return { allowed: false, remaining: 0, error: "credit_check_failed" };
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
  const key = Deno.env.get("LOVABLE_API_KEY");
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
  const key = Deno.env.get(cfg.keyEnv);
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

export function getActiveProvider(): AiProvider {
  const raw = (Deno.env.get("AI_PROVIDER") || "lovable").toLowerCase().trim();
  const valid: AiProvider[] = ["lovable", "openai", "gemini", "groq", "deepseek", "openrouter"];
  return valid.includes(raw as AiProvider) ? (raw as AiProvider) : "lovable";
}

// ── Main entry: generate (non-streaming) ─────────────────────────────────────

export async function aiGenerate(opts: AiGenerateOptions): Promise<AiResult> {
  // ── Credit gate ──────────────────────────────────────────────────────────
  if (!opts.skipCredits) {
    const uid = await resolveUserId(opts);
    if (!uid) {
      return {
        success: false,
        content: "Authentication required. Please sign in to use AI features.",
        provider: "lovable",
        fallback_used: false,
      };
    }
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
  const provider = getActiveProvider();
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
  // ── Credit gate ──────────────────────────────────────────────────────────
  if (!opts.skipCredits) {
    const uid = await resolveUserId(opts);
    if (uid) {
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
  }

  const streamOpts = { ...opts, stream: true };
  const provider = getActiveProvider();

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
