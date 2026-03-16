import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
}

interface UrlGroup {
  pattern: string;
  patternLabel: string;
  pages: string[];
  suggestedVariables: string[];
}

function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const content = bodyMatch ? bodyMatch[1] : html;
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
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

async function fetchPage(pageUrl: string): Promise<DiscoveredPage | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
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
    const bodyHtml = extractBodyContent(rawHtml);
    const headings = extractHeadings(bodyHtml);
    const textSnippet = extractTextSnippet(bodyHtml);

    const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]*>/g, "").trim()
      : headings[0]?.text || pageUrl;

    const type = classifyPage(pageUrl, headings, textSnippet);

    return { url: pageUrl, title, type, headings, textSnippet, bodyHtml };
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

/**
 * Group pages by URL structure pattern.
 * e.g. /services/plumbing-new-york and /services/plumbing-chicago -> pattern "/services/{slug}"
 */
function groupPagesByUrlPattern(pages: DiscoveredPage[]): UrlGroup[] {
  const patternMap = new Map<string, { pages: string[]; segments: string[][] }>();

  for (const page of pages) {
    try {
      const parsed = new URL(page.url);
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments.length === 0) continue;

      // Create pattern by replacing the last segment with a placeholder
      // For deeper paths, replace last segment
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

  // Only keep groups with 2+ pages (actual patterns)
  const groups: UrlGroup[] = [];
  for (const [pattern, data] of patternMap) {
    if (data.pages.length >= 2) {
      // Extract the varying parts as suggested variables
      const varyingValues = data.segments.map(s => s[s.length - 1]);
      const parentPath = data.segments[0].slice(0, -1).join("/");

      groups.push({
        pattern,
        patternLabel: `${parentPath ? parentPath + "/" : ""}{slug} (${data.pages.length} pages)`,
        pages: data.pages,
        suggestedVariables: ["slug"],
      });
    }
  }

  // Sort by number of pages descending
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
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
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

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are analyzing pages from a website to detect patterns suitable for template generation. 
Look for pages that follow similar structures but with different specific values (city names, service names, product names, etc.).
Pay special attention to URL patterns like /services/plumbing-new-york and /services/plumbing-chicago.
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
                          name: { type: "string", description: "Pattern name like 'Service Location Pages'" },
                          template: { type: "string", description: "Template string like '{service} in {location}'" },
                          variables: { type: "array", items: { type: "string" }, description: "Variable names" },
                          matchingPages: { type: "array", items: { type: "string" }, description: "Titles of pages matching this pattern" },
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

    // ACTION: Crawl from connected website
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

      const creds = website.credentials as { username?: string; app_password?: string; access_token?: string } | null;
      const siteUrl = website.url.replace(/\/+$/, "");
      const pages: DiscoveredPage[] = [];

      if (website.type === "wordpress") {
        const headers: Record<string, string> = { "User-Agent": "Mozilla/5.0 (compatible; PageGenBot/1.0)" };
        if (creds?.username && creds?.app_password) {
          headers["Authorization"] = `Basic ${btoa(`${creds.username}:${creds.app_password}`)}`;
        }

        for (const endpoint of ["pages", "posts"]) {
          try {
            // Fetch up to 100 items (2 pages of 50)
            for (let page = 1; page <= 2 && pages.length < 100; page++) {
              const wpResp = await fetch(`${siteUrl}/wp-json/wp/v2/${endpoint}?per_page=50&page=${page}&status=publish`, { headers });
              if (!wpResp.ok) break;
              const items = await wpResp.json();
              if (items.length === 0) break;
              for (const item of items) {
                if (pages.length >= 100) break;
                const bodyHtml = item.content?.rendered || "";
                const headings = extractHeadings(bodyHtml);
                const textSnippet = extractTextSnippet(bodyHtml);
                const title = item.title?.rendered?.replace(/<[^>]*>/g, "") || `${endpoint} ${item.id}`;
                pages.push({
                  url: item.link || `${siteUrl}/${item.slug}`,
                  title,
                  type: classifyPage(item.link || "", headings, textSnippet),
                  headings,
                  textSnippet,
                  bodyHtml,
                });
              }
            }
          } catch { /* skip */ }
        }
      } else if (website.type === "shopify") {
        if (creds?.access_token) {
          const shopDomain = siteUrl.replace(/^https?:\/\//, "");
          try {
            const pagesResp = await fetch(`https://${shopDomain}/admin/api/2024-01/pages.json?limit=50`, {
              headers: { "X-Shopify-Access-Token": creds.access_token },
            });
            if (pagesResp.ok) {
              const { pages: shopPages } = await pagesResp.json();
              for (const sp of shopPages) {
                if (pages.length >= 100) break;
                const bodyHtml = sp.body_html || "";
                const headings = extractHeadings(bodyHtml);
                const textSnippet = extractTextSnippet(bodyHtml);
                pages.push({
                  url: `https://${shopDomain}/pages/${sp.handle}`,
                  title: sp.title,
                  type: classifyPage(sp.handle, headings, textSnippet),
                  headings,
                  textSnippet,
                  bodyHtml,
                });
              }
            }
          } catch { /* skip */ }

          try {
            const prodResp = await fetch(`https://${shopDomain}/admin/api/2024-01/products.json?limit=50`, {
              headers: { "X-Shopify-Access-Token": creds.access_token },
            });
            if (prodResp.ok) {
              const { products } = await prodResp.json();
              for (const p of products) {
                if (pages.length >= 100) break;
                const bodyHtml = p.body_html || "";
                const headings = extractHeadings(bodyHtml);
                const textSnippet = extractTextSnippet(bodyHtml);
                pages.push({
                  url: `https://${shopDomain}/products/${p.handle}`,
                  title: p.title,
                  type: "product",
                  headings,
                  textSnippet,
                  bodyHtml,
                });
              }
            }
          } catch { /* skip */ }
        }
      }

      const urlGroups = groupPagesByUrlPattern(pages);

      return new Response(JSON.stringify({ success: true, pages, urlGroups }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DEFAULT: Crawl from public URL with multi-depth BFS (max 100 pages, max depth 3)
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

    // BFS queue: [url, depth]
    const queue: [string, number][] = [[formattedUrl, 0]];
    visited.add(formattedUrl);

    while (queue.length > 0 && results.length < maxPages) {
      // Process in batches of 5 for concurrency
      const batchSize = Math.min(5, queue.length, maxPages - results.length);
      const batch = queue.splice(0, batchSize);

      const promises = batch.map(async ([pageUrl, depth]) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
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
          const bodyHtml = extractBodyContent(rawHtml);
          const headings = extractHeadings(bodyHtml);
          const textSnippet = extractTextSnippet(bodyHtml);

          const titleMatch = rawHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          const title = titleMatch
            ? titleMatch[1].replace(/<[^>]*>/g, "").trim()
            : headings[0]?.text || pageUrl;

          const type = classifyPage(pageUrl, headings, textSnippet);
          const page: DiscoveredPage = { url: pageUrl, title, type, headings, textSnippet, bodyHtml };

          // Discover links for next depth level
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
        // Add new links to queue
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
