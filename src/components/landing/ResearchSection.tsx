import { ScrollReveal } from "./ScrollReveal";

const sources = [
  {
    label: "Aggarwal et al., \"Generative Engine Optimization\" (arXiv, 2023)",
    href: "https://arxiv.org/abs/2311.09735",
  },
  {
    label: "Ahrefs study of 1.9 billion search queries",
    href: "https://ahrefs.com/blog/search-traffic-study/",
  },
  {
    label: "Backlinko Google CTR clickstream study",
    href: "https://backlinko.com/google-ctr-study",
  },
  {
    label: "llms.txt specification",
    href: "https://llmstxt.org/",
  },
  {
    label: "Schema.org vocabulary documentation",
    href: "https://schema.org/docs/schemaorg.html",
  },
];

export function ResearchSection() {
  return (
    <section id="research" className="py-20 md:py-28 relative overflow-hidden">
      <ScrollReveal className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="section-badge mb-6">Research &amp; data</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">The data behind the approach</h2>
          <p className="mt-3 text-sm text-[hsl(220,12%,42%)]">
            Published studies and industry research that shape how 3x Visibility structures pages for search engines and AI answer engines.
          </p>
        </div>
        <div className="max-w-3xl mx-auto space-y-5 text-sm leading-relaxed text-[hsl(220,12%,42%)]">
          <p>
            According to an Ahrefs analysis of approximately 1.9 billion keywords, 91.8% of search queries are
            long-tail. That is why one page per city-plus-service or product-plus-use-case combination
            outperforms a handful of broad pages: the demand lives in the specific queries, not in the head terms.
          </p>
          <p>
            Peer-reviewed research on Generative Engine Optimization (Aggarwal et al., 2023, arXiv:2311.09735)
            measured up to a 40% improvement in visibility in generative engine responses when answers include
            citable sources, statistics and quotations, compared with unattributed text.
          </p>
          <p>
            A Backlinko clickstream study of Google search results found that only about 0.63% of searchers click
            a result on the second page, which is why every generated page receives a per-page SEO score before
            it is published.
          </p>
          <p>
            Creating a page manually takes 30 to 60 minutes including research, writing and checks; a 200-row CSV
            campaign that would require 100 to 200 hours by hand publishes in a single batch, saving around 40
            hours per site according to customer onboarding data.
          </p>
          <h3 className="text-base font-semibold text-foreground pt-2">Sources and external references</h3>
          <ul className="space-y-2 text-left list-disc pl-5">
            {sources.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-[hsl(96,67%,48%,0.4)] underline-offset-4 hover:text-foreground transition-colors"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </ScrollReveal>
    </section>
  );
}
