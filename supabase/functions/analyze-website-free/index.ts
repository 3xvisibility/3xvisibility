// Public homepage website analyzer.
// Fetches a public URL, extracts on-page SEO / AI-visibility signals and
// returns a scored report used by the landing page "Analyze my website" widget.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Check = {
  id: string;
  label: string;
  status: "good" | "warn" | "bad";
  detail: string;
  /** Which tool inside the platform fixes this. */
  fix: string;
};

function text(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return m ? m[1].trim() : "";
}

function metaContent(html: string, key: string, kind: "name" | "property"): string {
  const re = new RegExp(`<meta[^>]*${kind}\\s*=\\s*["']${key}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  return tag ? attr(tag, "content") : "";
}

function normalizeUrl(raw: string): string | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (!u.hostname.includes(".")) return null;
    // Block obvious internal targets.
    if (/^(localhost|127\.|10\.|192\.168\.|0\.0\.0\.0|\[)/i.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function score(checks: Check[]): number {
  if (!checks.length) return 0;
  const pts = checks.reduce((s, c) => s + (c.status === "good" ? 1 : c.status === "warn" ? 0.5 : 0), 0);
  return Math.round((pts / checks.length) * 100);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const target = normalizeUrl(String(body?.url ?? ""));
    if (!target) {
      return new Response(JSON.stringify({ error: "Please enter a valid website URL." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const started = Date.now();
    let html = "";
    let statusCode = 0;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(target, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "Mozilla/5.0 (compatible; 3xVisibilityBot/1.0; +https://3xvisibility.com)" },
      });
      clearTimeout(timer);
      statusCode = res.status;
      html = await res.text();
    } catch (_e) {
      return new Response(
        JSON.stringify({ error: "We couldn't reach that website. Check the URL and try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const loadMs = Date.now() - started;
    const origin = new URL(target).origin;
    const host = new URL(target).hostname;

    // ---- extract signals -------------------------------------------------
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
    const description = metaContent(html, "description", "name");
    const canonical = attr(html.match(/<link[^>]*rel\s*=\s*["']canonical["'][^>]*>/i)?.[0] ?? "", "href");
    const ogTitle = metaContent(html, "og:title", "property");
    const ogImage = metaContent(html, "og:image", "property");
    const viewport = metaContent(html, "viewport", "name");
    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => text(m[1])).filter(Boolean);
    const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].length;
    const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
    const imgsNoAlt = imgs.filter((t) => !attr(t, "alt")).length;
    const links = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
    const internalLinks = links.filter((h) => h.startsWith("/") || h.startsWith(origin)).length;
    const jsonLd = [...html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const bodyText = text(html);
    const words = bodyText ? bodyText.split(/\s+/).length : 0;
    const isHttps = target.startsWith("https://");

    let robotsOk: boolean | null = null;
    let sitemapOk: boolean | null = null;
    try {
      const r = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(6000) });
      const txt = r.ok ? await r.text() : "";
      robotsOk = r.ok && !/^\s*disallow:\s*\/\s*$/im.test(txt);
      sitemapOk = /sitemap:/i.test(txt);
    } catch { /* ignore */ }
    if (!sitemapOk) {
      try {
        const s = await fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(6000) });
        sitemapOk = s.ok;
      } catch { /* ignore */ }
    }

    // ---- checks ----------------------------------------------------------
    const seo: Check[] = [
      {
        id: "title",
        label: "Page title",
        status: !title ? "bad" : title.length >= 30 && title.length <= 60 ? "good" : "warn",
        detail: title ? `"${title.slice(0, 70)}" — ${title.length} characters` : "No <title> tag found",
        fix: "SEO Optimizer rewrites titles to the 30–60 character sweet spot.",
      },
      {
        id: "description",
        label: "Meta description",
        status: !description ? "bad" : description.length >= 70 && description.length <= 160 ? "good" : "warn",
        detail: description ? `${description.length} characters` : "Missing meta description",
        fix: "AI writes a click-worthy description for every page.",
      },
      {
        id: "h1",
        label: "H1 heading",
        status: h1s.length === 1 ? "good" : h1s.length === 0 ? "bad" : "warn",
        detail: h1s.length === 0 ? "No H1 found" : `${h1s.length} H1 tag(s)`,
        fix: "Content generator enforces exactly one keyword-rich H1.",
      },
      {
        id: "headings",
        label: "Heading structure",
        status: h2s >= 3 ? "good" : h2s >= 1 ? "warn" : "bad",
        detail: `${h2s} H2 section heading(s)`,
        fix: "Section-scoped AI rewriting builds a full H2/H3 outline.",
      },
      {
        id: "content",
        label: "Content depth",
        status: words >= 800 ? "good" : words >= 300 ? "warn" : "bad",
        detail: `${words.toLocaleString()} words on the page`,
        fix: "Bulk page generation adds depth without losing your design.",
      },
      {
        id: "canonical",
        label: "Canonical URL",
        status: canonical ? "good" : "warn",
        detail: canonical ? canonical.slice(0, 80) : "No canonical link",
        fix: "One-click fixes inject canonical tags on publish.",
      },
      {
        id: "images",
        label: "Image alt text",
        status: imgs.length === 0 ? "warn" : imgsNoAlt === 0 ? "good" : imgsNoAlt / imgs.length < 0.3 ? "warn" : "bad",
        detail: imgs.length ? `${imgsNoAlt} of ${imgs.length} images missing alt text` : "No images detected",
        fix: "AI captioning fills alt text across the whole site.",
      },
      {
        id: "links",
        label: "Internal linking",
        status: internalLinks >= 10 ? "good" : internalLinks >= 3 ? "warn" : "bad",
        detail: `${internalLinks} internal link(s)`,
        fix: "Internal link builder connects related pages automatically.",
      },
    ];

    const aiVisibility: Check[] = [
      {
        id: "schema",
        label: "Structured data (JSON-LD)",
        status: jsonLd.length ? "good" : "bad",
        detail: jsonLd.length ? `${jsonLd.length} JSON-LD block(s)` : "No schema markup — AI engines can't parse your entity",
        fix: "Schema generator adds Organization, FAQ and Product markup.",
      },
      {
        id: "og",
        label: "Social / AI preview tags",
        status: ogTitle && ogImage ? "good" : ogTitle || ogImage ? "warn" : "bad",
        detail: `og:title ${ogTitle ? "✓" : "✗"} · og:image ${ogImage ? "✓" : "✗"}`,
        fix: "Publishing pipeline writes complete Open Graph tags.",
      },
      {
        id: "answers",
        label: "Answer-ready content",
        status: /<h[23][^>]*>[^<]*\?/i.test(html) ? "good" : "warn",
        detail: /<h[23][^>]*>[^<]*\?/i.test(html) ? "Question-style headings found" : "No question-based (FAQ) headings",
        fix: "GEO mode writes FAQ blocks that LLMs quote directly.",
      },
      {
        id: "entity",
        label: "Brand entity clarity",
        status: new RegExp(host.split(".")[0], "i").test(title) ? "good" : "warn",
        detail: new RegExp(host.split(".")[0], "i").test(title)
          ? "Brand name present in the title"
          : "Brand name missing from the title tag",
        fix: "Brand variables keep your name consistent on every page.",
      },
    ];

    const technical: Check[] = [
      {
        id: "https",
        label: "HTTPS",
        status: isHttps ? "good" : "bad",
        detail: isHttps ? "Secure connection" : "Site is not served over HTTPS",
        fix: "Site health checks flag insecure pages before publishing.",
      },
      {
        id: "status",
        label: "HTTP response",
        status: statusCode >= 200 && statusCode < 300 ? "good" : "bad",
        detail: `Status ${statusCode}`,
        fix: "Indexing monitor alerts you when pages break.",
      },
      {
        id: "speed",
        label: "Server response time",
        status: loadMs < 800 ? "good" : loadMs < 2500 ? "warn" : "bad",
        detail: `${loadMs} ms to first byte of HTML`,
        fix: "Lightweight HTML/CSS publishing keeps pages fast.",
      },
      {
        id: "viewport",
        label: "Mobile viewport",
        status: viewport ? "good" : "bad",
        detail: viewport ? "Responsive viewport set" : "No viewport meta tag",
        fix: "Templates ship mobile-first by default.",
      },
      {
        id: "robots",
        label: "robots.txt",
        status: robotsOk === true ? "good" : robotsOk === false ? "bad" : "warn",
        detail: robotsOk === true ? "Crawlable" : robotsOk === false ? "Crawlers are blocked" : "robots.txt not found",
        fix: "Robots validator checks crawlability on every publish.",
      },
      {
        id: "sitemap",
        label: "XML sitemap",
        status: sitemapOk ? "good" : "bad",
        detail: sitemapOk ? "Sitemap discovered" : "No sitemap found",
        fix: "Sitemap builder + IndexNow pings submit new pages instantly.",
      },
    ];

    const seoScore = score(seo);
    const aiScore = score(aiVisibility);
    const techScore = score(technical);
    const overall = Math.round(seoScore * 0.4 + aiScore * 0.3 + techScore * 0.3);

    const issues = [...seo, ...aiVisibility, ...technical].filter((c) => c.status !== "good");

    return new Response(
      JSON.stringify({
        url: target,
        host,
        analyzedAt: new Date().toISOString(),
        title,
        description,
        overall,
        categories: [
          { key: "seo", label: "SEO foundations", score: seoScore, checks: seo },
          { key: "ai", label: "AI / GEO visibility", score: aiScore, checks: aiVisibility },
          { key: "technical", label: "Technical health", score: techScore, checks: technical },
        ],
        issueCount: issues.length,
        topFixes: issues.slice(0, 5).map((c) => ({ label: c.label, detail: c.detail, fix: c.fix })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("analyze-website-free failed", e);
    return new Response(JSON.stringify({ error: "Analysis failed. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
