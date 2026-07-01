/**
 * Template image caching.
 *
 * AI-built pages (from the AI Site Builder) reference on-demand image
 * generators such as pollinations.ai. Those URLs are:
 *   - slow to render (the image is generated fresh on every request), and
 *   - aggressively rate-limited (HTTP 429) when hit repeatedly.
 *
 * Re-fetching them during publish validation + generation + media import means
 * hitting the same volatile host many times, which reliably trips the rate
 * limit and aborts publishing.
 *
 * This module downloads each volatile image ONCE into the public `ai-images`
 * storage bucket (keyed by a stable hash of the source URL, so identical URLs
 * are only ever downloaded once across all runs) and returns the HTML rewritten
 * to those stable, fast, un-throttled bucket URLs.
 */

/** Hosts whose image URLs are generated on-demand / rate-limited and must be cached. */
const VOLATILE_IMAGE_HOST_RE =
  /^https?:\/\/(?:[a-z0-9-]+\.)*(pollinations\.ai|loremflickr\.com|picsum\.photos|source\.unsplash\.com)\//i;

const CACHE_PREFIX = "template-cache";

/** How long a lock-loser waits between polls, and how many times, for the winner's result. */
const LOCK_WAIT_MS = 2000;
const LOCK_WAIT_ATTEMPTS = 20; // ~40s worst case before falling back to self-download

/** Default time-to-live for a cached image before it is considered stale and re-fetched. */
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Per-bucket, per-isolate in-flight cache promises for same-run dedup. */
const inFlightByBucket = new Map<string, Map<string, Promise<string | null>>>();

function isHttpUrl(u: string): boolean {
  return /^https?:\/\//i.test(u);
}

/** Should this URL be cached into the bucket? */
export function isVolatileImageUrl(url: string): boolean {
  return isHttpUrl(url) && VOLATILE_IMAGE_HOST_RE.test(url);
}

/** Collect every image URL referenced in the HTML (img src/srcset, CSS url()). */
function collectImageUrls(html: string): Set<string> {
  const urls = new Set<string>();
  if (!html) return urls;
  const add = (u: string) => {
    const v = (u || "").trim();
    if (v) urls.add(v);
  };
  const imgRe = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) add(m[1]);
  const srcsetRe = /\bsrcset\s*=\s*["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html)) !== null) {
    for (const part of m[1].split(",")) add(part.trim().split(/\s+/)[0]);
  }
  const cssRe = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  while ((m = cssRe.exec(html)) !== null) {
    if (!m[1].startsWith("data:")) add(m[1]);
  }
  return urls;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function extFromUrlOrContentType(url: string, contentType: string | null): string {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("avif")) return "avif";
  const m = url.match(/\.(png|jpe?g|webp|gif|avif)(?:[?#]|$)/i);
  if (m) return m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase();
  return "jpg";
}

function contentTypeForExt(ext: string): string {
  switch (ext) {
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    case "avif": return "image/avif";
    default: return "image/jpeg";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Download a URL with retry/backoff — tolerant of transient 429/5xx rate limits. */
async function downloadWithRetry(url: string, attempts = 4): Promise<Uint8Array | null> {
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(1500 * i);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 30_000);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          // Some generators reject default fetch UAs.
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
          Accept: "image/*,*/*;q=0.8",
        },
      });
      clearTimeout(t);
      if (res.ok) {
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.byteLength > 0) return buf;
      }
      // transient (429/408/5xx) → retry; definitive 4xx → give up
      if (res.status !== 429 && res.status !== 408 && res.status < 500) return null;
    } catch (_) {
      // network/abort → retry
    }
  }
  return null;
}

export interface CacheResult {
  /** HTML with volatile image URLs rewritten to cached bucket URLs. */
  html: string;
  /** True when at least one URL was rewritten. */
  changed: boolean;
  /** Map of original URL → cached bucket URL for any URLs that were cached. */
  urlMap: Record<string, string>;
}

/**
 * Cache every volatile image referenced by `html` into the `ai-images` bucket
 * and return the HTML rewritten to the stable cached URLs.
 *
 * Caching is idempotent: the bucket path is derived from a hash of the source
 * URL, so an image is only downloaded the first time it is ever seen. On later
 * runs the existing public bucket URL is reused without any network fetch to the
 * volatile host.
 */
