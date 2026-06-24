# Visual Fidelity Rendering & Diff Service

A separate service that renders both the original HTML template and the generated/published Elementor page, compares them, and drives an automatic rebuild loop until they match (target ≥98% visual similarity).

## Why this is separate from the current code
The publish path runs in Supabase Edge Functions (Deno), which has **no headless browser**. Pixel/DOM comparison requires actually rendering both pages. So this needs a browser-capable runtime. The Edge Function stays the orchestrator; the heavy rendering runs elsewhere.

## Architecture

```text
  Campaign publish
        |
        v
  [compare-pages edge fn]  --- enqueue job --->  [render-worker (browser)]
        ^                                              |
        |  similarity score + diff regions            |
        +----------------------------------------------+
        |
   score >= 98%?  --yes--> done
        |
        no -> ask AI to adjust -> rebuild -> re-enqueue (max N retries)
```

### 1. Render worker (browser-capable)
- Runtime options: Browserless / Playwright on a small Node service, or a hosted screenshot API (e.g. ScreenshotOne, Urlbox, Browserless `/screenshot`).
- Inputs: `templateHtml` (rendered standalone) and `publishedUrl` (the live WP page).
- Output for each: full-page PNG at a fixed viewport (e.g. 1280px and 390px mobile), plus a serialized DOM box-model snapshot (tag, rect, font-family, font-size, color, bg) for structural diffing.

### 2. Comparison
- **Pixel similarity:** resize both screenshots to equal dimensions, compute SSIM (or pixelmatch mismatch ratio). Score = `1 - mismatchedPixels/totalPixels`.
- **Structural diff:** align DOM nodes by order/role; flag mismatches in spacing, width, font-family, font-size, color. Produces a human-readable list of the worst offenders.
- Combined score: weighted (e.g. 70% pixel SSIM + 30% structural).

### 3. Rebuild loop
- If score < 98%: feed the structural diff list back into the Elementor build step (or the AI content step) as corrective hints, regenerate, republish to a **draft**, re-render, re-compare.
- Hard cap retries (e.g. 3) to bound cost; keep the best-scoring attempt and report the final score + remaining diff regions to the user.

## Data model
New table `page_render_checks`:
- `id`, `workspace_id`, `generated_page_id`, `template_id`
- `score numeric`, `pixel_score numeric`, `structural_score numeric`
- `diff_regions jsonb`, `attempt int`, `status` (`pending|rendering|passed|failed`)
- `template_screenshot_url`, `published_screenshot_url` (Storage)
- workspace-scoped RLS + GRANTs, partitioned by `workspace_id` (per project convention).

## New pieces
- `supabase/functions/compare-pages/index.ts` — orchestrator: triggers render, computes score, stores result, decides rebuild.
- `_shared/visual-diff.ts` — SSIM/pixelmatch + structural diff helpers (pure TS, runs in Deno once screenshots exist).
- Render worker — **external** service (not in the Deno edge runtime). Either a managed screenshot API (fastest to ship, needs an API key secret) or a self-hosted Playwright service.
- Storage bucket `render-checks` for screenshots.
- UI: a "Visual fidelity" badge + diff viewer on the generated-pages / publish result screen.

## Key decisions needed from you
1. **Render backend:** managed screenshot API (quickest, costs per render, needs API key) vs. self-hosted Playwright (more setup, no per-call fee). 
2. **Where to apply rebuild hints:** only AI content, only Elementor structure, or both.
3. **Retry budget** per page (default 3) and whether checks run on every publish or on-demand.

## Cost / scope notes
- Each check = 2 renders + diff; the rebuild loop multiplies that by retries. For large campaigns this is significant — recommend on-demand or sampled checks rather than every page by default.
- This is a multi-step build (worker + edge fn + table + UI), not a single edit.

## Out of scope for v1
- Perfect 100% match (anti-aliasing/font-rendering differences make 98% the practical ceiling).
- Diffing dynamic/interactive states (hover, carousels) — static first paint only.
