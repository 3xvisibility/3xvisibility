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
        <div className="rounded-xl border border-border/30 bg-background/80 p-4 space-y-2.5">
          {["keyword", "city", "title", "meta_desc"].map((col, i) => (
            <motion.div
              key={col}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.06 }}
              className="flex items-center gap-2"
            >
              <div className="h-7 w-16 rounded-lg bg-muted/60 flex items-center px-2 text-[10px] text-muted-foreground font-mono">{col}</div>
              <ArrowRight className="h-3 w-3 text-primary/50 shrink-0" />
              <div className="h-7 flex-1 rounded-lg bg-primary/5 border border-primary/15 flex items-center px-2 text-[10px] text-primary font-mono">{`{${col}}`}</div>
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
        <div className="rounded-xl border border-border/30 bg-background/80 overflow-hidden">
          <div className="h-8 bg-muted/30 flex items-center gap-2 px-3 border-b border-border/20">
            <div className="flex gap-1">
              <div className="h-2 w-2 rounded-full bg-red-400/50" />
              <div className="h-2 w-2 rounded-full bg-amber-400/50" />
              <div className="h-2 w-2 rounded-full bg-green-400/50" />
            </div>
            <span className="text-[9px] text-muted-foreground/50 ml-2 font-mono">template.html</span>
          </div>
          <div className="p-4 space-y-1.5 font-mono text-[11px] leading-relaxed">
            <div className="text-muted-foreground/60">&lt;h1&gt;<span className="text-primary font-semibold">{"{title}"}</span>&lt;/h1&gt;</div>
            <div className="text-muted-foreground/60">&lt;meta name="desc" content="<span className="text-primary font-semibold">{"{meta_desc}"}</span>" /&gt;</div>
            <div className="text-muted-foreground/60">&lt;p&gt;Best in <span className="text-primary font-semibold">{"{city}"}</span>&lt;/p&gt;</div>
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
        <div className="rounded-xl border border-border/30 bg-background/80 p-4 space-y-2.5">
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
              <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${page.status === "done" ? "text-emerald-500" : "text-primary animate-pulse"}`} />
              <span className="text-[10px] font-mono text-muted-foreground flex-1 truncate">{page.title}</span>
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${page.status === "done" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-primary/10 text-primary"}`}>
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,hsl(var(--primary)/.04),transparent)] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="space-y-20 max-w-5xl mx-auto">
          {showcases.map((item, idx) => (
            <ScrollReveal key={item.step} direction={idx % 2 === 0 ? "left" : "right"}>
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center ${idx % 2 === 1 ? "lg:[direction:rtl] lg:*:[direction:ltr]" : ""}`}>
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-bold text-primary bg-primary/8 border border-primary/15 rounded-full px-3 py-1">{item.step}</span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.tag}</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em] mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{item.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.highlights.map((h) => (
                      <span key={h} className="text-[11px] font-medium text-foreground/60 bg-muted/60 rounded-full px-3 py-1 border border-border/30">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl blur-2xl pointer-events-none" />
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
