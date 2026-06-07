import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";
import { ArrowRight } from "lucide-react";
import programmaticSeo from "@/assets/blog/programmatic-seo.jpg";
import shopifyPublishing from "@/assets/blog/shopify-publishing.jpg";
import aiTemplates from "@/assets/blog/ai-templates.jpg";

const posts = [
  {
    title: "Programmatic SEO in 2026: what actually works",
    date: "May 2026",
    category: "SEO Strategy",
    excerpt: "A field guide to building thousands of pages that rank — without getting flagged.",
    image: programmaticSeo,
  },
  {
    title: "Publishing to Shopify without breaking your theme",
    date: "April 2026",
    category: "Publishing",
    excerpt: "How 3XVISIBILITY's theme adapter keeps generated pages pixel-perfect inside any Shopify theme.",
    image: shopifyPublishing,
  },
  {
    title: "AI templates: from CSV to live page in 60 seconds",
    date: "March 2026",
    category: "Product",
    excerpt: "Walkthrough of the AI Template Builder and the spintax engine behind it.",
    image: aiTemplates,
  },
];

export default function BlogPage() {
  return (
    <>
      <Seo
        title="Blog"
        description="Product updates, SEO playbooks and engineering notes from the 3XVISIBILITY team."
        path="/blog"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "3XVISIBILITY Blog",
          url: "https://3xvisibility.com/blog",
          blogPost: posts.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            description: p.excerpt,
          })),
        }}
      />
      <StaticPageLayout title="Blog" subtitle="Product updates, SEO playbooks and engineering notes from the 3XVISIBILITY team.">
        <div className="not-prose grid gap-6 sm:grid-cols-2">
          {posts.map((p, i) => (
            <article
              key={p.title}
              className={`group flex flex-col overflow-hidden rounded-2xl border border-[hsl(96,90%,45%,0.12)] bg-[hsl(250,30%,8%,0.4)] hover:border-[hsl(96,90%,45%,0.35)] transition-all duration-300 ${
                i === 0 ? "sm:col-span-2" : ""
              }`}
            >
              <div className={`relative overflow-hidden ${i === 0 ? "aspect-[2.4/1]" : "aspect-[16/9]"}`}>
                <img
                  src={p.image}
                  alt={p.title}
                  loading="lazy"
                  width={768}
                  height={512}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(250,30%,6%,0.7)] to-transparent" />
                <span className="absolute top-3 left-3 rounded-full border border-[hsl(96,90%,45%,0.25)] bg-[hsl(250,30%,6%,0.6)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary backdrop-blur-sm">
                  {p.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-xs uppercase tracking-widest text-[hsl(250,15%,45%)]">{p.date}</p>
                <h3 className="mt-2 text-xl font-semibold leading-snug group-hover:text-primary transition-colors">{p.title}</h3>
                <p className="mt-2 text-sm text-[hsl(250,15%,65%)]">{p.excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                  Read more <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-10 text-sm">More posts coming soon — follow us for updates.</p>
      </StaticPageLayout>
    </>
  );
}
