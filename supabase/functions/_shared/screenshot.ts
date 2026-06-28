// ScreenshotOne capture + PNG normalization helpers for the visual-validation gate.
//
// Runs inside the Deno edge runtime. ScreenshotOne renders the page to a PNG
// (the edge runtime has no headless browser), and we decode + downscale the PNG
// to a fixed RGBA grid so two screenshots of differing heights can be compared
// pixel-for-pixel.

import UPNG from "npm:upng-js@2.1.0";

const SCREENSHOTONE_ENDPOINT = "https://api.screenshotone.com/take";

/** Fixed comparison grid. Both screenshots are normalized to this size. */
export const GRID_W = 96;
export const GRID_H = 96;

export interface CaptureInput {
  /** Render a live URL. */
  url?: string;
  /** Render raw HTML. */
  html?: string;
}

export interface CaptureResult {
  /** Raw PNG bytes returned by the provider. */
  png: Uint8Array;
  /** Normalized RGBA buffer (GRID_W * GRID_H * 4). */
  grid: Uint8Array;
  width: number;
  height: number;
}

/** Capture a screenshot via ScreenshotOne and normalize it for diffing. */
export async function captureScreenshot(
  accessKey: string,
  input: CaptureInput,
): Promise<CaptureResult> {
  if (!input.url && !input.html) {
    throw new Error("captureScreenshot requires a url or html");
  }

  const body: Record<string, unknown> = {
    access_key: accessKey,
    format: "png",
    viewport_width: 1280,
    viewport_height: 2000,
    full_page: true,
    full_page_max_height: 6000,
    block_ads: true,
    block_cookie_banners: true,
    block_chats: true,
    cache: false,
    device_scale_factor: 1,
  };
  if (input.url) body.url = input.url;
  if (input.html) body.html = input.html;

  const res = await fetch(SCREENSHOTONE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok || !contentType.startsWith("image/")) {
    let detail = "";
    try {
      detail = contentType.includes("json")
        ? JSON.stringify(await res.json())
        : await res.text();
    } catch {
      detail = `HTTP ${res.status}`;
    }
    throw new Error(`ScreenshotOne error (${res.status}): ${detail.slice(0, 400)}`);
  }

  const png = new Uint8Array(await res.arrayBuffer());
  return normalizePng(png);
}

/** Download an already-stored screenshot (baseline image) and normalize it. */
export async function captureFromImageUrl(imageUrl: string): Promise<CaptureResult> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Baseline image fetch failed (${res.status})`);
  const png = new Uint8Array(await res.arrayBuffer());
  return normalizePng(png);
}

/** Decode a PNG and box-downscale it to the fixed comparison grid. */
export function normalizePng(png: Uint8Array): CaptureResult {
  const decoded = UPNG.decode(png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength));
  const frames = UPNG.toRGBA8(decoded);
  const rgba = new Uint8Array(frames[0]);
  const grid = boxDownscale(rgba, decoded.width, decoded.height, GRID_W, GRID_H);
  return { png, grid, width: decoded.width, height: decoded.height };
}

/** Average-pool an RGBA buffer down to dstW x dstH. */
function boxDownscale(
  src: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8Array {
  const out = new Uint8Array(dstW * dstH * 4);
  if (srcW === 0 || srcH === 0) return out;
  for (let dy = 0; dy < dstH; dy++) {
    const sy0 = Math.floor((dy * srcH) / dstH);
    const sy1 = Math.max(sy0 + 1, Math.floor(((dy + 1) * srcH) / dstH));
    for (let dx = 0; dx < dstW; dx++) {
      const sx0 = Math.floor((dx * srcW) / dstW);
      const sx1 = Math.max(sx0 + 1, Math.floor(((dx + 1) * srcW) / dstW));
      let r = 0, g = 0, b = 0, a = 0, count = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * srcW + sx) * 4;
          r += src[i]; g += src[i + 1]; b += src[i + 2]; a += src[i + 3];
          count++;
        }
      }
      const di = (dy * dstW + dx) * 4;
      if (count > 0) {
        out[di] = Math.round(r / count);
        out[di + 1] = Math.round(g / count);
        out[di + 2] = Math.round(b / count);
        out[di + 3] = Math.round(a / count);
      }
    }
  }
  return out;
}
