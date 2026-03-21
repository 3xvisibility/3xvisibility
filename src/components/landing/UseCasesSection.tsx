import { motion } from "framer-motion";
import { ScrollReveal } from "./ScrollReveal";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Search,
  Target,
  MapPin,
  ArrowRight,
  Building2,
  Globe,
  Users,
  Layers,
} from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const useCases = [
  {
    icon: Search,
    tag: "SEO",
    title: "Programmatic SEO",
    description:
      "Generate thousands of keyword-targeted landing pages from a CSV of services, locations, or product categories. Each page is optimised with meta titles, descriptions, canonical URLs, and structured data.",
    highlights: [
      "Keyword-targeted pages",
      "Auto meta tags & schema",
      "Internal linking",
      "Sitemap generation",
    ],
    example: "Best {service} in {city} — 500 pages in 10 min",
    gradient: "from-[hsl(217,91%,60%,0.15)] to-[hsl(210,100%,70%,0.08)]",
    borderColor: "border-[hsl(217,91%,60%,0.2)]",
    tagBg: "bg-[hsl(217,91%,60%,0.12)] text-[hsl(217,91%,68%)]",
  },
  {
    icon: Target,
    tag: "SEA",
    title: "Search Engine Advertising",
    description:
      "Create tailored ad landing pages at scale for PPC campaigns. Dynamically match keywords, ad groups, and UTM parameters to dedicated pages that boost Quality Score and lower CPA.",
    highlights: [
      "UTM parameter support",
      "Ad group mapping",
      "A/B test variants",
      "Conversion tracking",
    ],
    example: "{keyword} — Professional {service} | Ad Group #{ad_group}",
    gradient: "from-[hsl(38,92%,50%,0.15)] to-[hsl(28,80%,50%,0.08)]",
    borderColor: "border-[hsl(38,92%,50%,0.2)]",
    tagBg: "bg-[hsl(38,92%,50%,0.12)] text-[hsl(38,92%,60%)]",
  },
  {
    icon: MapPin,
    tag: "GEO",
    title: "Local & Geo Pages",
    description:
      "Spin up geo-targeted pages for every city, state, or ZIP code in your service area. Integrated location database with 40,000+ US cities ready to map into your templates.",
    highlights: [
      "40K+ cities database",
      "State & ZIP support",
      "Geo-specific content",
      "Directory structures",
    ],
    example: "{service} in {city}, {state} ({zip_code})",
    gradient: "from-[hsl(142,76%,36%,0.15)] to-[hsl(150,60%,40%,0.08)]",
    borderColor: "border-[hsl(142,76%,36%,0.2)]",
    tagBg: "bg-[hsl(142,76%,36%,0.12)] text-[hsl(142,76%,50%)]",
  },
];

const audiences = [
  {
    icon: Building2,
    title: "Agencies",
    description: "Manage client campaigns across isolated workspaces with whitelabel branding.",
  },
  {
    icon: Globe,
    title: "E-commerce",
    description: "Product & category pages at scale — push to Shopify, WooCommerce, or PrestaShop.",
  },
  {
    icon: Users,
    title: "Multi-location businesses",
    description: "One template, 500 locations — each with unique AI-generated copy.",
  },
  {
    icon: Layers,
    title: "Content teams",
    description: "Templatise repeating content patterns and free up writers for high-value work.",
  },
];

