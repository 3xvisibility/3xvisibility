import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { encryptCredentials } from "../_shared/crypto.ts";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { id, name, url, type, credentials, workspace_id, language, language_locked, status } = await req.json();

    if (!url || !type || !workspace_id) {
      return new Response(JSON.stringify({ error: "url, type, and workspace_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Encrypt credential values only when caller actually provided new ones.
    const hasNewCredentials = credentials && Object.keys(credentials).length > 0;
    const encryptedCreds = hasNewCredentials ? await encryptCredentials(credentials) : null;

    // Normalize language: empty/whitespace ⇒ NULL (= auto-detect).
    const normalizedLanguage = typeof language === "string" && language.trim().length > 0
      ? language.trim()
      : null;
    const languageProvided = typeof language !== "undefined";
    const languageLockedProvided = typeof language_locked !== "undefined";
    const normalizedLanguageLocked = !!language_locked;

    if (id) {
      // Update existing website (only patch fields the caller sent)
      const updatePayload: Record<string, unknown> = {};
      if (encryptedCreds) updatePayload.credentials = encryptedCreds;
      if (name) updatePayload.name = name;
      if (url) updatePayload.url = url;
      if (languageProvided) updatePayload.language = normalizedLanguage;
      if (languageLockedProvided) updatePayload.language_locked = normalizedLanguageLocked;

      const { error } = await serviceClient
        .from("websites")
        .update(updatePayload)
        .eq("id", id)
        .eq("workspace_id", workspace_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: "Website updated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Insert new website
      const { data, error } = await serviceClient.from("websites").insert({
        name: name || new URL(url).hostname,
        url,
        type,
        credentials: encryptedCreds || {},
        language: normalizedLanguage,
        language_locked: normalizedLanguageLocked,
        user_id: user.id,
        workspace_id,
      }).select("id").single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, id: data.id, message: "Website connected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save website";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
