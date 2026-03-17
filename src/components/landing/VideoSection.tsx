import { ScrollReveal } from "./ScrollReveal";
import { Play } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";

export function VideoSection() {
  const [playing, setPlaying] = useState(false);
  const { t } = useLanguage();

  return (
    <section id="demo-video" className="py-20 md:py-28 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-4 bg-primary/5 border border-primary/10 rounded-full px-4 py-1">
            {t("video.badge")}
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em]">
            {t("video.title")}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("video.description")}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-border/30 shadow-2xl shadow-primary/5">
            <div className="relative aspect-video bg-card">
              {playing ? (
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/JxKJSjHGNzg?autoplay=1&rel=0&modestbranding=1"
                  title="PageGen Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div
                  className="absolute inset-0 cursor-pointer group bg-gradient-to-br from-foreground/5 to-foreground/10 dark:from-foreground/5 dark:to-foreground/10"
                  onClick={() => setPlaying(true)}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="h-16 w-16 rounded-full bg-foreground text-background flex items-center justify-center shadow-2xl group-hover:shadow-3xl transition-all duration-300"
                    >
                      <Play className="h-6 w-6 ml-1 fill-current" />
                    </motion.div>
                    <p className="text-sm font-medium text-foreground/80">{t("video.watchDemo")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: "2.4M+", labelKey: "video.pagesGenerated" },
              { value: "340%", labelKey: "video.avgTrafficBoost" },
              { value: "< 2min", labelKey: "video.setupTime" },
              { value: "99.9%", labelKey: "video.uptimeSLA" },
            ].map((stat) => (
              <div key={stat.labelKey} className="text-center py-5 rounded-2xl border border-border/20 bg-card/50">
                <p className="text-2xl md:text-3xl font-extrabold tracking-tight">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1 uppercase tracking-wider font-medium">{t(stat.labelKey)}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