export function UseCasesSection() {
  return (
    <section id="use-cases" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_30%,hsl(217,91%,60%,0.05),transparent)] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Header */}
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-14">
          <span className="section-badge mb-6">
            <Target className="h-3 w-3" />
            Use Cases
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-tight">
            One platform,<br />
            <span className="text-gradient-primary">three growth engines</span>
          </h2>
          <p className="mt-4 text-sm text-[hsl(220,15%,50%)] max-w-lg mx-auto leading-relaxed">
            Whether you're scaling organic traffic, optimising paid campaigns, or dominating local search — PageGen has you covered.
          </p>
        </ScrollReveal>

        {/* Use Case Cards */}
        <div className="space-y-6 max-w-5xl mx-auto mb-20">
          {useCases.map((uc, idx) => (
            <ScrollReveal key={uc.tag} direction={idx % 2 === 0 ? "left" : "right"}>
              <div className={`relative rounded-2xl border ${uc.borderColor} bg-[hsl(220,40%,8%)] overflow-hidden transition-all duration-500 hover:border-opacity-60 group`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${uc.gradient} opacity-30 group-hover:opacity-50 transition-opacity duration-500 pointer-events-none`} />
                <div className="relative z-10 p-6 md:p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10 items-center">
                    {/* Content */}
                    <div className="lg:col-span-3">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`h-9 w-9 rounded-xl bg-[hsl(220,35%,12%)] ${uc.borderColor} border flex items-center justify-center`}>
                          <uc.icon className="h-4 w-4 text-[hsl(217,91%,68%)]" />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full ${uc.tagBg}`}>
                          {uc.tag}
                        </span>
                      </div>
                      <h3 className="text-xl md:text-2xl font-extrabold tracking-[-0.02em] mb-3">
                        {uc.title}
                      </h3>
                      <p className="text-sm text-[hsl(220,15%,50%)] leading-relaxed mb-5">
                        {uc.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {uc.highlights.map((h) => (
                          <span
                            key={h}
                            className="text-[11px] font-medium text-[hsl(220,15%,60%)] bg-[hsl(220,35%,10%)] rounded-full px-3 py-1 border border-[hsl(217,91%,60%,0.1)]"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Example */}
                    <div className="lg:col-span-2">
                      <div className="rounded-xl border border-[hsl(217,91%,60%,0.12)] bg-[hsl(220,40%,6%)] overflow-hidden">
                        <div className="h-8 bg-[hsl(220,35%,10%)] flex items-center gap-2 px-3 border-b border-[hsl(217,91%,60%,0.08)]">
                          <div className="flex gap-1">
                            <div className="h-2 w-2 rounded-full bg-[hsl(0,60%,45%,0.6)]" />
                            <div className="h-2 w-2 rounded-full bg-[hsl(40,70%,50%,0.6)]" />
                            <div className="h-2 w-2 rounded-full bg-[hsl(140,50%,40%,0.6)]" />
                          </div>
                          <span className="text-[9px] text-[hsl(220,15%,40%)] ml-2 font-mono">
                            slug pattern
                          </span>
                        </div>
                        <div className="p-4 font-mono text-[12px] text-[hsl(217,91%,68%)] leading-relaxed break-all">
                          {uc.example}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Who It's For */}
        <ScrollReveal>
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em]">
              Built for <span className="text-gradient-primary">teams that scale</span>
            </h3>
            <p className="mt-3 text-sm text-[hsl(220,15%,50%)] max-w-md mx-auto">
              Multi-tenant workspaces with role-based access, whitelabel branding, and isolated data — perfect for agencies and enterprises.
            </p>
          </div>
        </ScrollReveal>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {audiences.map((a) => (
            <motion.div
              key={a.title}
              className="group relative rounded-2xl border border-[hsl(217,91%,60%,0.1)] bg-[hsl(220,40%,8%)] p-5 hover:border-[hsl(217,91%,60%,0.25)] transition-all duration-500"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
              }}
              whileHover={{ y: -4 }}
            >
              <div className="h-10 w-10 rounded-xl bg-[hsl(217,91%,60%,0.1)] border border-[hsl(217,91%,60%,0.15)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <a.icon className="h-5 w-5 text-[hsl(217,91%,68%)]" />
              </div>
              <h4 className="font-bold text-sm mb-1.5">{a.title}</h4>
              <p className="text-[12px] text-[hsl(220,15%,50%)] leading-relaxed">
                {a.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <ScrollReveal className="mt-12 text-center">
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm px-8 h-12 rounded-xl font-semibold shadow-xl shadow-primary/25"
            asChild
          >
            <Link to="/auth">
              Start generating pages <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
}
