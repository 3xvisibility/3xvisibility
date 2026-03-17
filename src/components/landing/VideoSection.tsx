import { ScrollReveal } from "./ScrollReveal";
import { Play } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export function VideoSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section id="demo-video" className="py-16 md:py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="max-w-3xl mx-auto mb-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary mb-3 block">Demo</span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.04em] leading-[1.05]">
                See it <span className="text-muted-foreground">in action.</span>
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Watch how teams generate thousands of pages in minutes.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.15} className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-border/30 shadow-[0_20px_80px_-20px_hsl(var(--primary)/.12)]">
            <div className="relative aspect-video bg-card">
              {playing ? (
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/JxKJSjHGNzg?autoplay=1&rel=0&modestbranding=1"
                  title="PageGen Demo Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div
                  className="absolute inset-0 cursor-pointer group bg-gradient-to-br from-foreground/90 to-foreground/70 dark:from-foreground/10 dark:to-foreground/5"
                  onClick={() => setPlaying(true)}
                >
                  <div
                    className="absolute inset-0 opacity-[0.05]"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shadow-[0_0_40px_hsl(var(--primary)/.4)] group-hover:shadow-[0_0_60px_hsl(var(--primary)/.5)] transition-all duration-300"
                    >
                      <Play className="h-6 w-6 text-primary-foreground ml-0.5 fill-primary-foreground" />
                    </motion.div>
                    <div className="text-center">
                      <p className="text-background dark:text-foreground font-bold text-sm">Watch the 2-minute demo</p>
                      <p className="text-background/50 dark:text-foreground/40 text-xs mt-1">CSV → Published Pages workflow</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* Stats row */}
        <ScrollReveal delay={0.25}>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { value: "2.4M+", label: "Pages generated" },
              { value: "340%", label: "Avg. traffic boost" },
              { value: "< 2min", label: "Setup time" },
              { value: "99.9%", label: "Uptime SLA" },
            ].map((stat) => (
              <div key={stat.label} className="text-center py-4 rounded-xl border border-border/20 bg-card/30">
                <p className="text-lg md:text-xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5 uppercase tracking-wider font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
