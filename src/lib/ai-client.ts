/**
 * Centralized client-side wrapper for calling the AI generate endpoint.
 *
 * Usage:
 *   import { callAI } from "@/lib/ai-client";
 *
 *   const result = await callAI({
 *     messages: [{ role: "user", content: "Hello" }],
 *     model: "google/gemini-2.5-flash-lite",
 *   });
 *
 *   if (result.success) {
 *     console.log(result.content);
 *   }
 *
 * For existing edge functions that already have their own AI logic,
 * use `callAIFunction()` which normalises the response to the same
 * `{ success, content }` shape.
 */

import { supabase } from "@/integrations/supabase/client";
import { handleApiError } from "@/lib/handle-api-error";
import { QueryClient } from "@tanstack/react-query";

// ── Shared query-client reference for invalidation ───────────────────────────

let _qc: QueryClient | null = null;

/** Register the app's QueryClient so AI calls can invalidate credit queries. */
export function registerQueryClient(qc: QueryClient) {
  _qc = qc;
}

function invalidateCredits() {
  _qc?.invalidateQueries({ queryKey: ["ai-credits"] });
  _qc?.invalidateQueries({ queryKey: ["ai-credits-usage"] });
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CallAIOptions {
  messages: AiMessage[];
  model?: string;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
  response_format?: any;
  temperature?: number;
}

export interface AiResponse {
  success: boolean;
  content: string;
  provider?: string;
  fallback_used?: boolean;
  raw?: any;
}

// ── Direct AI generate call ──────────────────────────────────────────────────

/**
 * Call the centralized `/ai-generate` edge function directly.
 * Returns a standardised `{ success, content }` response.
 */
export async function callAI(opts: CallAIOptions): Promise<AiResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("ai-generate", {
      body: opts,
    });

    if (error) {
      return {
        success: false,
        content: error.message || "AI request failed",
      };
    }

    // The edge function already returns { success, content, provider, ... }
    if (data && typeof data.success === "boolean") {
      return data as AiResponse;
    }

    // Fallback: if edge function returns unexpected shape
    return {
      success: true,
      content: typeof data === "string" ? data : JSON.stringify(data),
    };
  } catch (err: any) {
    return {
      success: false,
      content: err?.message || "Network error",
    };
  }
}

// ── Wrapper for existing AI edge functions ───────────────────────────────────

/**
 * Call any existing AI-related edge function and normalise its response
 * to the standard `{ success, content }` shape.
 *
 * This is a drop-in replacement for `supabase.functions.invoke(name, { body })`
 * that adds:
 *  - Standardised response format
 *  - Automatic error handling via handleApiError
 *  - Credit / rate-limit toast notifications
 *
 * @param name  Edge function name (e.g. "ai-seo-assistant")
 * @param body  Request body
 * @param opts  Extra options — `silent` suppresses automatic error toasts
 */
export async function callAIFunction<T = any>(
  name: string,
  body: Record<string, any>,
  opts?: { silent?: boolean },
): Promise<{ success: boolean; content: string; data: T | null }> {
  try {
    const { data, error } = await supabase.functions.invoke(name, { body });

    if (error) {
      if (!opts?.silent) handleApiError(error);
      return { success: false, content: error.message || "Request failed", data: null };
    }

    // Edge function returned an error in the body
    if (data?.error) {
      if (!opts?.silent) handleApiError(data.error);
      return { success: false, content: data.error, data: null };
    }

    // Normalise: extract the "result" or "content" field if present
    const contentField = data?.result ?? data?.content ?? null;
    const content = typeof contentField === "string"
      ? contentField
      : contentField != null
        ? JSON.stringify(contentField)
        : JSON.stringify(data);

    return { success: true, content, data: data as T };
  } catch (err: any) {
    if (!opts?.silent) handleApiError(err);
    return { success: false, content: err?.message || "Network error", data: null };
  }
}
