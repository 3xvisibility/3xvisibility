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
import { useLanguage } from "@/i18n/LanguageContext";

const ease = [0.22, 1, 0.36, 1] as const;

export function UseCasesSection() {
  const { t } = useLanguage();

  const useCases = [
    {
      icon: Search,
      tag: "SEO",
      title: t("useCases.seoTitle"),
      description: t("useCases.seoDescription"),
      highlights: [
        t("useCases.seoHighlight1"),
        t("useCases.seoHighlight2"),
        t("useCases.seoHighlight3"),
        t("useCases.seoHighlight4"),
      ],
      example: t("useCases.seoExample"),
      gradient: "from-[hsl(96,90%,45%,0.15)] to-[hsl(96,92%,62%,0.08)]",
      borderColor: "border-[hsl(96,90%,45%,0.2)]",
      tagBg: "bg-[hsl(96,90%,45%,0.12)] text-[hsl(96,80%,52%)]",
    },
    {
      icon: Target,
      tag: "SEA",
      title: t("useCases.seaTitle"),
      description: t("useCases.seaDescription"),
      highlights: [
        t("useCases.seaHighlight1"),
        t("useCases.seaHighlight2"),
        t("useCases.seaHighlight3"),
        t("useCases.seaHighlight4"),
      ],
      example: t("useCases.seaExample"),
      gradient: "from-[hsl(38,92%,50%,0.15)] to-[hsl(28,80%,50%,0.08)]",
      borderColor: "border-[hsl(38,92%,50%,0.2)]",
      tagBg: "bg-[hsl(38,92%,50%,0.12)] text-[hsl(38,92%,60%)]",
    },
    {
      icon: MapPin,
      tag: "GEO",
      title: t("useCases.geoTitle"),
      description: t("useCases.geoDescription"),
      highlights: [
        t("useCases.geoHighlight1"),
        t("useCases.geoHighlight2"),
        t("useCases.geoHighlight3"),
        t("useCases.geoHighlight4"),
      ],
      example: t("useCases.geoExample"),
      gradient: "from-[hsl(142,76%,36%,0.15)] to-[hsl(150,60%,40%,0.08)]",
      borderColor: "border-[hsl(142,76%,36%,0.2)]",
      tagBg: "bg-[hsl(142,76%,36%,0.12)] text-[hsl(142,76%,50%)]",
    },
  ];

  const audiences = [
    { icon: Building2, title: t("useCases.agenciesTitle"), description: t("useCases.agenciesDescription") },
    { icon: Globe, title: t("useCases.ecommerceTitle"), description: t("useCases.ecommerceDescription") },
    { icon: Users, title: t("useCases.multilocationTitle"), description: t("useCases.multilocationDescription") },
    { icon: Layers, title: t("useCases.contentTeamsTitle"), description: t("useCases.contentTeamsDescription") },
  ];

  return (
    <section id="use-cases" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_30%,hsl(96,90%,45%,0.05),transparent)] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Header */}
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-14">
          <span className="section-badge mb-6">
            <Target className="h-3 w-3" />
            {t("useCases.badge")}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-tight">
            {t("useCases.title1")}<br />
            <span className="text-gradient-primary">{t("useCases.title2")}</span>
          </h2>
          <p className="mt-4 text-sm text-[hsl(220,15%,50%)] max-w-lg mx-auto leading-relaxed">
            {t("useCases.description")}
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
                          <uc.icon className="h-4 w-4 text-[hsl(96,80%,52%)]" />
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
                            className="text-[11px] font-medium text-[hsl(220,15%,60%)] bg-[hsl(220,35%,10%)] rounded-full px-3 py-1 border border-[hsl(96,90%,45%,0.1)]"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Example */}
                    <div className="lg:col-span-2">
                      <div className="rounded-xl border border-[hsl(96,90%,45%,0.12)] bg-[hsl(220,40%,6%)] overflow-hidden">
                        <div className="h-8 bg-[hsl(220,35%,10%)] flex items-center gap-2 px-3 border-b border-[hsl(96,90%,45%,0.08)]">
                          <div className="flex gap-1">
                            <div className="h-2 w-2 rounded-full bg-[hsl(0,60%,45%,0.6)]" />
                            <div className="h-2 w-2 rounded-full bg-[hsl(40,70%,50%,0.6)]" />
                            <div className="h-2 w-2 rounded-full bg-[hsl(140,50%,40%,0.6)]" />
                          </div>
                          <span className="text-[9px] text-[hsl(220,15%,40%)] ml-2 font-mono">
                            slug pattern
                          </span>
                        </div>
                        <div className="p-4 font-mono text-[12px] text-[hsl(96,80%,52%)] leading-relaxed break-all">
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
              {t("useCases.audienceTitle1")} <span className="text-gradient-primary">{t("useCases.audienceTitle2")}</span>
            </h3>
            <p className="mt-3 text-sm text-[hsl(220,15%,50%)] max-w-md mx-auto">
              {t("useCases.audienceDescription")}
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
              className="group relative rounded-2xl border border-[hsl(96,90%,45%,0.1)] bg-[hsl(220,40%,8%)] p-5 hover:border-[hsl(96,90%,45%,0.25)] transition-all duration-500"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
              }}
              whileHover={{ y: -4 }}
            >
              <div className="h-10 w-10 rounded-xl bg-[hsl(96,90%,45%,0.1)] border border-[hsl(96,90%,45%,0.15)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <a.icon className="h-5 w-5 text-[hsl(96,80%,52%)]" />
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
              {t("useCases.cta")} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
}
