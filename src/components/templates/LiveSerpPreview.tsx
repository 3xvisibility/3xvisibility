import { useMemo, useState } from "react";
import { Globe, Search, Twitter, Smartphone, Monitor, ImageOff } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

/**
 * Live SERP / social card preview for template SEO patterns.
 *
 * Renders Google (desktop + mobile), Open Graph (Facebook/LinkedIn-style), and
 * Twitter card mockups using the placeholder-resolved meta values. Designed to
 * sit next to the SEO input fields in the template editor so authors can adjust
 * SEO-critical fields *before* generating pages.
 */

export interface LiveSerpPreviewProps {
  /** Raw template patterns (may contain {placeholders}) */
  seoTitle?: string;
  seoDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: "summary" | "summary_large_image" | string;
  slugPattern?: string;
  canonicalUrlPattern?: string;
  /** Fallback site name + URL shown in cards */
  siteName?: string;
  baseDomain?: string;
  /** Fallback for when seoTitle is empty */
  templateName?: string;
}

/** Replace {placeholder_name} with a humanised stand-in (e.g. "Service Name"). */
function humanizePlaceholders(input: string | undefined): string {
  if (!input) return "";
  return input.replace(/\{([^}]+)\}/g, (_, raw: string) => {
    return raw
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  });
}

