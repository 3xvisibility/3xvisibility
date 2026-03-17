import { ScrollReveal } from "./ScrollReveal";
import { motion } from "framer-motion";
import { FileSpreadsheet, ArrowRight, Layers, Rocket, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export function FeatureShowcaseSection() {
  const { t } = useLanguage();

  const showcases = [
    {
      tag: t("showcase.importTag"),
      step: "01",
      icon: FileSpreadsheet,
      title: t("showcase.importTitle"),
      description: t("showcase.importDesc"),
      highlights: [t("showcase.importH1"), t("showcase.importH2"), t("showcase.importH3"), t("showcase.importH4")],
      visual: (
        <div className="rounded-xl border border-[hsl(262,83%,58%,0.12)] bg-[hsl(252,25%,10%)] p-4 space-y-2.5">
          {["keyword", "city", "title", "meta_desc"].map((col, i) => (
            <motion.div
              key={col}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.06 }}
              className="flex items-center gap-2"
            >
              <div className="h-7 w-16 rounded-lg bg-[hsl(250,25%,14%)] flex items-center px-2 text-[10px] text-[hsl(250,15%,50%)] font-mono">{col}</div>
              <ArrowRight className="h-3 w-3 text-[hsl(262,83%,58%,0.5)] shrink-0" />
              <div className="h-7 flex-1 rounded-lg bg-[hsl(262,83%,58%,0.08)] border border-[hsl(262,83%,58%,0.15)] flex items-center px-2 text-[10px] text-[hsl(262,83%,68%)] font-mono">{`{${col}}`}</div>
            </motion.div>
          ))}
        </div>
      ),
    },
    {
      tag: t("showcase.buildTag"),
      step: "02",
      icon: Layers,
      title: t("showcase.buildTitle"),
      description: t("showcase.buildDesc"),
      highlights: [t("showcase.buildH1"), t("showcase.buildH2"), t("showcase.buildH3"), t("showcase.buildH4")],
      visual: (
        <div className="rounded-xl border border-[hsl(262,83%,58%,0.12)] bg-[hsl(252,25%,10%)] overflow-hidden">
          <div className="h-8 bg-[hsl(250,25%,12%)] flex items-center gap-2 px-3 border-b border-[hsl(262,83%,58%,0.08)]">
            <div className="flex gap-1">
              <div className="h-2 w-2 rounded-full bg-[hsl(0,60%,45%,0.6)]" />
              <div className="h-2 w-2 rounded-full bg-[hsl(40,70%,50%,0.6)]" />
              <div className="h-2 w-2 rounded-full bg-[hsl(140,50%,40%,0.6)]" />
            </div>
            <span className="text-[9px] text-[hsl(250,15%,40%)] ml-2 font-mono">template.html</span>
          </div>
          <div className="p-4 space-y-1.5 font-mono text-[11px] leading-relaxed">
            <div className="text-[hsl(250,15%,45%)]">&lt;h1&gt;<span className="text-[hsl(262,83%,68%)] font-semibold">{"{title}"}</span>&lt;/h1&gt;</div>
            <div className="text-[hsl(250,15%,45%)]">&lt;meta name="desc" content="<span className="text-[hsl(262,83%,68%)] font-semibold">{"{meta_desc}"}</span>" /&gt;</div>
            <div className="text-[hsl(250,15%,45%)]">&lt;p&gt;Best in <span className="text-[hsl(262,83%,68%)] font-semibold">{"{city}"}</span>&lt;/p&gt;</div>
          </div>
        </div>
      ),
    },
    {
      tag: t("showcase.deployTag"),
      step: "03",
      icon: Rocket,
      title: t("showcase.deployTitle"),
      description: t("showcase.deployDesc"),
      highlights: [t("showcase.deployH1"), t("showcase.deployH2"), t("showcase.deployH3"), t("showcase.deployH4")],
      visual: (
        <div className="rounded-xl border border-[hsl(262,83%,58%,0.12)] bg-[hsl(252,25%,10%)] p-4 space-y-2.5">
          {[
            { title: "plumber-new-york", status: "done" },
            { title: "plumber-la", status: "done" },
            { title: "plumber-chicago", status: "done" },
            { title: "plumber-houston", status: "progress" },
          ].map((page, i) => (
            <motion.div
              key={page.title}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.08 }}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${page.status === "done" ? "text-[hsl(142,76%,50%)]" : "text-[hsl(262,83%,68%)] animate-pulse"}`} />
              <span className="text-[10px] font-mono text-[hsl(250,15%,55%)] flex-1 truncate">{page.title}</span>
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${page.status === "done" ? "bg-[hsl(142,76%,36%,0.1)] text-[hsl(142,76%,50%)]" : "bg-[hsl(262,83%,58%,0.1)] text-[hsl(262,83%,68%)]"}`}>
                {page.status === "done" ? t("showcase.live") : t("showcase.deploying")}
              </span>
            </motion.div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,hsl(262,83%,58%,0.04),transparent)] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="space-y-20 max-w-5xl mx-auto">
          {showcases.map((item, idx) => (
            <ScrollReveal key={item.step} direction={idx % 2 === 0 ? "left" : "right"}>
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center ${idx % 2 === 1 ? "lg:[direction:rtl] lg:*:[direction:ltr]" : ""}`}>
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-bold text-[hsl(262,83%,68%)] bg-[hsl(262,83%,58%,0.1)] border border-[hsl(262,83%,58%,0.2)] rounded-full px-3 py-1">{item.step}</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(250,15%,50%)]">{item.tag}</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em] mb-3">{item.title}</h3>
                  <p className="text-sm text-[hsl(250,15%,50%)] leading-relaxed mb-5">{item.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.highlights.map((h) => (
                      <span key={h} className="text-[11px] font-medium text-[hsl(250,15%,60%)] bg-[hsl(250,25%,12%)] rounded-full px-3 py-1 border border-[hsl(262,83%,58%,0.1)]">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -inset-4 bg-[radial-gradient(ellipse_at_center,hsl(262,83%,58%,0.06),transparent)] rounded-2xl blur-2xl pointer-events-none" />
                  <div className="relative">{item.visual}</div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
