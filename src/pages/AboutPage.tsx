import { StaticPageLayout } from "@/components/landing/StaticPageLayout";

export default function AboutPage() {
  return (
    <StaticPageLayout
      title="About 3XVISIBILITY"
      subtitle="We help marketers, agencies, and ecommerce teams turn structured data into thousands of high-quality, SEO-optimized pages — published directly to WordPress, Shopify, WooCommerce and PrestaShop."
    >
      <h2>Our mission</h2>
      <p>
        3XVISIBILITY exists to remove the manual grind from programmatic SEO. We combine
        AI-powered content generation, theme-aware publishing and a robust template
        engine so teams can scale local landing pages, product pages and content hubs
        in days instead of months.
      </p>
      <h2>What we build</h2>
      <ul>
        <li>AI-assisted template scanning and generation</li>
        <li>Spintax + variable engine with multi-language support</li>
        <li>Native publishing to WordPress, Shopify, WooCommerce, PrestaShop</li>
        <li>Built-in SEO scoring, audits and content quality checks</li>
      </ul>
      <h2>Built for scale</h2>
      <p>
        From solo founders to enterprise SEO teams — 3XVISIBILITY scales from a handful of
        pages to tens of thousands without breaking your design system.
      </p>
    </StaticPageLayout>
  );
}
