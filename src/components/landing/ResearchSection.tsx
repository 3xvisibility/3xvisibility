import { ScrollReveal } from "./ScrollReveal";
import { BarChart3, ArrowUpRight, FileText } from "lucide-react";
import { motion } from "framer-motion";

const sources = [
  { label: "Aggarwal et al., \"Generative Engine Optimization\" (arXiv, 2023)", href: "https://arxiv.org/abs/2311.09735" },
  { label: "Ahrefs study of 1.9 billion search queries", href: "https://ahrefs.com/blog/search-traffic-study/" },
  { label: "Backlinko Google CTR clickstream study", href: "https://backlinko.com/google-ctr-study" },
  { label: "llms.txt specification", href: "https://llmstxt.org/" },
  { label: "Schema.org vocabulary documentation", href: "https://schema.org/docs/schemaorg.html" },
];

const stats = [
  { value: "91.8%", label: "of search queries are long-tail", source: "Ahrefs · 1.9B keywords" },
  { value: "40%", label: "visibility boost from citable sources", source: "Aggarwal et al. · KDD 2024" },
  { value: "0.63%", label: "click a result on page two", source: "Backlinko · clickstream study" },
  { value: "40 hrs", label: "saved per site, per campaign", source: "Customer onboarding data" },
];

export function ResearchSection() {
  return (
    <section id="research" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_100%,hsl(96,67%,48%,0.05),transparent)] pointer-events-none" />

      <ScrollReveal className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="section-badge mb-6">
            <BarChart3 className="h-3 w-3" />
            Research &amp; data
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">
            The data behind<br />
            <span className="text-gradient-primary">the approach</span>
          </h2>
          <p className="mt-3 text-sm text-[hsl(220,12%,42%)]">
            Published studies and industry research that shape how 3x Visibility structures pages for search engines and AI answer engines.
          </p>
        </div>

        {/* Stat cards — visual highlight row */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {stats.map((s) => (
            <motion.div
              key={s.value}
              className="rounded-2xl border border-[hsl(96,67%,48%,0.12)] bg-[hsl(250,30%,98%)] p-5 text-center hover:border-[hsl(96,67%,48%,0.3)] hover:shadow-[0_8px_30px_-8px_hsl(96,67%,48%,0.15)] transition-all duration-500 hover:-translate-y-1"
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
            >
              <p className="text-2xl md:text-3xl font-extrabold tracking-tight text-gradient-primary">{s.value}</p>
              <p className="text-[11px] text-[hsl(220,12%,42%)] mt-1.5 leading-snug">{s.label}</p>
              <p className="text-[10px] text-[hsl(220,12%,55%)] mt-2 uppercase tracking-wider font-medium">{s.source}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Research narrative — two-column with sources sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 max-w-5xl mx-auto">
          <ScrollReveal delay={0.1} className="space-y-5 text-sm leading-relaxed text-[hsl(220,12%,42%)]">
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
          </ScrollReveal>

          {/* Sources card */}
          <ScrollReveal delay={0.15}>
            <div className="rounded-2xl border border-[hsl(96,67%,48%,0.12)] bg-[hsl(250,30%,98%)] p-5 lg:sticky lg:top-24">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-[hsl(96,67%,35%)]" />
                <h3 className="text-sm font-bold text-foreground">Sources &amp; references</h3>
              </div>
              <ul className="space-y-2.5">
                {sources.map((s) => (
                  <li key={s.href}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-1.5 text-xs text-[hsl(220,12%,45%)] hover:text-[hsl(96,67%,35%)] transition-colors"
                    >
                      <ArrowUpRight className="h-3 w-3 mt-0.5 shrink-0 text-[hsl(96,67%,48%,0.5)] group-hover:text-[hsl(96,67%,48%)] transition-colors" />
                      <span className="leading-snug">{s.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </ScrollReveal>
    </section>
  );
}
