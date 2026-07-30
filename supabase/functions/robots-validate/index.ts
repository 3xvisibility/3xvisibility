import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Issue = { level: "error" | "warning" | "info"; message: string };

function validateRobots(text: string, sitemapUrl: string) {
  const issues: Issue[] = [];
  const lines = text.split(/\r?\n/);
  const directives = lines
    .map((l) => l.replace(/#.*$/, "").trim())
    .filter(Boolean);

  const groups: Array<{ agents: string[]; rules: Array<{ key: string; value: string }> }> = [];
  let current: { agents: string[]; rules: Array<{ key: string; value: string }> } | null = null;
  const sitemaps: string[] = [];

  for (const line of directives) {
    const idx = line.indexOf(":");
    if (idx === -1) {
      issues.push({ level: "warning", message: `Unparsable line ignored: "${line.slice(0, 80)}"` });
      continue;
    }
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === "user-agent") {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (key === "sitemap") {
      sitemaps.push(value);
    } else if (["allow", "disallow", "crawl-delay", "host", "clean-param", "noindex"].includes(key)) {
      if (!current) {
        issues.push({ level: "error", message: `"${key}" appears before any User-agent group.` });
      } else {
        current.rules.push({ key, value });
      }
      if (key === "noindex") {
        issues.push({ level: "warning", message: "`Noindex:` in robots.txt is unsupported by Google — use a meta robots tag instead." });
      }
    } else {
      issues.push({ level: "info", message: `Unknown directive "${key}" (ignored by most crawlers).` });
    }
  }

  const wildcard = groups.find((g) => g.agents.includes("*"));
  const blocksAll = groups.some((g) =>
    g.rules.some((r) => r.key === "disallow" && r.value === "/")
  );
  const wildcardBlocksAll = !!wildcard?.rules.some((r) => r.key === "disallow" && r.value === "/");

  if (wildcardBlocksAll) {
    issues.push({ level: "error", message: "`Disallow: /` for `User-agent: *` blocks the entire site from crawling." });
  } else if (blocksAll) {
    issues.push({ level: "warning", message: "One or more crawler groups are blocked from the entire site." });
  }

  if (!wildcard) {
    issues.push({ level: "warning", message: "No `User-agent: *` group found — default crawlers have no explicit rules." });
  }

  const hasSitemap = sitemaps.length > 0;
  const declaresOurSitemap = sitemaps.some(
    (s) => s.replace(/\/$/, "").toLowerCase() === sitemapUrl.replace(/\/$/, "").toLowerCase(),
  );
  if (!hasSitemap) {
    issues.push({ level: "warning", message: `No \`Sitemap:\` directive found. Add: Sitemap: ${sitemapUrl}` });
  } else if (!declaresOurSitemap) {
    issues.push({ level: "info", message: `robots.txt declares a sitemap, but not ${sitemapUrl}.` });
  }

  const errors = issues.filter((i) => i.level === "error").length;
  const warnings = issues.filter((i) => i.level === "warning").length;
  const score = Math.max(0, 100 - errors * 40 - warnings * 12);
  const status: "success" | "partial" | "failed" = errors > 0 ? "failed" : warnings > 0 ? "partial" : "success";

  return { issues, sitemaps, groups: groups.length, score, status, blocksAll: wildcardBlocksAll };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const website_id: string | undefined = body?.website_id;
    const campaign_id: string | null = body?.campaign_id ?? null;
    if (!website_id) return json({ error: "website_id is required" }, 400);

    const { data: website } = await supabase
      .from("websites")
      .select("id, url, workspace_id")
      .eq("id", website_id)
      .maybeSingle();
    if (!website) return json({ error: "Website not found" }, 404);

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", website.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return json({ error: "Not authorized for this website" }, 403);

    const base = String(website.url).replace(/\/$/, "");
    const robotsUrl = `${base}/robots.txt`;
    const sitemapUrl = `${base}/sitemap.xml`;

    let httpStatus = 0;
    let content = "";
    let fetchError: string | null = null;
    try {
      const res = await fetch(robotsUrl, {
        headers: { "User-Agent": "3xVisibility-RobotsValidator/1.0" },
        redirect: "follow",
      });
      httpStatus = res.status;
      content = (await res.text()).slice(0, 100_000);
    } catch (e) {
      fetchError = e instanceof Error ? e.message : "Network error";
    }

    const reachable = httpStatus >= 200 && httpStatus < 300;
    const analysis = reachable
      ? validateRobots(content, sitemapUrl)
      : {
        issues: [{
          level: "error" as const,
          message: fetchError
            ? `Could not fetch robots.txt: ${fetchError}`
            : `robots.txt returned HTTP ${httpStatus}.`,
        }],
        sitemaps: [] as string[],
        groups: 0,
        score: 0,
        status: "failed" as const,
        blocksAll: false,
      };

    const nowIso = new Date().toISOString();
    const result = {
      robots_url: robotsUrl,
      http_status: httpStatus,
      reachable,
      score: analysis.score,
      blocks_all: analysis.blocksAll,
      declared_sitemaps: analysis.sitemaps,
      group_count: analysis.groups,
      issues: analysis.issues,
      content: content.slice(0, 8000),
      checked_at: nowIso,
    };

    let smQuery = supabase.from("sitemaps").select("id").eq("website_id", website_id);
    smQuery = campaign_id ? smQuery.eq("campaign_id", campaign_id) : smQuery.is("campaign_id", null);
    const { data: sitemapRow } = await smQuery.maybeSingle();

    if (sitemapRow) {
      await supabase
        .from("sitemaps")
        .update({ robots_checked_at: nowIso, robots_result: result, updated_at: nowIso })
        .eq("id", sitemapRow.id);
    }

    await supabase.from("site_index_events").insert({
      workspace_id: website.workspace_id,
      user_id: user.id,
      website_id,
      campaign_id,
      kind: "robots",
      status: analysis.status,
      url_count: 0,
      message: reachable
        ? `robots.txt score ${analysis.score}/100 with ${analysis.issues.length} finding(s).`
        : "robots.txt could not be validated.",
      details: result,
    });

    return json({ success: true, ...result, status: analysis.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});