function slugify(input: string | undefined): string {
  if (!input) return "page-slug";
  return humanizePlaceholders(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    || "page-slug";
}

function pickDomain(canonical: string | undefined, baseDomain: string | undefined): string {
  const candidate = canonical?.trim() || baseDomain?.trim() || "example.com";
  try {
    const u = new URL(candidate.startsWith("http") ? candidate : `https://${candidate}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return candidate.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

export function LiveSerpPreview({
  seoTitle,
  seoDescription,
  ogTitle,
  ogDescription,
  ogImage,
  twitterCard = "summary_large_image",
  slugPattern,
  canonicalUrlPattern,
  siteName,
  baseDomain,
  templateName,
}: LiveSerpPreviewProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const resolved = useMemo(() => {
    const title = humanizePlaceholders(seoTitle) || templateName || "Page Title";
    const desc =
      humanizePlaceholders(seoDescription) ||
      "Add a meta description to control how this page appears in search results and social shares.";
    const og_title = humanizePlaceholders(ogTitle) || title;
    const og_desc = humanizePlaceholders(ogDescription) || desc;
    const og_image = humanizePlaceholders(ogImage);
    const slug = slugify(slugPattern);
    const domain = pickDomain(humanizePlaceholders(canonicalUrlPattern), baseDomain);
    const url = `https://${domain}/${slug}`;
    const site = siteName?.trim() || domain;
    return { title, desc, og_title, og_desc, og_image, slug, domain, url, site };
  }, [seoTitle, seoDescription, ogTitle, ogDescription, ogImage, slugPattern, canonicalUrlPattern, siteName, baseDomain, templateName]);

  const titleLen = (humanizePlaceholders(seoTitle) || "").length;
  const descLen = (humanizePlaceholders(seoDescription) || "").length;
  const isLargeTwitter = (twitterCard || "").toLowerCase() === "summary_large_image";

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">Live SERP & Social Preview</span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            T {titleLen}/60
          </Badge>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            D {descLen}/160
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="google" className="w-full">
        <TabsList className="h-8 bg-muted/40 p-0.5 rounded-lg w-full justify-start">
          <TabsTrigger value="google" className="h-7 text-[11px] gap-1 rounded-md">
            <Search className="h-3 w-3" /> Google
          </TabsTrigger>
          <TabsTrigger value="og" className="h-7 text-[11px] gap-1 rounded-md">
            <Globe className="h-3 w-3" /> Open Graph
          </TabsTrigger>
          <TabsTrigger value="twitter" className="h-7 text-[11px] gap-1 rounded-md">
            <Twitter className="h-3 w-3" /> Twitter
          </TabsTrigger>
        </TabsList>

        {/* Google SERP */}
        <TabsContent value="google" className="mt-3">
          <div className="flex justify-end gap-1 mb-2">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={`text-[10px] px-2 py-1 rounded-md inline-flex items-center gap-1 transition-colors ${
                device === "desktop" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40"
              }`}
              aria-label="Desktop preview"
            >
              <Monitor className="h-3 w-3" /> Desktop
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={`text-[10px] px-2 py-1 rounded-md inline-flex items-center gap-1 transition-colors ${
                device === "mobile" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40"
              }`}
              aria-label="Mobile preview"
            >
              <Smartphone className="h-3 w-3" /> Mobile
            </button>
          </div>

          <div
            className={`rounded-xl border bg-white text-[#202124] p-4 mx-auto transition-all ${
              device === "mobile" ? "max-w-[360px]" : "max-w-full"
            }`}
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="h-5 w-5 rounded-full bg-[#f1f3f4] flex items-center justify-center text-[10px] text-[#5f6368]">
                {resolved.domain.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] text-[#202124]">{resolved.site}</span>
                <span className="text-[10px] text-[#5f6368] truncate">
                  https://{resolved.domain} <span className="px-1">›</span> {resolved.slug}
                </span>
              </div>
            </div>
            <p
              className={`text-[#1a0dab] hover:underline cursor-pointer leading-snug ${
                device === "mobile" ? "text-[18px]" : "text-[20px]"
              } line-clamp-2`}
            >
              {resolved.title.length > (device === "mobile" ? 78 : 60)
                ? resolved.title.slice(0, device === "mobile" ? 78 : 60).trimEnd() + "…"
                : resolved.title}
            </p>
            <p className="text-[13px] text-[#4d5156] leading-relaxed line-clamp-2 mt-1">
              {resolved.desc.length > 160 ? resolved.desc.slice(0, 157).trimEnd() + "…" : resolved.desc}
            </p>
          </div>
        </TabsContent>

        {/* Open Graph card */}
        <TabsContent value="og" className="mt-3">
          <div className="rounded-xl border bg-white text-[#1c1e21] overflow-hidden max-w-[500px] mx-auto" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
            <div className="aspect-[1.91/1] bg-[#f0f2f5] relative flex items-center justify-center overflow-hidden">
              {resolved.og_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolved.og_image}
                  alt="OG preview"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="flex flex-col items-center text-[#65676b] gap-1">
                  <ImageOff className="h-8 w-8" />
                  <span className="text-[10px] uppercase tracking-wider">No og:image</span>
                </div>
              )}
            </div>
            <div className="px-4 py-3 bg-[#f0f2f5]">
              <p className="text-[11px] text-[#65676b] uppercase tracking-wider truncate">
                {resolved.domain}
              </p>
              <p className="text-[15px] font-semibold text-[#1c1e21] mt-0.5 line-clamp-2 leading-snug">
                {resolved.og_title}
              </p>
              <p className="text-[12px] text-[#65676b] mt-1 line-clamp-2 leading-snug">
                {resolved.og_desc}
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Twitter card */}
        <TabsContent value="twitter" className="mt-3">
          <div
            className={`rounded-2xl border border-[#cfd9de] bg-white text-[#0f1419] overflow-hidden max-w-[500px] mx-auto ${
              isLargeTwitter ? "" : "flex"
            }`}
            style={{ fontFamily: "Chirp, system-ui, sans-serif" }}
          >
            <div
              className={`bg-[#e7e9ea] relative flex items-center justify-center overflow-hidden ${
                isLargeTwitter ? "aspect-[2/1] w-full" : "w-[125px] h-[125px] shrink-0 border-r border-[#cfd9de]"
              }`}
            >
              {resolved.og_image ? (
                <img
                  src={resolved.og_image}
                  alt="Twitter card preview"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="flex flex-col items-center text-[#536471] gap-1">
                  <ImageOff className="h-7 w-7" />
                  <span className="text-[9px] uppercase tracking-wider">No image</span>
                </div>
              )}
              {isLargeTwitter && (
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 text-white text-[11px] rounded">
                  {resolved.og_title.length > 50
                    ? resolved.og_title.slice(0, 47) + "…"
                    : resolved.og_title}
                </div>
              )}
            </div>
            <div className={`px-3 py-2 ${isLargeTwitter ? "" : "flex-1 flex flex-col justify-center"}`}>
              <p className="text-[12px] text-[#536471] truncate">{resolved.domain}</p>
              {!isLargeTwitter && (
                <p className="text-[14px] font-semibold text-[#0f1419] line-clamp-1 leading-snug mt-0.5">
                  {resolved.og_title}
                </p>
              )}
              <p className="text-[12px] text-[#0f1419] line-clamp-2 mt-0.5 leading-snug">
                {resolved.og_desc}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground text-center">
            Twitter card type: <code className="font-mono">{twitterCard || "summary_large_image"}</code>
          </p>
        </TabsContent>
      </Tabs>

      {/* Raw meta tag list — handy reference */}
      <details className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-[10px] group">
        <summary className="cursor-pointer text-muted-foreground font-medium select-none">
          View generated &lt;meta&gt; tags
        </summary>
        <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[10px] text-foreground/80 leading-relaxed">
{`<title>${resolved.title}</title>
<meta name="description" content="${resolved.desc}">
<link rel="canonical" href="${resolved.url}">
<meta property="og:title" content="${resolved.og_title}">
<meta property="og:description" content="${resolved.og_desc}">
<meta property="og:url" content="${resolved.url}">
<meta property="og:site_name" content="${resolved.site}">
<meta property="og:type" content="website">${resolved.og_image ? `\n<meta property="og:image" content="${resolved.og_image}">` : ""}
<meta name="twitter:card" content="${twitterCard || "summary_large_image"}">
<meta name="twitter:title" content="${resolved.og_title}">
<meta name="twitter:description" content="${resolved.og_desc}">${resolved.og_image ? `\n<meta name="twitter:image" content="${resolved.og_image}">` : ""}`}
        </pre>
      </details>
    </div>
  );
}
