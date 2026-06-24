// compare-pages: Visual Fidelity orchestrator.
//
// Renders the original template HTML and the published page via an external
// render worker, computes a visual-similarity score, stores the result in
// `page_render_checks`, and returns the score + diff regions (with rebuild
// hints when below the pass threshold).
//
// The actual browser rendering happens in an EXTERNAL render worker because the
// Deno edge runtime has no headless browser. Configure its URL via the
// RENDER_SERVICE_URL secret (and optional RENDER_SERVICE_KEY). The worker must
// accept POST { html?, url?, viewport } and return
// { screenshot: base64-rgba-or-png, dom: DomBox[] }.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  pixelSimilarity,
  structuralDiff,
  combineSimilarity,
  buildRebuildHints,
  type DomBox,
} from "../_shared/visual-diff.ts";

const PASS_THRESHOLD = 0.98;

interface RenderResult {
  /** base64-encoded RGBA pixel buffer (preferred) for pixel diff. */
  pixels?: string;
  dom?: DomBox[];
  /** Stored screenshot URL the worker may already host. */
  screenshotUrl?: string;
}

async function renderViaWorker(
  endpoint: string,
  key: string | undefined,
  payload: Record<string, unknown>,
): Promise<RenderResult | null> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      await res.text();
      return null;
    }
    return (await res.json()) as RenderResult;
  } catch {
    return null;
  }
}

function decodePixels(b64?: string): Uint8Array {
  if (!b64) return new Uint8Array();
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return new Uint8Array();
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      workspace_id,
      generated_page_id,
      template_id,
      templateHtml,
      publishedUrl,
      attempt = 1,
    } = body as {
      workspace_id?: string;
      generated_page_id?: string;
      template_id?: string;
      templateHtml?: string;
      publishedUrl?: string;
      attempt?: number;
    };

    if (!workspace_id || (!templateHtml) || !publishedUrl) {
      return new Response(
        JSON.stringify({ error: "workspace_id, templateHtml and publishedUrl are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const renderUrl = Deno.env.get("RENDER_SERVICE_URL");
    const renderKey = Deno.env.get("RENDER_SERVICE_KEY") || undefined;
    const db = createClient(supabaseUrl, serviceKey);

    // Without a render backend we cannot produce screenshots — record a pending
    // check and tell the caller to configure the worker.
    if (!renderUrl) {
      const { data: row } = await db.from("page_render_checks").insert({
        workspace_id, generated_page_id, template_id, attempt, status: "pending",
      }).select("id").single();
      return new Response(JSON.stringify({
        status: "pending",
        check_id: row?.id ?? null,
        message: "Render worker not configured. Set RENDER_SERVICE_URL to enable visual-fidelity checks.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const viewport = { width: 1280, height: 2000 };
    const [tpl, pub] = await Promise.all([
      renderViaWorker(renderUrl, renderKey, { html: templateHtml, viewport }),
      renderViaWorker(renderUrl, renderKey, { url: publishedUrl, viewport }),
    ]);

    if (!tpl || !pub) {
      await db.from("page_render_checks").insert({
        workspace_id, generated_page_id, template_id, attempt, status: "failed",
      });
      return new Response(JSON.stringify({ status: "failed", error: "Render worker did not return results" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pixelScore = pixelSimilarity(decodePixels(tpl.pixels), decodePixels(pub.pixels));
    const { score: structuralScore, regions } = structuralDiff(tpl.dom || [], pub.dom || []);
    const result = combineSimilarity(pixelScore, structuralScore, regions);
    const passed = result.score >= PASS_THRESHOLD;

    const { data: row } = await db.from("page_render_checks").insert({
      workspace_id,
      generated_page_id,
      template_id,
      attempt,
      status: passed ? "passed" : "failed",
      score: result.score,
      pixel_score: result.pixelScore,
      structural_score: result.structuralScore,
      diff_regions: result.diffRegions,
      template_screenshot_url: tpl.screenshotUrl ?? null,
      published_screenshot_url: pub.screenshotUrl ?? null,
    }).select("id").single();

    return new Response(JSON.stringify({
      check_id: row?.id ?? null,
      status: passed ? "passed" : "failed",
      score: result.score,
      pixel_score: result.pixelScore,
      structural_score: result.structuralScore,
      diff_regions: result.diffRegions,
      rebuild_hints: passed ? "" : buildRebuildHints(result.diffRegions),
      threshold: PASS_THRESHOLD,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error)?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
