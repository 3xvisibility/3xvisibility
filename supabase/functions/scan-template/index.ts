import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createConnector } from "../_shared/connectors/factory.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContentBlock {
  id: string;
  tag: string;
  text: string;
  html: string;
}

function parseHtmlBlocks(html: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  // Match heading, paragraph, list item, button, span, a, li elements with content
  const blockRegex = /<(h[1-6]|p|li|button|a|span|td|th|label|figcaption|blockquote)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;
  let idx = 0;

  while ((match = blockRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const innerHtml = match[3].trim();
    // Strip inner tags to get plain text
    const plainText = innerHtml.replace(/<[^>]*>/g, "").trim();
    if (plainText.length > 1 && plainText.length < 500) {
      blocks.push({
        id: `block-${idx++}`,
        tag,
        text: plainText,
        html: match[0],
      });
    }
  }
  return blocks;
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

  // Resolve src, href, srcset, poster, data-src, data-lazy-src attributes
  return html.replace(
    /(src|href|srcset|poster|data-src|data-lazy-src|data-original)=["']([^"']+)["']/gi,
    (full, attr, value) => {
      // Skip already-absolute, data URIs, anchors, javascript, mail
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

function extractImageUrls(html: string): string[] {
  const imgs: string[] = [];
  const regex = /(?:src|data-src|data-lazy-src)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp|svg|avif)[^"']*)["']/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    if (!imgs.includes(m[1])) imgs.push(m[1]);
  }
  return imgs;
}

function extractBodyContent(html: string): string {
  // Try to extract just the body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const content = bodyMatch ? bodyMatch[1] : html;
  // Keep <style> tags (page builder inline styles like Elementor, Divi, etc.)
  // Remove script tags, nav, footer
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

function extractHeadStyles(html: string, baseUrl: string): string {
  const styles: string[] = [];
  
  // Extract <link rel="stylesheet"> tags and resolve relative URLs
  const linkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    let tag = match[0];
    // Resolve relative href to absolute
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (hrefMatch) {
      let href = hrefMatch[1];
      if (href.startsWith("//")) {
        href = "https:" + href;
      } else if (href.startsWith("/")) {
        try {
          const u = new URL(baseUrl);
          href = u.origin + href;
        } catch { /* keep as-is */ }
      } else if (!href.startsWith("http")) {
        href = baseUrl.replace(/\/[^/]*$/, "/") + href;
      }
      tag = tag.replace(hrefMatch[1], href);
    }
    styles.push(tag);
  }

  // Extract inline <style> blocks from <head>
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (headMatch) {
    const styleRegex = /<style[^>]*>[\s\S]*?<\/style>/gi;
    let sMatch;
    while ((sMatch = styleRegex.exec(headMatch[1])) !== null) {
      styles.push(sMatch[0]);
    }
  }

  return styles.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { url, action, website_id, page_id, client_html } = body;

    // Action: list WordPress pages from a connected website
    if ((action === "list-wp-pages" || action === "list-pages") && website_id) {
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
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const siteUrl = website.url.replace(/\/+$/, "");

      // Validate URL is not a placeholder
      const hostname = new URL(siteUrl).hostname;
      if (hostname.endsWith("example.com") || hostname.endsWith("example.org") || hostname.endsWith("example.net")) {
        return new Response(
          JSON.stringify({ error: `The website URL "${siteUrl}" is a placeholder. Please update the website URL in Settings → Websites to your actual domain.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const connector = await createConnector({
          url: website.url,
          type: website.type,
          credentials: website.credentials as Record<string, string> | null,
        });

        const content = await connector.listContent("pages");

        const pages = content.map((p) => ({
          id: p.id,
          title: p.title || `Page ${p.id}`,
          slug: p.slug,
          link: p.url,
        }));

        return new Response(
          JSON.stringify({ success: true, pages }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        if (msg.includes("dns error") || msg.includes("failed to lookup address")) {
          return new Response(
            JSON.stringify({ error: `Could not connect to "${hostname}". Please verify the website URL is correct and the site is online.` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: `Failed to fetch pages: ${msg}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Action: Fetch Elementor data from a connected WordPress page
    if (action === "fetch-elementor" && website_id) {
      const { page_id } = await req.json().catch(() => ({})) || body;
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

      const siteUrl = website.url.replace(/\/+$/, "");
      const creds = website.credentials as { username?: string; app_password?: string; access_token?: string } | null;
      const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
      
      if (creds?.access_token) {
        headers["Authorization"] = `Bearer ${creds.access_token}`;
      } else if (creds?.username && creds?.app_password) {
        headers["Authorization"] = `Basic ${btoa(`${creds.username}:${creds.app_password}`)}`;
      }

      try {
        // Fetch the page with context=edit to get meta including _elementor_data
        const pageResp = await fetch(`${siteUrl}/wp-json/wp/v2/pages/${page_id}?context=edit`, { headers });
        if (!pageResp.ok) {
          // Try without context=edit
          const fallback = await fetch(`${siteUrl}/wp-json/wp/v2/pages/${page_id}`, { headers });
          if (!fallback.ok) throw new Error(`WP API error: ${fallback.status}`);
          const fbData = await fallback.json();
          return new Response(JSON.stringify({
            success: true,
            elementor_data: null,
            content: fbData.content?.rendered || "",
            title: fbData.title?.rendered || "",
            is_elementor: false,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const pageData = await pageResp.json();
        const meta = pageData.meta || {};
        const elementorData = meta._elementor_data || null;
        const elementorEditMode = meta._elementor_edit_mode || null;
        const pageTemplate = pageData.template || meta._wp_page_template || null;
        const isElementor = !!(elementorData && elementorEditMode === "builder");

        // Also fetch the rendered page to get styles
        let headStyles = "";
        let renderedHtml = pageData.content?.rendered || "";
        try {
          const pageUrl = pageData.link || `${siteUrl}/?p=${page_id}`;
          const publicResp = await fetch(pageUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; PageGenBot/1.0)", Accept: "text/html" },
          });
          if (publicResp.ok) {
            const rawHtml = await publicResp.text();
            headStyles = extractHeadStyles(rawHtml, pageUrl);
            if (isElementor) {
              // For Elementor pages, use the full rendered body
              renderedHtml = extractBodyContent(resolveRelativeUrls(rawHtml, pageUrl));
            }
          }
        } catch { /* continue without styles */ }

        return new Response(JSON.stringify({
          success: true,
          elementor_data: elementorData,
          elementor_edit_mode: elementorEditMode,
          page_template: pageTemplate,
          content: renderedHtml,
          title: pageData.title?.rendered || pageData.title?.raw || "",
          headStyles,
          is_elementor: isElementor,
          raw_content: pageData.content?.raw || "",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        return new Response(JSON.stringify({ error: `Failed to fetch Elementor data: ${msg}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let rawHtml: string;
    let usedClientHtml = false;

    // If client sent pre-rendered HTML (for JS-heavy sites), use that
    if (client_html && typeof client_html === "string" && client_html.length > 200) {
      rawHtml = client_html;
      usedClientHtml = true;
      console.log("Using client-provided HTML for", formattedUrl);
    } else {
      // Server-side fetch with multiple strategies
      const fetchHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
      };

      const pageResponse = await fetch(formattedUrl, {
        headers: fetchHeaders,
        redirect: "follow",
      });

      if (!pageResponse.ok) {
        return new Response(
          JSON.stringify({ error: `Failed to fetch page: ${pageResponse.status}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      rawHtml = await pageResponse.text();
    }

    // Detect if page is SPA with no real content
    const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyText = bodyMatch ? bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]*>/g, "").trim() : "";
    const isSpa = bodyText.length < 50 && (
      rawHtml.includes('<div id="root"') ||
      rawHtml.includes('<div id="app"') ||
      rawHtml.includes('<div id="__next"') ||
      rawHtml.includes('<div id="__nuxt"')
    );

    if (isSpa && !usedClientHtml) {
      // Return a signal telling the client to retry with browser-fetched HTML
      return new Response(
        JSON.stringify({
          success: false,
          spa_detected: true,
          message: "This page uses JavaScript rendering. Retrying with browser-based capture...",
          url: formattedUrl,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve all relative URLs to absolute before any processing
    const resolvedHtml = resolveRelativeUrls(rawHtml, formattedUrl);
    const bodyContent = extractBodyContent(resolvedHtml);
    const headStyles = extractHeadStyles(resolvedHtml, formattedUrl);
    const blocks = parseHtmlBlocks(bodyContent);
    const imageUrls = extractImageUrls(bodyContent);

    // Use AI to suggest variables
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let suggestions: { blockId: string; original: string; variable: string; value: string }[] = [];

    if (LOVABLE_API_KEY && blocks.length > 0) {
      const blocksForAi = blocks.slice(0, 30).map((b) => ({
        id: b.id,
        tag: b.tag,
        text: b.text,
      }));

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // Cost optimization: lite tier sufficient for variable identification
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `You are analyzing a webpage to identify text that should become dynamic template variables. 
Look for specific values like city names, course names, product names, prices, company names, dates, phone numbers, addresses, etc.
These are values that would change when generating pages for different items.
Do NOT suggest variables for generic text like "Learn more", "Contact us", navigation items, or boilerplate text.
Focus on content that is clearly specific to one instance (one city, one product, one service, etc.).`,
              },
              {
                role: "user",
                content: `Analyze these content blocks from a webpage and suggest which specific text values should become template variables. For each suggestion, provide the block ID, the exact text to replace, and a descriptive variable name (lowercase, underscores, no braces).

Content blocks:
${JSON.stringify(blocksForAi, null, 2)}

Return a JSON array of suggestions.`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "suggest_variables",
                  description: "Return variable suggestions for template content blocks",
                  parameters: {
                    type: "object",
                    properties: {
                      suggestions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            blockId: { type: "string", description: "The block ID" },
                            original: { type: "string", description: "The exact original text to replace" },
                            variable: { type: "string", description: "Variable name like city, course, price" },
                            value: { type: "string", description: "The current value being replaced" },
                          },
                          required: ["blockId", "original", "variable", "value"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["suggestions"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "suggest_variables" } },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            suggestions = parsed.suggestions || [];
          }
        }
      } catch (e) {
        console.error("AI suggestion error:", e);
        // Continue without suggestions
      }
    }

    // Detect if page is built with Elementor
    const isElementor = rawHtml.includes("elementor") && (
      rawHtml.includes("data-elementor-type") || 
      rawHtml.includes("elementor-widget") ||
      rawHtml.includes("elementor-section") ||
      rawHtml.includes("data-element_type")
    );

    return new Response(
      JSON.stringify({
        success: true,
        url: formattedUrl,
        bodyHtml: bodyContent,
        headStyles,
        blocks,
        suggestions,
        imageUrls,
        is_elementor: isElementor,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("scan-template error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
