import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    const { id, name, url, type, credentials, workspace_id } = await req.json();

    if (!url || !type || !workspace_id) {
      return new Response(JSON.stringify({ error: "url, type, and workspace_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Encrypt credential values
    const encryptedCreds = credentials ? await encryptCredentials(credentials) : {};

    if (id) {
      // Update existing website
      const updatePayload: Record<string, unknown> = { credentials: encryptedCreds };
      if (name) updatePayload.name = name;
      if (url) updatePayload.url = url;

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
        credentials: encryptedCreds,
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
