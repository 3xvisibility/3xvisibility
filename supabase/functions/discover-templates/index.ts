import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { aiGenerate, deductCreditsForRequest } from "../_shared/ai-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DiscoveredPage {
  url: string;
  title: string;
  type: string;
  headings: { tag: string; text: string }[];
  textSnippet: string;
  bodyHtml: string;
  headStyles?: string;
}

interface UrlGroup {
  pattern: string;
  patternLabel: string;
  pages: string[];
  suggestedVariables: string[];
}

function resolveRelativeUrls(html: string, baseUrl: string): string {
  let origin: string;
  let basePath: string;
  try {
    const u = new URL(baseUrl);
    origin = u.origin;
    basePath = baseUrl.replace(/\/[^/]*$/, "/");
  } catch {
    return html;
  }
  return html.replace(
    /(src|href|srcset|poster|data-src|data-lazy-src|data-original|action)=["']([^"']+)["']/gi,
    (full, attr, value) => {
      if (/^(https?:|data:|mailto:|javascript:|#|\{)/i.test(value)) return full;
      let resolved: string;
      if (value.startsWith("//")) {
        resolved = "https:" + value;
      } else if (value.startsWith("/")) {
        resolved = origin + value;
      } else {
        resolved = basePath + value;
      }
      return `${attr}="${resolved}"`;
    }
  );
}

function extractHeadStyles(html: string, baseUrl?: string): string {
  const styles: string[] = [];
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (headMatch) {
    // Extract <link rel="stylesheet"> tags
    const linkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*>/gi;
    let lm;
    while ((lm = linkRegex.exec(headMatch[1])) !== null) {
      let tag = lm[0];
      if (baseUrl) {
        const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
        if (hrefMatch) {
          let href = hrefMatch[1];
          if (href.startsWith("//")) href = "https:" + href;
          else if (href.startsWith("/")) {
            try { href = new URL(baseUrl).origin + href; } catch {}
          } else if (!href.startsWith("http")) {
            href = baseUrl.replace(/\/[^/]*$/, "/") + href;
          }
          tag = tag.replace(hrefMatch[1], href);
        }
      }
      styles.push(tag);
    }
    // Extract inline <style> blocks
    const styleRegex = /<style[^>]*>[\s\S]*?<\/style>/gi;
    let m;
    while ((m = styleRegex.exec(headMatch[1])) !== null) {
      styles.push(m[0]);
    }
  }
  // Also grab body inline styles (Elementor, Divi, etc. inject styles in body)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const bodyStyleRegex = /<style[^>]*>[\s\S]*?<\/style>/gi;
    let bs;
    while ((bs = bodyStyleRegex.exec(bodyMatch[1])) !== null) {
      styles.push(bs[0]);
    }
  }
  return styles.join("\n");
}

function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const content = bodyMatch ? bodyMatch[1] : html;
  // Keep <style> tags (page builder inline styles), remove scripts/nav/footer
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

function extractHeadings(html: string): { tag: string; text: string }[] {
  const headings: { tag: string; text: string }[] = [];
  const regex = /<(h[1-3])[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, "").trim();
    if (text.length > 1 && text.length < 300) {
      headings.push({ tag: match[1].toLowerCase(), text });
    }
  }
  return headings;
}

function extractTextSnippet(html: string): string {
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const texts: string[] = [];
  let m;
  while ((m = pRegex.exec(html)) !== null && texts.length < 3) {
    const t = m[1].replace(/<[^>]*>/g, "").trim();
    if (t.length > 20) texts.push(t);
  }
  return texts.join(" ").slice(0, 500);
}

function classifyPage(url: string, headings: { tag: string; text: string }[], text: string): string {
  const lower = (url + " " + headings.map((h) => h.text).join(" ") + " " + text).toLowerCase();
  if (/blog|article|news|post/.test(lower)) return "blog";
  if (/product|shop|buy|price|\$|€/.test(lower)) return "product";
  if (/service|solution|offering/.test(lower)) return "service";
  if (/location|city|office|branch|near|area/.test(lower)) return "location";
  if (/about|team|who we are/.test(lower)) return "about";
  if (/contact|get in touch|reach/.test(lower)) return "contact";
  if (/landing|offer|special|promo/.test(lower)) return "landing";
  return "page";
}