export async function cacheVolatileTemplateImages(
  supabase: any,
  html: string,
  options: { bucket?: string; maxImages?: number } = {},
): Promise<CacheResult> {
  const bucket = options.bucket ?? "ai-images";
  const maxImages = options.maxImages ?? 40;
  const urlMap: Record<string, string> = {};
  if (!html) return { html, changed: false, urlMap };

  const volatile = [...collectImageUrls(html)].filter(isVolatileImageUrl).slice(0, maxImages);
  if (volatile.length === 0) return { html, changed: false, urlMap };

  const store = supabase.storage.from(bucket);

  // In-process dedup: if this same isolate is already caching a URL (e.g. it
  // appears multiple times in the HTML), reuse the same in-flight promise
  // instead of downloading it twice.
  const inFlight = inFlightByBucket.get(bucket) ?? new Map<string, Promise<string | null>>();
  inFlightByBucket.set(bucket, inFlight);

  /** Probe the stable candidate paths for an already-cached copy. */
  const findCached = async (hash: string): Promise<string | null> => {
    for (const ext of ["jpg", "png", "webp"]) {
      const path = `${CACHE_PREFIX}/${hash}.${ext}`;
      const pub = store.getPublicUrl(path)?.data?.publicUrl;
      if (!pub) continue;
      try {
        const head = await fetch(pub, { method: "HEAD" });
        if (head.ok) return pub;
      } catch (_) { /* not cached yet */ }
    }
    return null;
  };

  /**
   * Cross-process lock: only one publish may download a given image at a time.
   * The lock is a zero-byte marker object created atomically with `upsert:false`
   * — Storage rejects a duplicate create, so exactly one worker wins. Losers
   * poll for the winner's cached image to appear instead of re-downloading.
   */
  const acquireLock = async (hash: string): Promise<boolean> => {
    const lockPath = `${CACHE_PREFIX}/${hash}.lock`;
    const { error } = await store.upload(lockPath, new Uint8Array(0), {
      contentType: "application/octet-stream",
      upsert: false, // atomic create — fails if another worker already holds it
    });
    return !error;
  };
  const releaseLock = async (hash: string): Promise<void> => {
    try { await store.remove([`${CACHE_PREFIX}/${hash}.lock`]); } catch (_) { /* best effort */ }
  };

  const doCacheOne = async (url: string): Promise<string | null> => {
    const hash = await sha256Hex(url);

    // 1. Already cached? Reuse without downloading.
    const existing = await findCached(hash);
    if (existing) return existing;

    // 2. Try to acquire the cross-process lock.
    if (!(await acquireLock(hash))) {
      // Another publish is downloading this exact image right now. Poll for its
      // cached result rather than downloading the same image a second time.
      for (let i = 0; i < LOCK_WAIT_ATTEMPTS; i++) {
        await sleep(LOCK_WAIT_MS);
        const cached = await findCached(hash);
        if (cached) return cached;
      }
      // Lock holder stalled/failed — fall through and download ourselves.
    }

    try {
      // Re-check after acquiring the lock in case the winner finished between
      // our probe and our lock acquisition.
      const cached = await findCached(hash);
      if (cached) return cached;

      const bytes = await downloadWithRetry(url);
      if (!bytes) return null; // leave original URL; validation retry-logic handles it

      // We can't cheaply read content-type from downloadWithRetry, so infer
      // from the URL; default jpg. (Bucket serves whatever bytes we store.)
      const ext = extFromUrlOrContentType(url, null);
      const path = `${CACHE_PREFIX}/${hash}.${ext}`;
      const { error: upErr } = await store.upload(path, bytes, {
        contentType: contentTypeForExt(ext),
        upsert: true,
      });
      if (upErr) {
        console.error("[image-cache] upload failed:", upErr.message || upErr);
        return null;
      }
      return store.getPublicUrl(path)?.data?.publicUrl ?? null;
    } finally {
      await releaseLock(hash);
    }
  };

  const cacheOne = async (url: string): Promise<void> => {
    try {
      let promise = inFlight.get(url);
      if (!promise) {
        promise = doCacheOne(url);
        inFlight.set(url, promise);
      }
      const pub = await promise;
      if (pub) urlMap[url] = pub;
    } catch (e) {
      console.error("[image-cache] cacheOne error:", (e as Error).message);
    }
  };

  // Limited concurrency so we don't trip the volatile host's rate limit ourselves.
  const CONCURRENCY = 3;
  for (let i = 0; i < volatile.length; i += CONCURRENCY) {
    await Promise.all(volatile.slice(i, i + CONCURRENCY).map(cacheOne));
  }

  let out = html;
  let changed = false;
  for (const [from, to] of Object.entries(urlMap)) {
    if (from !== to) {
      out = out.split(from).join(to);
      changed = true;
    }
  }
  return { html: out, changed, urlMap };
}
