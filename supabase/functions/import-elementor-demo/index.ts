// Fetches a live Astra/Elementor demo page (e.g. websitedemos.net/<slug>-02/)
// and converts its rendered HTML into NATIVE, editable Elementor JSON.
//
// Returns { name, elementorData, variables } so the page can be published as a
// true Elementor page on WordPress and edited directly in Elementor.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { parse } from "npm:node-html-parser@6";

type ElNode = {
  id: string;
  elType: string;
  widgetType?: string;
  settings: Record<string, unknown>;
  elements: ElNode[];
};

let _id = 0;
const eid = (p: string) => `${p}${(++_id).toString(36)}${Date.now().toString(36).slice(-3)}`;

const widget = (widgetType: string, settings: Record<string, unknown>): ElNode => ({
  id: eid("w"),
  elType: "widget",
  widgetType,
  settings,
  elements: [],
});

const column = (size: number, elements: ElNode[]): ElNode => ({
  id: eid("c"),
  elType: "column",
  settings: { _column_size: size, _inline_size: null },
  elements,
});

const section = (elements: ElNode[], settings: Record<string, unknown> = {}): ElNode => ({
  id: eid("s"),
  elType: "section",
  settings: {
    padding: { unit: "px", top: "60", right: "0", bottom: "60", left: "0", isLinked: false },
    ...settings,
  },
  elements,
});

const clean = (s: string | undefined) =>
  (s ?? "").replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();

function absolutize(src: string, base: string): string {
  try {
    return new URL(src, base).href;
  } catch {
    return src;
  }
}

// Convert the live demo HTML into a sequence of Elementor sections.
function htmlToElementor(html: string, baseUrl: string): ElNode[] {
  _id = 0;
  const root = parse(html);
  // Remove non-content nodes
  root.querySelectorAll("script,style,noscript,svg,header nav,footer script").forEach((n) =>
    n.remove(),
  );

  // Pick the main content containers. Newer Elementor uses flexbox .e-con
  // containers; classic uses .elementor-section.
  let containers = root.querySelectorAll(
    ".elementor-top-section, .e-con.e-parent, section.elementor-section",
  );
  if (containers.length === 0) {
    containers = root.querySelectorAll(".elementor-section, .e-con, main section, section");
  }
  if (containers.length === 0) {
    containers = root.querySelectorAll("main > div, body > div");
  }

  const pickImg = (i: ReturnType<typeof root.querySelector>): string => {
    if (!i) return "";
    return (
      i.getAttribute("data-src") ||
      i.getAttribute("data-lazy-src") ||
      i.getAttribute("src") ||
      (i.getAttribute("data-srcset") || i.getAttribute("srcset") || "")
        .split(",")[0]
        ?.trim()
        .split(" ")[0] ||
      ""
    );
  };

  const sections: ElNode[] = [];
  const seenImages = new Set<string>();
  const seenHeadings = new Set<string>();
  let firstHeroDone = false;

  for (const c of containers) {
    const headings = c.querySelectorAll("h1,h2,h3");
    const paras = c.querySelectorAll("p");
    const imgs = c.querySelectorAll("img");
    const links = c.querySelectorAll("a.elementor-button, a.button, .elementor-button-link, a.btn");

    const elements: ElNode[] = [];

    // headings (dedupe across the whole page)
    for (const h of headings.slice(0, 2)) {
      const t = clean(h.text);
      if (!t || t.length > 200) continue;
      const key = t.toLowerCase();
      if (seenHeadings.has(key)) continue;
      seenHeadings.add(key);
      elements.push(
        widget("heading", {
          title: t,
          header_size: h.tagName.toLowerCase(),
          align: "center",
        }),
      );
    }

    // text
    const paraText = paras
      .map((p) => clean(p.text))
      .filter((t) => t.length > 30 && t.length < 600)
      .slice(0, 2);
    for (const t of paraText) {
      elements.push(widget("text-editor", { editor: `<p>${t}</p>`, align: "center" }));
    }

    // image (hero/background or inline) — dedupe across page
    const img = imgs.find((i) => {
      const src = pickImg(i);
      return src && !/logo|icon|placeholder|spacer|avatar|favicon/i.test(src);
    });
    let imageUrl = "";
    if (img) {
      const abs = absolutize(pickImg(img), baseUrl);
      if (abs && !seenImages.has(abs)) {
        seenImages.add(abs);
        imageUrl = abs;
      }
    }


    // button
    const btn = links.find((a) => clean(a.text));
    if (btn) {
      elements.push(
        widget("button", {
          text: clean(btn.text).slice(0, 40) || "Learn More",
          link: { url: absolutize(btn.getAttribute("href") || "#", baseUrl), is_external: "", nofollow: "" },
          align: "center",
          button_background_color: "#2563eb",
          button_text_color: "#ffffff",
        }),
      );
    }

    if (elements.length === 0 && !imageUrl) continue;

    // Hero: first content section with a heading + image → background image hero
    if (!firstHeroDone && headings.length && imageUrl) {
      firstHeroDone = true;
      sections.push(
        section([column(100, elements)], {
          background_background: "classic",
          background_image: { url: imageUrl },
          background_overlay_background: "classic",
          background_overlay_color: "rgba(15,23,42,0.55)",
          background_position: "center center",
          background_size: "cover",
          padding: { unit: "px", top: "120", right: "0", bottom: "120", left: "0", isLinked: false },
        }),
      );
      continue;
    }

    if (imageUrl && elements.length) {
      // two-column: image + text
      sections.push(
        section([
          column(50, [
            widget("image", { image: { url: imageUrl, alt: "" }, image_size: "full" }),
          ]),
          column(50, elements),
        ]),
      );
    } else if (imageUrl) {
      sections.push(
        section([column(100, [widget("image", { image: { url: imageUrl, alt: "" }, image_size: "full", align: "center" })])]),
      );
    } else {
      sections.push(section([column(100, elements)]));
    }

    if (sections.length >= 12) break;
  }

  return sections;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { url } = await req.json().catch(() => ({}));
    if (!url || typeof url !== "string" || !/^https?:\/\//.test(url)) {
      return new Response(JSON.stringify({ error: "Valid 'url' is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanUrl = url.replace(/\?.*$/, "");
    const res = await fetch(cleanUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ElementorImporter/1.0)" },
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Demo fetch failed (${res.status})` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const html = await res.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const name = clean(titleMatch?.[1] || cleanUrl).replace(/\s*[-–|].*$/, "");

    const elementorData = htmlToElementor(html, cleanUrl);
    if (elementorData.length === 0) {
      return new Response(JSON.stringify({ error: "No convertible content found" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ name, sourceUrl: cleanUrl, elementorData, variables: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
