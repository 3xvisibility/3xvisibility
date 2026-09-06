// Daily refresh of live SEO data (authority, traffic, keywords, backlinks)
// for every workspace's tracked competitors and keywords.
// Called by a scheduled job — authenticated with a shared cron secret or service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev/semrush";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Row = Record<string, string>;

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function cleanDomain(input: string): string {
  return String(input || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

async function gateway(path: string, params: Record<string, string>): Promise<Row[]> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const semrushKey = Deno.env.get("SEMRUSH_API_KEY");
  if (!lovableKey || !semrushKey) throw new Error("Semrush is not connected for this project.");
  const res = await fetch(`${GATEWAY}${path}?${new URLSearchParams(params).toString()}`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": semrushKey,
      "Allow-Limit-Offset": "true",
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Semrush request failed (${res.status}): ${text.slice(0, 200)}`);
  const parsed = JSON.parse(text);
  if (parsed?.error) throw new Error(String(parsed.error));
  const cols: string[] = parsed?.data?.columnNames ?? [];
  const rows: string[][] = parsed?.data?.rows ?? [];
  return rows.map((r) => {
    const o: Row = {};
    cols.forEach((c, i) => (o[c] = r[i]));
    return o;
  });
}

async function overview(domain: string, database: string) {
  const [ranks, backlinks] = await Promise.all([
    gateway("/domains/domain_ranks", {
      domain,
      database,
      export_columns: "Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac",
    }).catch(() => [] as Row[]),
    gateway("/backlinks/backlinks_overview", {
      target: domain,
      target_type: "root_domain",
      export_columns: "ascore,total,domains_num,urls_num,follows_num,nofollows_num",
    }).catch(() => [] as Row[]),
  ]);
  const r = ranks[0] ?? {};
  const b = backlinks[0] ?? {};
  return {
    organic_keywords: num(r["Organic Keywords"] ?? r["Or"]),
    organic_traffic: num(r["Organic Traffic"] ?? r["Ot"]),
    authority_score: num(b["ascore"]),
    backlinks: num(b["total"]),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const cronSecret = Deno.env.get("SEO_REFRESH_CRON_SECRET");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const provided = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim() ||
      (req.headers.get("apikey") ?? "").trim() ||
      (req.headers.get("x-cron-secret") ?? "").trim();
    if (!provided || (provided !== serviceKey && (!cronSecret || provided !== cronSecret))) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, {
      auth: { persistSession: false },
    });

    const today = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    let competitorsUpdated = 0;
    let keywordsUpdated = 0;

    // --- Competitors: refresh authority, keywords, traffic and backlinks ---
    const { data: competitors } = await supabase
      .from("competitors")
      .select("id, domain")
      .limit(500);
    for (const c of competitors ?? []) {
      try {
        const o = await overview(cleanDomain(c.domain), "us");
        await supabase
          .from("competitors")
          .update({ ...o, last_checked_at: nowIso })
          .eq("id", c.id);
        competitorsUpdated++;
      } catch (e) {
        console.error(`[seo-daily-refresh] competitor ${c.domain}`, e);
      }
    }

    // --- Tracked keywords: refresh positions per workspace's own site ---
    const { data: tracked } = await supabase
      .from("tracked_keywords")
      .select("id, keyword, current_position, workspace_id")
      .limit(2000);

    const byWorkspace = new Map<string, typeof tracked>();
    for (const t of tracked ?? []) {
      const list = byWorkspace.get(t.workspace_id) ?? [];
      list.push(t);
      byWorkspace.set(t.workspace_id, list as any);
    }

    for (const [workspaceId, rows] of byWorkspace) {
      const { data: sites } = await supabase
        .from("websites")
        .select("url")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true })
        .limit(1);
      const domain = cleanDomain(sites?.[0]?.url ?? "3xvisibility.com");
      let organic: Row[] = [];
      try {
        organic = await gateway("/domains/domain_organic", {
          domain,
          database: "us",
          display_limit: "1000",
          export_columns: "Ph,Po,Pp,Nq,Cp,Ur",
        });
      } catch (e) {
        console.error(`[seo-daily-refresh] organic ${domain}`, e);
        continue;
      }
      const byKeyword = new Map<string, Row>();
      for (const r of organic) {
        const k = (r["Keyword"] ?? r["Ph"] ?? "").toLowerCase().trim();
        if (k) byKeyword.set(k, r);
      }
      for (const t of rows ?? []) {
        const hit = byKeyword.get(t.keyword.toLowerCase().trim());
        if (!hit) continue;
        const position = num(hit["Position"] ?? hit["Po"]);
        await supabase
          .from("tracked_keywords")
          .update({
            previous_position: t.current_position,
            current_position: position,
            search_volume: num(hit["Search Volume"] ?? hit["Nq"]),
            last_checked_at: nowIso,
          })
          .eq("id", t.id);
        await supabase.from("keyword_rankings").insert({
          keyword_id: t.id,
          workspace_id: workspaceId,
          position,
          recorded_at: today,
        });
        keywordsUpdated++;
      }
    }

    console.log(`[seo-daily-refresh] competitors=${competitorsUpdated} keywords=${keywordsUpdated}`);
    return json({ competitors_updated: competitorsUpdated, keywords_updated: keywordsUpdated });
  } catch (error) {
    console.error("[seo-daily-refresh] error", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
