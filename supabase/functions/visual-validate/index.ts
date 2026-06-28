// visual-validate: 98% visual-validation gate using ScreenshotOne.
//
// Captures a screenshot of the generated/published page (target) and of the
// expected template render (baseline), normalizes both, computes a pixel
// similarity score, stores both screenshots in the private `render-checks`
// bucket, and persists scores + diff metadata to `page_render_checks` so gate
// failures can be audited and re-run without regenerating content.
//
// Provider credentials: SCREENSHOTONE_ACCESS_KEY (required to capture).
//
// Baseline target = "both (auto-fallback)": prefer a stored baseline image,
// then a live template URL, then raw template HTML.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { pixelSimilarity } from "../_shared/visual-diff.ts";
import {
  captureScreenshot,
  captureFromImageUrl,
  type CaptureResult,
} from "../_shared/screenshot.ts";

const DEFAULT_THRESHOLD = 0.98;
const BUCKET = "render-checks";
const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 days

interface SideInput {
  url?: string;
  html?: string;
  imageUrl?: string;
}

function buildHtmlDoc(html: string): string {
  if (/<html[\s>]/i.test(html)) return html;
  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<style>body{margin:0}img{max-width:100%;height:auto}</style>` +
    `</head><body>${html}</body></html>`
  );
}

async function captureSide(
  accessKey: string | undefined,
  side: SideInput,
): Promise<{ result: CaptureResult; source: string }> {
  if (side.imageUrl) {
    return { result: await captureFromImageUrl(side.imageUrl), source: "imageUrl" };
  }
  if (!accessKey) throw new Error("SCREENSHOTONE_ACCESS_KEY is not configured");
  if (side.url) {
    return { result: await captureScreenshot(accessKey, { url: side.url }), source: "url" };
  }
  if (side.html) {
    return {
      result: await captureScreenshot(accessKey, { html: buildHtmlDoc(side.html) }),
      source: "html",
    };
  }
  throw new Error("No baseline/target source provided");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const accessKey = Deno.env.get("SCREENSHOTONE_ACCESS_KEY") || undefined;

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
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
      generated_page_id = null,
      template_id = null,
      attempt = 1,
      threshold = DEFAULT_THRESHOLD,
      target = {},
      baseline = {},
    } = body as {
      workspace_id?: string;
      generated_page_id?: string | null;
      template_id?: string | null;
      attempt?: number;
      threshold?: number;
      target?: SideInput;
      baseline?: SideInput;
    };

    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = createClient(supabaseUrl, serviceKey);

    // Verify membership.
    const { data: isMember } = await db.rpc("is_workspace_member", {
      _user_id: userData.user.id, _workspace_id: workspace_id,
    });
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Not authorized for this workspace" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No provider key → record a pending check and tell the caller to configure.
    if (!accessKey && !baseline.imageUrl) {
      const { data: row } = await db.from("page_render_checks").insert({
        workspace_id, generated_page_id, template_id, attempt,
        status: "pending", threshold, provider: "screenshotone",
      }).select("id").single();
      return new Response(JSON.stringify({
        status: "pending",
        check_id: row?.id ?? null,
        message: "ScreenshotOne is not configured yet. Add the SCREENSHOTONE_ACCESS_KEY to enable visual validation.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Capture both sides.
    let targetCap: { result: CaptureResult; source: string };
    let baselineCap: { result: CaptureResult; source: string };
    try {
      [targetCap, baselineCap] = await Promise.all([
        captureSide(accessKey, target),
        captureSide(accessKey, baseline),
      ]);
    } catch (capErr) {
      const msg = String((capErr as Error)?.message || capErr);
      const { data: row } = await db.from("page_render_checks").insert({
        workspace_id, generated_page_id, template_id, attempt,
        status: "error", threshold, provider: "screenshotone", error_message: msg,
      }).select("id").single();
      return new Response(JSON.stringify({ status: "error", check_id: row?.id ?? null, error: msg }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Score.
    const pixelScore = pixelSimilarity(baselineCap.result.grid, targetCap.result.grid);
    const score = pixelScore;
    const passed = score >= threshold;

    // Store both screenshots in the private bucket.
    const checkId = crypto.randomUUID();
    const baselinePath = `${workspace_id}/${checkId}/baseline.png`;
    const targetPath = `${workspace_id}/${checkId}/target.png`;
    await Promise.all([
      db.storage.from(BUCKET).upload(baselinePath, baselineCap.result.png, {
        contentType: "image/png", upsert: true,
      }),
      db.storage.from(BUCKET).upload(targetPath, targetCap.result.png, {
        contentType: "image/png", upsert: true,
      }),
    ]);
    const [{ data: baseSigned }, { data: tgtSigned }] = await Promise.all([
      db.storage.from(BUCKET).createSignedUrl(baselinePath, SIGNED_TTL),
      db.storage.from(BUCKET).createSignedUrl(targetPath, SIGNED_TTL),
    ]);

    const meta = {
      provider: "screenshotone",
      baseline_dimensions: { width: baselineCap.result.width, height: baselineCap.result.height },
      target_dimensions: { width: targetCap.result.width, height: targetCap.result.height },
      grid: { width: 96, height: 96 },
    };

    const { data: row, error: insErr } = await db.from("page_render_checks").insert({
      id: checkId,
      workspace_id, generated_page_id, template_id, attempt,
      status: passed ? "passed" : "failed",
      score, pixel_score: pixelScore,
      threshold, provider: "screenshotone",
      baseline_source: baselineCap.source,
      target_source: targetCap.source,
      baseline_path: baselinePath,
      target_path: targetPath,
      template_screenshot_url: baseSigned?.signedUrl ?? null,
      published_screenshot_url: tgtSigned?.signedUrl ?? null,
      diff_regions: [],
      meta,
    }).select("id").single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({
      check_id: row?.id ?? checkId,
      status: passed ? "passed" : "failed",
      passed,
      score,
      pixel_score: pixelScore,
      threshold,
      baseline_screenshot_url: baseSigned?.signedUrl ?? null,
      target_screenshot_url: tgtSigned?.signedUrl ?? null,
      baseline_source: baselineCap.source,
      target_source: targetCap.source,
      meta,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error)?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
