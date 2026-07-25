// html-fidelity-check: automatic preview → published HTML/CSS match check.
//
// v1 publishes raw HTML/CSS, so fidelity can be verified deterministically:
// we fetch the live URL and confirm that everything in the preview markup
// (text, headings, images, links, structure, classes and CSS declarations)
// survived publishing. No screenshot provider or browser is required, so this
// runs automatically after every publish.
//
// POST { page_ids: string[], threshold?: number }
// -> { results: [{ page_id, score, status, mismatches, url }] }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { compareHtml } from "../_shared/html-fidelity.ts";
import { compareAssetParity, type AssetParityReport } from "../_shared/asset-parity.ts";

const DEFAULT_THRESHOLD = 0.95;
const FETCH_TIMEOUT_MS = 20_000;

async function fetchPublished(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FidelityCheck/1.0)",
        Accept: "text/html,application/xhtml+xml",
        "Cache-Control": "no-cache",
      },
    });
    if (!res.ok) throw new Error(`Live page returned HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const { data: userData } = await createClient(supabaseUrl, anonKey).auth.getUser(token);
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const pageIds: string[] = Array.isArray(body.page_ids)
      ? body.page_ids.filter((v: unknown) => typeof v === "string").slice(0, 25)
      : [];
    const autoRepublish = body.auto_republish !== false;
    const threshold = typeof body.threshold === "number" && body.threshold > 0 && body.threshold <= 1
      ? body.threshold
      : DEFAULT_THRESHOLD;

    if (pageIds.length === 0) {
      return new Response(JSON.stringify({ error: "page_ids is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: pages, error: pagesError } = await admin
      .from("generated_pages")
      .select("id, title, content, external_url, workspace_id, user_id, website_id, campaign_id")
      .in("id", pageIds);
    if (pagesError) throw pagesError;

    const results: Array<Record<string, unknown>> = [];

    for (const page of pages || []) {
      // Workspace-scoped authorization: the caller must be a member.
      if (page.workspace_id) {
        const { data: allowed } = await admin.rpc("is_workspace_member", {
          _user_id: user.id, _workspace_id: page.workspace_id,
        });
        if (!allowed && page.user_id !== user.id) continue;
      } else if (page.user_id !== user.id) {
        continue;
      }

      const record: Record<string, unknown> = {
        workspace_id: page.workspace_id,
        generated_page_id: page.id,
        provider: "html-fidelity",
        baseline_source: "preview_html",
        target_source: "published_url",
        threshold,
      };

      if (!page.external_url) {
        results.push({ page_id: page.id, status: "skipped", reason: "Page is not published yet" });
        continue;
      }

      try {
        let live = await fetchPublished(page.external_url);
        let report = compareHtml(page.content || "", live);
        let parity: AssetParityReport = await compareAssetParity(page.content || "", live, page.external_url);
        let republished = false;

        // Automatic repair: if design assets are missing on the live page,
        // re-publish once and re-compare so a transient/sanitized publish
        // heals itself without user action.
        if (!parity.ok && autoRepublish && page.website_id) {
          try {
            const res = await fetch(`${supabaseUrl}/functions/v1/publish-pages`, {
              method: "POST",
              headers: { Authorization: authHeader, "Content-Type": "application/json" },
              body: JSON.stringify({ page_ids: [page.id], website_id: page.website_id, overwrite_design: true }),
            });
            republished = res.ok;
          } catch (e) {
            console.error("[PARITY] Re-publish failed:", e);
          }
          if (republished) {
            await new Promise((r) => setTimeout(r, 4000));
            try {
              live = await fetchPublished(page.external_url);
              report = compareHtml(page.content || "", live);
              parity = await compareAssetParity(page.content || "", live, page.external_url);
            } catch (e) {
              console.error("[PARITY] Re-fetch after re-publish failed:", e);
            }
          }
        }

        const parityMismatches = parity.issues.map((i) => ({
          kind: (i.kind === "link" ? "link" : "css") as "link" | "css",
          detail: i.detail,
          hint: i.hint,
        }));
        report.mismatches.push(...parityMismatches);
        const status = report.score >= threshold && parity.ok ? "passed" : "failed";

        if (page.workspace_id) {
          await admin.from("page_render_checks").insert({
            ...record,
            score: report.score,
            structural_score: report.structureScore,
            status,
            diff_regions: report.mismatches,
            meta: {
              content_score: report.contentScore,
              style_score: report.styleScore,
              counts: report.counts,
              asset_parity: {
                ok: parity.ok,
                score: parity.score,
                issues: parity.issues,
                counts: parity.counts,
                auto_republished: republished,
              },
              url: page.external_url,
              mode: "html-css",
            },
          });
        }

        results.push({
          page_id: page.id,
          title: page.title,
          url: page.external_url,
          status,
          score: report.score,
          content_score: report.contentScore,
          style_score: report.styleScore,
          structure_score: report.structureScore,
          counts: report.counts,
          asset_parity: parity,
          auto_republished: republished,
          mismatches: report.mismatches,
          threshold,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Fidelity check failed";
        if (page.workspace_id) {
          await admin.from("page_render_checks").insert({
            ...record, status: "error", error_message: message.slice(0, 300),
            meta: { url: page.external_url, mode: "html-css" },
          });
        }
        results.push({ page_id: page.id, status: "error", error: message, url: page.external_url });
      }
    }

    return new Response(JSON.stringify({ success: true, threshold, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