/** Fetch a public page and return full design-preserved content */
async function fetchRenderedPage(pageUrl: string): Promise<DiscoveredPage | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const resp = await fetch(pageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PageGenBot/1.0)", Accept: "text/html" },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const ct = resp.headers.get("content-type") || "";
    if (!ct.includes("html")) return null;

    const rawHtml = await resp.text();
    const resolvedHtml = resolveRelativeUrls(rawHtml, pageUrl);
    const headStyles = extractHeadStyles(resolvedHtml, pageUrl);
    const bodyHtml = extractBodyContent(resolvedHtml);
    const headings = extractHeadings(bodyHtml);
    const textSnippet = extractTextSnippet(bodyHtml);

    const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]*>/g, "").trim()
      : headings[0]?.text || pageUrl;

    const type = classifyPage(pageUrl, headings, textSnippet);

    return { url: pageUrl, title, type, headings, textSnippet, bodyHtml, headStyles };
  } catch {
    return null;
  }
}

function discoverLinks(html: string, baseUrl: string): string[] {
  const links: Set<string> = new Set();
  const regex = /href=["']([^"'#]+)["']/gi;
  let match;
  const base = new URL(baseUrl);

  while ((match = regex.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], baseUrl);
      if (resolved.hostname === base.hostname && resolved.pathname !== "/" && !resolved.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|pdf|zip|xml|json|woff|ttf)$/i)) {
        resolved.hash = "";
        resolved.search = "";
        links.add(resolved.href);
      }
    } catch { /* skip invalid */ }
  }
  return [...links];
}

