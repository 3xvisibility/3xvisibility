import { StaticPageLayout } from "@/components/landing/StaticPageLayout";

const posts = [
  {
    title: "Programmatic SEO in 2026: what actually works",
    date: "May 2026",
    excerpt: "A field guide to building thousands of pages that rank — without getting flagged.",
  },
  {
    title: "Publishing to Shopify without breaking your theme",
    date: "April 2026",
    excerpt: "How 3XVISIBILITY's theme adapter keeps generated pages pixel-perfect inside any Shopify theme.",
  },
  {
    title: "AI templates: from CSV to live page in 60 seconds",
    date: "March 2026",
    excerpt: "Walkthrough of the AI Template Builder and the spintax engine behind it.",
  },
];

export default function BlogPage() {
  return (
    <StaticPageLayout title="Blog" subtitle="Product updates, SEO playbooks and engineering notes from the 3XVISIBILITY team.">
      <div className="not-prose grid gap-6">
        {posts.map((p) => (
          <article
            key={p.title}
            className="rounded-xl border border-[hsl(96,90%,45%,0.12)] bg-[hsl(250,30%,8%,0.4)] p-6 hover:border-[hsl(96,90%,45%,0.3)] transition-colors"
          >
            <p className="text-xs uppercase tracking-widest text-[hsl(250,15%,45%)]">{p.date}</p>
            <h3 className="mt-2 text-xl font-semibold">{p.title}</h3>
            <p className="mt-2 text-sm text-[hsl(250,15%,65%)]">{p.excerpt}</p>
          </article>
        ))}
      </div>
      <p className="mt-10 text-sm">More posts coming soon — follow us for updates.</p>
    </StaticPageLayout>
  );
}
