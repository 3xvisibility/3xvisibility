import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createConnector } from "../_shared/connectors/factory.ts";
import { aiGenerate, deductCreditsForRequest } from "../_shared/ai-service.ts";
import { bundleTemplateAssets } from "../_shared/asset-bundler.ts";
import { normalizeTemplateHtml } from "../_shared/template-normalizer.ts";

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

/**
 * Make every asset reference absolute (CSS, JS, images, fonts, posters,
 * multi-candidate `srcset`, inline `style` and `url()`/`@import` inside
 * `<style>` blocks) so the imported template renders identically wherever it is
 * previewed or published.
 */
function resolveRelativeUrls(html: string, baseUrl: string): string {
  return bundleTemplateAssets(html, { baseUrl }).html;
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

/**
 * Many modern landing pages (React/Framer/Rocket builds) ship their content
 * with an "entrance animation" initial state — inline `opacity:0` plus a
 * translate transform — and only reveal it with JS on scroll. When we import
 * such a page statically, every headline/paragraph exists in the HTML but is
 * invisible, so the template looks like design-only with no text.
 * This resets those initial states to a visible one.
 */
function neutralizeHiddenStates(html: string): string {
  let out = html.replace(/style=(["'])([^"']*)\1/gi, (full, q, css: string) => {
    if (!/opacity|visibility|transform/i.test(css)) return full;
    const fixed = css
      .replace(/opacity\s*:\s*0(\.0+)?\s*(!important)?/gi, "opacity:1")
      .replace(/visibility\s*:\s*hidden\s*(!important)?/gi, "visibility:visible")
      .replace(/transform\s*:\s*[^;]*(translate|scale|rotate)[^;]*/gi, "transform:none");
    return `style=${q}${fixed}${q}`;
  });
  // Utility classes that hide content until an observer adds a "visible" class.
  out = out.replace(/\bopacity-0\b/g, "opacity-100").replace(/\binvisible\b/g, "visible");
  // Safety net stylesheet in case a class-based animation still hides content.
  out += `\n<style>[data-aos],[class*="fade-"],[class*="reveal"],[class*="animate-"]{opacity:1 !important;visibility:visible !important;transform:none !important;}</style>`;
  return out;
}

function extractBodyContent(html: string): string {
  // Try to extract just the body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const content = bodyMatch ? bodyMatch[1] : html;
  // Keep <style> tags (page builder inline styles like Elementor, Divi, etc.)
  // Remove script tags, nav, footer
  const cleaned = content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  return neutralizeHiddenStates(cleaned);
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
          id: website.id,
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
        const credit = await deductCreditsForRequest(req, "template_scan", "google/gemini-2.5-flash-lite");
        if (!credit.allowed) {
          console.warn("AI variable suggestions skipped:", credit.error, credit.remaining);
          throw new Error("AI variable suggestions skipped");
        }
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
                content: `You are an SEO expert selecting the BEST dynamic template variables (keywords) from a webpage.
Only pick SHORT, specific values that genuinely change per generated page: city/location names, service names, product names, category names, brand/company names, prices, dates, phone numbers.
STRICT RULES:
- Pick ONLY the highest-value keywords — quality over quantity. Return at most 8.
- The "original" text must be a SHORT phrase (1-5 words), never a full sentence or paragraph.
- Never pick body copy, descriptions, headlines that are full sentences, CTAs ("Learn more", "Contact us"), navigation, or boilerplate.
- Each variable name must be lowercase_snake_case and semantic (city, service_name, product_name, price, brand_name).
- If a block has no clear keyword, skip it. It is better to return fewer, perfect keywords than many weak ones.`,
              },
              {
                role: "user",
                content: `From these content blocks, return ONLY the best keyword variables following the rules. For each, give the block ID, the exact SHORT text to replace, and a semantic variable name.

Content blocks:
${JSON.stringify(blocksForAi, null, 2)}

Return a JSON array of the best suggestions only.`,
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

    // Consistent HTML/CSS/JS shape for every scanned page: merged stylesheet,
    // sanitized markup, single `.tpl-root` wrapper.
    const normalized = normalizeTemplateHtml(`${headStyles}\n${bodyContent}`, {
      baseUrl: formattedUrl,
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: formattedUrl,
        bodyHtml: bodyContent,
        headStyles,
        normalizedHtml: normalized.html,
        normalization: { warnings: normalized.warnings, stats: normalized.stats },
        blocks,
        suggestions,
        imageUrls,
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