function groupPagesByUrlPattern(pages: DiscoveredPage[]): UrlGroup[] {
  const patternMap = new Map<string, { pages: string[]; segments: string[][] }>();

  for (const page of pages) {
    try {
      const parsed = new URL(page.url);
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments.length === 0) continue;
      if (segments.length >= 2) {
        const patternSegs = [...segments];
        patternSegs[patternSegs.length - 1] = "{slug}";
        const pattern = "/" + patternSegs.join("/");
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, { pages: [], segments: [] });
        }
        const group = patternMap.get(pattern)!;
        group.pages.push(page.url);
        group.segments.push(segments);
      }
    } catch { /* skip */ }
  }

  const groups: UrlGroup[] = [];
  for (const [pattern, data] of patternMap) {
    if (data.pages.length >= 2) {
      const parentPath = data.segments[0].slice(0, -1).join("/");
      groups.push({
        pattern,
        patternLabel: `${parentPath ? parentPath + "/" : ""}{slug} (${data.pages.length} pages)`,
        pages: data.pages,
        suggestedVariables: ["slug"],
      });
    }
  }
  groups.sort((a, b) => b.pages.length - a.pages.length);
  return groups;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, url, website_id } = body;

    // ACTION: Analyze patterns across multiple pages using AI
    if (action === "analyze-patterns") {
      const { pages } = body as { pages: { title: string; headings: { tag: string; text: string }[]; textSnippet: string; type: string; url?: string }[]; action: string };

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: "AI not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pagesForAi = pages.slice(0, 30).map((p) => ({
        title: p.title,
        type: p.type,
        url: p.url || "",
        h1: p.headings.find((h) => h.tag === "h1")?.text || "",
        snippet: p.textSnippet.slice(0, 200),
        }));

      const credit = await deductCreditsForRequest(req, "default", "google/gemini-2.5-flash-lite");
      if (!credit.allowed) {
        return new Response(JSON.stringify({
          error: credit.error === "insufficient_credits"
            ? `Insufficient AI credits (remaining: ${credit.remaining ?? 0}). Please upgrade your plan.`
            : "Authentication required to use AI features.",
          remaining: credit.remaining ?? 0,
        }), {
          status: credit.error === "insufficient_credits" ? 402 : 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Cost optimization: lite tier sufficient for pattern detection / classification
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are analyzing pages from a website to detect patterns suitable for template generation.
Look for pages that follow similar structures but with different specific values (product names, services, categories, audiences, brands, industries, locations, models, etc.).
Pay special attention to repeating URL patterns where one or more segments vary between otherwise similar pages.
Group similar pages and suggest template patterns with variable placeholders.
Only suggest patterns where at least 2 pages share the same structure with different values.`,
            },
            {
              role: "user",
              content: `Analyze these pages and detect template patterns:\n${JSON.stringify(pagesForAi, null, 2)}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "detect_patterns",
                description: "Return detected template patterns from the website pages",
                parameters: {
                  type: "object",
                  properties: {
                    patterns: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string", description: "Pattern name" },
                          template: { type: "string", description: "Template string" },
                          variables: { type: "array", items: { type: "string" } },
                          matchingPages: { type: "array", items: { type: "string" } },
                          confidence: { type: "string", enum: ["high", "medium", "low"] },
                        },
                        required: ["name", "template", "variables", "matchingPages", "confidence"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["patterns"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "detect_patterns" } },
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI error:", errText);
        return new Response(JSON.stringify({ error: "AI analysis failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let patterns: any[] = [];
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        patterns = parsed.patterns || [];
      }

      return new Response(JSON.stringify({ success: true, patterns }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: Crawl from connected website — fetch rendered public pages for exact design
    if (action === "crawl-connected" && website_id) {
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: website, error: wsError } = await supabase
        .from("websites")
        .select("*")
        .eq("id", website_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (wsError || !website) {
        return new Response(JSON.stringify({ error: "Website not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const creds = website.credentials as Record<string, string> | null;
      const siteUrl = website.url.replace(/\/+$/, "");
      const pages: DiscoveredPage[] = [];

      // Step 1: Collect page URLs from CMS API
      const pageUrls: { url: string; title: string; apiBodyHtml?: string }[] = [];

      if (website.type === "wordpress") {
        const headers: Record<string, string> = { "User-Agent": "Mozilla/5.0 (compatible; PageGenBot/1.0)" };
        if (creds?.username && (creds?.app_password || creds?.password)) {
          headers["Authorization"] = `Basic ${btoa(`${creds.username}:${creds.app_password || creds.password}`)}`;
        }

        for (const endpoint of ["pages", "posts"]) {
          try {
            for (let page = 1; page <= 2 && pageUrls.length < 100; page++) {
              const wpResp = await fetch(`${siteUrl}/wp-json/wp/v2/${endpoint}?per_page=50&page=${page}&status=publish`, { headers });
              if (!wpResp.ok) break;
              const items = await wpResp.json();
              if (items.length === 0) break;
              for (const item of items) {
                if (pageUrls.length >= 100) break;
                const title = item.title?.rendered?.replace(/<[^>]*>/g, "") || `${endpoint} ${item.id}`;
                pageUrls.push({
                  url: item.link || `${siteUrl}/${item.slug}`,
                  title,
                  apiBodyHtml: item.content?.rendered || "",
                });
              }
            }
          } catch { /* skip */ }
        }
      } else if (website.type === "shopify") {
        const shopDomain = siteUrl.replace(/^https?:\/\//, "");
        const accessToken = creds?.admin_api_token || creds?.access_token || creds?.jwt_token || "";

        if (accessToken) {
          try {
            const pagesResp = await fetch(`https://${shopDomain}/admin/api/2024-01/pages.json?limit=50`, {
              headers: { "X-Shopify-Access-Token": accessToken },
            });
            if (pagesResp.ok) {
              const { pages: shopPages } = await pagesResp.json();
              for (const sp of shopPages) {
                if (pageUrls.length >= 100) break;
                pageUrls.push({
                  url: `https://${shopDomain}/pages/${sp.handle}`,
                  title: sp.title,
                });
              }
            }
          } catch { /* skip */ }

          try {
            const prodResp = await fetch(`https://${shopDomain}/admin/api/2024-01/products.json?limit=50`, {
              headers: { "X-Shopify-Access-Token": accessToken },
            });
            if (prodResp.ok) {
              const { products } = await prodResp.json();
              for (const p of products) {
                if (pageUrls.length >= 100) break;
                pageUrls.push({
                  url: `https://${shopDomain}/products/${p.handle}`,
                  title: p.title,
                });
              }
            }
          } catch { /* skip */ }
        }
      } else if (website.type === "prestashop") {
        const apiKey = creds?.api_key || "";
        if (apiKey) {
          const auth = btoa(`${apiKey}:`);
          try {
            const cmsResp = await fetch(`${siteUrl}/api/cms?output_format=JSON&display=full&limit=50`, {
              headers: { Authorization: `Basic ${auth}` },
            });
            if (cmsResp.ok) {
              const data = await cmsResp.json();
              const cmsList = data.cms_pages || data.cms || [];
              for (const item of cmsList) {
                if (pageUrls.length >= 100) break;
                const id = item.id;
                const linkRewrite = item.link_rewrite?.[0]?.value || item.link_rewrite || `page-${id}`;
                pageUrls.push({
                  url: `${siteUrl}/content/${id}-${linkRewrite}`,
                  title: item.meta_title?.[0]?.value || item.meta_title || `Page ${id}`,
                });
              }
            }
          } catch { /* skip */ }
        }
      } else if (website.type === "woocommerce") {
        // WooCommerce uses WP REST API + WC endpoints
        const consumerKey = creds?.consumer_key || "";
        const consumerSecret = creds?.consumer_secret || "";
        if (consumerKey && consumerSecret) {
          try {
            const prodResp = await fetch(`${siteUrl}/wp-json/wc/v3/products?per_page=50&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`);
            if (prodResp.ok) {
              const products = await prodResp.json();
              for (const p of products) {
                if (pageUrls.length >= 100) break;
                pageUrls.push({
                  url: p.permalink || `${siteUrl}/product/${p.slug}`,
                  title: p.name || `Product ${p.id}`,
                });
              }
            }
          } catch { /* skip */ }
        }
        // Also fetch WP pages
        try {
          const wpResp = await fetch(`${siteUrl}/wp-json/wp/v2/pages?per_page=50&status=publish`);
          if (wpResp.ok) {
            const items = await wpResp.json();
            for (const item of items) {
              if (pageUrls.length >= 100) break;
              pageUrls.push({
                url: item.link || `${siteUrl}/${item.slug}`,
                title: item.title?.rendered?.replace(/<[^>]*>/g, "") || `Page ${item.id}`,
              });
            }
          }
        } catch { /* skip */ }
      }

      // Step 2: Fetch rendered public pages for exact design (batch of 5)
      console.log(`Fetching ${pageUrls.length} rendered pages from ${website.name} (${website.type})`);
      
      for (let i = 0; i < pageUrls.length; i += 5) {
        const batch = pageUrls.slice(i, i + 5);
        const results = await Promise.all(
          batch.map(async (pu) => {
            const rendered = await fetchRenderedPage(pu.url);
            if (rendered) {
              // Use API title if available (more reliable)
              rendered.title = pu.title || rendered.title;
              return rendered;
            }
            // Fallback: use API body if rendered page couldn't be fetched
            if (pu.apiBodyHtml) {
              const headings = extractHeadings(pu.apiBodyHtml);
              const textSnippet = extractTextSnippet(pu.apiBodyHtml);
              return {
                url: pu.url,
                title: pu.title,
                type: classifyPage(pu.url, headings, textSnippet),
                headings,
                textSnippet,
                bodyHtml: pu.apiBodyHtml,
                headStyles: "",
              } as DiscoveredPage;
            }
            return null;
          })
        );
        for (const r of results) {
          if (r) pages.push(r);
        }
      }

      const urlGroups = groupPagesByUrlPattern(pages);

      return new Response(JSON.stringify({ success: true, pages, urlGroups }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DEFAULT: Crawl from public URL with multi-depth BFS
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const maxPages = Math.min(body.max_pages || 100, 100);
    const maxDepth = Math.min(body.max_depth || 3, 5);

    const base = new URL(formattedUrl);
    const visited = new Set<string>();
    const results: DiscoveredPage[] = [];

    const queue: [string, number][] = [[formattedUrl, 0]];
    visited.add(formattedUrl);

    while (queue.length > 0 && results.length < maxPages) {
      const batchSize = Math.min(5, queue.length, maxPages - results.length);
      const batch = queue.splice(0, batchSize);

      const promises = batch.map(async ([pageUrl, depth]) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          const resp = await fetch(pageUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; PageGenBot/1.0)", Accept: "text/html" },
            redirect: "follow",
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (!resp.ok) return { page: null, links: [], depth };
          const ct = resp.headers.get("content-type") || "";
          if (!ct.includes("html")) return { page: null, links: [], depth };

          const rawHtml = await resp.text();
          const resolvedHtml = resolveRelativeUrls(rawHtml, pageUrl);
          const headStyles = extractHeadStyles(resolvedHtml, pageUrl);
          const bodyHtml = extractBodyContent(resolvedHtml);
          const headings = extractHeadings(bodyHtml);
          const textSnippet = extractTextSnippet(bodyHtml);

          const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const title = titleMatch
            ? titleMatch[1].replace(/<[^>]*>/g, "").trim()
            : headings[0]?.text || pageUrl;

          const type = classifyPage(pageUrl, headings, textSnippet);
          const page: DiscoveredPage = { url: pageUrl, title, type, headings, textSnippet, bodyHtml, headStyles };

          const links = depth < maxDepth ? discoverLinks(rawHtml, pageUrl) : [];
          return { page, links, depth };
        } catch {
          return { page: null, links: [], depth };
        }
      });

      const batchResults = await Promise.all(promises);

      for (const { page, links, depth } of batchResults) {
        if (page && results.length < maxPages) {
          results.push(page);
        }
        if (depth < maxDepth) {
          for (const link of links) {
            if (!visited.has(link) && visited.size < maxPages * 3) {
              visited.add(link);
              queue.push([link, depth + 1]);
            }
          }
        }
      }
    }

    const urlGroups = groupPagesByUrlPattern(results);

    return new Response(JSON.stringify({
      success: true,
      pages: results,
      urlGroups,
      stats: {
        total_discovered: visited.size,
        total_crawled: results.length,
        max_pages: maxPages,
        max_depth: maxDepth,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("discover-templates error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
