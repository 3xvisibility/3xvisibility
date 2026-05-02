/**
 * Centralized AI generation endpoint — /ai-generate
 *
 * Request body:
 *   {
 *     messages: { role, content }[],
 *     model?: string,
 *     stream?: boolean,
 *     tools?: any[],
 *     tool_choice?: any,
 *     response_format?: any,
 *     temperature?: number
 *   }
 *
 * Response (non-streaming):
 *   { success: true, content: "...", provider: "lovable", fallback_used: false }
 *
 * Response (streaming):
 *   SSE stream (same format as OpenAI-compatible stream)
 */

import {
  aiGenerate,
  aiGenerateStream,
  type AiMessage,
} from "../_shared/ai-service.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Extract user for credit deduction ──────────────────────────────────
    let userId: string | undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const sb = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await sb.auth.getUser(token);
        userId = user?.id;
      } catch (_) { /* proceed without credits */ }
    }

    const body = await req.json();
    const messages: AiMessage[] = body.messages;
    const promptType = body.prompt_type || "default";

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, content: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stream = body.stream === true;

    // ── Streaming ────────────────────────────────────────────────────────────
    if (stream) {
      const { response, provider, fallback_used } = await aiGenerateStream({
        messages,
        model: body.model,
        tools: body.tools,
        tool_choice: body.tool_choice,
        temperature: body.temperature,
        userId,
        promptType,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        const status = response.status === 429 || response.status === 402 ? response.status : 500;
        return new Response(
          JSON.stringify({ success: false, content: errText || "AI stream failed", provider, fallback_used }),
          { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // ── Non-streaming ────────────────────────────────────────────────────────
    const result = await aiGenerate({
      messages,
      model: body.model,
      tools: body.tools,
      tool_choice: body.tool_choice,
      response_format: body.response_format,
      temperature: body.temperature,
    });

    const status = result.success ? 200 : 500;
    return new Response(JSON.stringify(result), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[ai-generate] fatal:", err);
    return new Response(
      JSON.stringify({ success: false, content: err.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
