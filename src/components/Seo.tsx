import { Helmet } from "react-helmet-async";

const BASE_URL = "https://3xvisibility.com";

export interface SeoProps {
  /** Page title (will be suffixed with the brand name unless titleFull is set) */
  title: string;
  description: string;
  /** Path of the current route, e.g. "/about". Used for canonical + og:url. */
  path: string;
  /** Override the full <title> verbatim (no brand suffix). */
  titleFull?: string;
  /** og:type, defaults to "website". Use "article" for blog posts. */
  type?: "website" | "article";
  /** Optional absolute image URL for social previews. */
  image?: string;
  /** Set true to keep a page out of search indexes. */
  noindex?: boolean;
  /** Optional JSON-LD structured data object(s) for this page. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const BRAND = "3XVISIBILITY";

export function Seo({
  title,
  description,
  path,
  titleFull,
  type = "website",
  image,
  noindex,
  jsonLd,
}: SeoProps) {
  const fullTitle = titleFull ?? `${title} — ${BRAND}`;
  const url = `${BASE_URL}${path}`;
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1"
        />
      )}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={BRAND} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      {image && <meta property="og:image" content={image} />}

      {/* Twitter */}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
