import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createConnector, type WebsiteRecord } from "../_shared/connectors/factory.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Admin role gate
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden — admin role required" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action || new URL(req.url).searchParams.get("action") || "list";

    // ── list: failing/disconnected websites across all workspaces ──
    if (action === "list") {
      const status = body.status as string | undefined;
      let q = admin
        .from("websites")
        .select("id,name,url,type,status,last_sync,credentials,workspace_id,user_id,updated_at,created_at")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (status && status !== "all") q = q.eq("status", status);
      else q = q.in("status", ["error", "disconnected"]);

      const { data: sites, error } = await q;
      if (error) return json({ error: error.message }, 500);

      // Enrich with owner identity so admins know which user a site belongs to
      const userIds = [...new Set((sites || []).map((s: any) => s.user_id).filter(Boolean))];
      const profileMap = new Map<string, { name: string | null; company: string | null }>();
      const emailMap = new Map<string, string | null>();

      if (userIds.length > 0) {
        const { data: profiles } = await admin
          .from("profiles")
          .select("user_id,full_name,company")
          .in("user_id", userIds);
        for (const p of profiles || []) {
          profileMap.set(p.user_id, { name: p.full_name ?? null, company: p.company ?? null });
        }
        // Emails live in auth.users — fetch individually via admin API
        await Promise.all(
          userIds.map(async (uid: string) => {
            try {
              const { data } = await admin.auth.admin.getUserById(uid);
              emailMap.set(uid, data?.user?.email ?? null);
            } catch (_) {
              emailMap.set(uid, null);
            }
          })
        );
      }

      const items = (sites || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        type: s.type,
        status: s.status,
        last_sync: s.last_sync,
        workspace_id: s.workspace_id,
        user_id: s.user_id,
        user_name: profileMap.get(s.user_id)?.name || null,
        user_company: profileMap.get(s.user_id)?.company || null,
        user_email: emailMap.get(s.user_id) || null,
        updated_at: s.updated_at,
        created_at: s.created_at,
        last_error:
          s.credentials?.last_error ||
          s.credentials?.error ||
          s.credentials?.last_error_message ||
          null,
        last_error_at: s.credentials?.last_error_at || null,
      }));
      return json({ items });
    }

    // ── resync: re-test a single website connection and update status ──
    if (action === "resync") {
      const websiteId = body.website_id as string;
      if (!websiteId) return json({ error: "website_id required" }, 400);

      const { data: site, error: siteErr } = await admin
        .from("websites")
        .select("id,url,type,credentials,workspace_id,user_id")
        .eq("id", websiteId)
        .maybeSingle();
      if (siteErr || !site) return json({ error: siteErr?.message || "Website not found" }, 404);

      const record: WebsiteRecord = {
        url: site.url,
        type: site.type,
        credentials: site.credentials || {},
      };

      let ok = false;
      let errorMsg: string | null = null;
      try {
        const connector = await createConnector(record);
        ok = await connector.testConnection();
        if (!ok) errorMsg = `${site.type} connection test returned false`;
      } catch (e: any) {
        errorMsg = e?.message || "Connection test failed";
      }

      const nowIso = new Date().toISOString();
      const newStatus = ok ? "connected" : "error";
      const newCreds = {
        ...(site.credentials || {}),
        last_error: ok ? null : errorMsg,
        last_error_at: ok ? null : nowIso,
        last_resync_at: nowIso,
        last_resync_by: user.id,
      };

      await admin
        .from("websites")
        .update({
          status: newStatus,
          credentials: newCreds,
          last_sync: ok ? nowIso : undefined,
        })
        .eq("id", websiteId);

      // Audit log (best-effort)
      try {
        await admin.from("audit_logs").insert({
          user_id: user.id,
          workspace_id: site.workspace_id,
          action: ok ? "admin.website.resync.success" : "admin.website.resync.failure",
          entity_type: "website",
          entity_id: websiteId,
          details: { url: site.url, type: site.type, error: errorMsg },
        });
      } catch (_) { /* ignore */ }

      return json({ success: ok, status: newStatus, error: errorMsg });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: any) {
    console.error("[admin-websites] error:", err);
    return json({ error: err?.message || "Internal error" }, 500);
  }
});
