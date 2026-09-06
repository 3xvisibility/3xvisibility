// Semrush-backed SEO data for domain analysis, keyword rankings and competitor comparison.
// Routes all provider calls through the Lovable connector gateway.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev/semrush";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Row = Record<string, string>;

function cleanDomain(input: string): string {
  return String(input || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

async function gateway(path: string, params: Record<string, string>) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const semrushKey = Deno.env.get("SEMRUSH_API_KEY");
  if (!lovableKey || !semrushKey) {
    throw new Error("Semrush is not connected for this project.");
  }
  const url = `${GATEWAY}${path}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": semrushKey,
      "Allow-Limit-Offset": "true",
    },
  });
  const bodyText = await res.text();
  if (!res.ok) {
    console.error(`[semrush-seo] gateway ${path} failed [${res.status}]: ${bodyText}`);
    if (/LIMIT EXCEEDED/i.test(bodyText)) {
      throw new Error("Your Semrush API quota is used up — upgrade your Semrush plan or wait for it to reset.");
    }
    throw new Error(`Semrush request failed (${res.status}): ${bodyText.slice(0, 300)}`);
  }
  let parsed: any;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new Error("Unexpected response from Semrush.");
  }
  if (parsed?.error) {
    if (/LIMIT EXCEEDED/i.test(String(parsed.error))) {
      throw new Error("Your Semrush API quota is used up — upgrade your Semrush plan or wait for it to reset.");
    }
    throw new Error(String(parsed.error));
  }
  const cols: string[] = parsed?.data?.columnNames ?? [];
  const rows: string[][] = parsed?.data?.rows ?? [];
  return rows.map((r) => {
    const o: Row = {};
    cols.forEach((c, i) => (o[c] = r[i]));
    return o;
  });
}

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    const user = userData?.user;
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({} as any));
    const action: string = body.action ?? "domain_overview";
    const database: string = (body.database || "us").toString();
    const domain = cleanDomain(body.domain ?? "");
    const workspaceId: string | undefined = body.workspace_id;

    if (!domain && action !== "limits") return json({ error: "A domain is required" }, 400);

    // ---- Overview: traffic, keywords, authority, backlinks ----
    if (action === "domain_overview" || action === "sync_competitor" || action === "sync_all") {
      const overview = async (d: string) => {
        const [ranks, backlinks] = await Promise.all([
          gateway("/domains/domain_ranks", {
            domain: d,
            database,
            export_columns: "Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac",
          }).catch(() => [] as Row[]),
          gateway("/backlinks/backlinks_overview", {
            target: d,
            target_type: "root_domain",
            export_columns: "ascore,total,domains_num,urls_num,follows_num,nofollows_num",
          }).catch(() => [] as Row[]),
        ]);
        const r = ranks[0] ?? {};
        const b = backlinks[0] ?? {};
        return {
          domain: d,
          organic_keywords: num(r["Organic Keywords"] ?? r["Or"]),
          organic_traffic: num(r["Organic Traffic"] ?? r["Ot"]),
          organic_cost: num(r["Organic Cost"] ?? r["Oc"]),
          adwords_keywords: num(r["Adwords Keywords"] ?? r["Ad"]),
          rank: num(r["Rank"] ?? r["Rk"]),
          authority_score: num(b["ascore"]),
          backlinks: num(b["total"]),
          referring_domains: num(b["domains_num"]),
        };
      };

      if (action === "domain_overview") {
        const [data, topKeywords, competitors] = await Promise.all([
          overview(domain),
          gateway("/domains/domain_organic", {
            domain,
            database,
            display_limit: "20",
            export_columns: "Ph,Po,Pp,Nq,Cp,Ur,Td",
          }).catch(() => [] as Row[]),
          gateway("/domains/domain_domains", {
            domains: `*|or|${domain}`,
            database,
            display_limit: "10",
            export_columns: "Dn,Cr,Np,Or,Ot,Oc",
          }).catch(() => [] as Row[]),
        ]);
        return json({
          ...data,
          top_keywords: topKeywords.map((k) => ({
            keyword: k["Keyword"] ?? k["Ph"] ?? "",
            position: num(k["Position"] ?? k["Po"]),
            previous_position: num(k["Previous Position"] ?? k["Pp"]),
            search_volume: num(k["Search Volume"] ?? k["Nq"]),
            cpc: num(k["CPC"] ?? k["Cp"]),
            url: k["Url"] ?? k["Ur"] ?? "",
          })),
          competitors: competitors
            .map((c) => ({
              domain: c["Domain"] ?? c["Dn"] ?? "",
              competitor_relevance: num(c["Competitor Relevance"] ?? c["Cr"]),
              common_keywords: num(c["Common Keywords"] ?? c["Np"]),
              organic_keywords: num(c["Organic Keywords"] ?? c["Or"]),
              organic_traffic: num(c["Organic Traffic"] ?? c["Ot"]),
            }))
            .filter((c) => c.domain && cleanDomain(c.domain) !== domain),
        });
      }

      // ---- Refresh the stored competitor rows with live numbers ----
      if (!workspaceId) return json({ error: "workspace_id is required" }, 400);
      const { data: rows, error } = await supabase
        .from("competitors")
        .select("id, domain")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      if (!rows?.length) return json({ updated: 0 });

      let updated = 0;
      for (const row of rows) {
        try {
          const o = await overview(cleanDomain(row.domain));
          await supabase
            .from("competitors")
            .update({
              authority_score: o.authority_score,
              organic_keywords: o.organic_keywords,
              organic_traffic: o.organic_traffic,
              backlinks: o.backlinks,
              last_checked_at: new Date().toISOString(),
            })
            .eq("id", row.id);
          updated++;
        } catch (e) {
          console.error(`[semrush-seo] competitor ${row.domain} failed`, e);
        }
      }
      return json({ updated });
    }

    // ---- Refresh tracked keyword positions from live organic data ----
    if (action === "sync_keywords") {
      if (!workspaceId) return json({ error: "workspace_id is required" }, 400);
      const { data: tracked, error } = await supabase
        .from("tracked_keywords")
        .select("id, keyword, current_position")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      if (!tracked?.length) return json({ updated: 0 });

      const organic = await gateway("/domains/domain_organic", {
        domain,
        database,
        display_limit: "1000",
        export_columns: "Ph,Po,Pp,Nq,Cp,Ur",
      });
      const byKeyword = new Map<string, Row>();
      for (const r of organic) {
        const k = (r["Keyword"] ?? r["Ph"] ?? "").toLowerCase().trim();
        if (k) byKeyword.set(k, r);
      }

      const today = new Date().toISOString().slice(0, 10);
      let updated = 0;
      for (const t of tracked) {
        const hit = byKeyword.get(t.keyword.toLowerCase().trim());
        if (!hit) continue;
        const position = num(hit["Position"] ?? hit["Po"]);
        await supabase
          .from("tracked_keywords")
          .update({
            previous_position: t.current_position,
            current_position: position,
            search_volume: num(hit["Search Volume"] ?? hit["Nq"]),
            last_checked_at: new Date().toISOString(),
          })
          .eq("id", t.id);
        await supabase.from("keyword_rankings").insert({
          keyword_id: t.id,
          workspace_id: workspaceId,
          position,
          recorded_at: today,
        });
        updated++;
      }
      return json({ updated, checked: tracked.length });
    }

    if (action === "limits") {
      const rows = await gateway("/user/limits", {});
      return json({ limits: rows });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("[semrush-seo] error", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
