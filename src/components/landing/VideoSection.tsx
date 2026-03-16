import { ScrollReveal } from "./ScrollReveal";
import { Play, MonitorPlay } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export function VideoSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section id="demo-video" className="py-28 md:py-36 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/[0.03] blur-[150px] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-5 bg-primary/[0.06] rounded-full px-4 py-1.5">
            <MonitorPlay className="h-3 w-3" />
            Demo Video
          </span>
          <h2 className="text-3xl md:text-[2.75rem] lg:text-5xl font-extrabold tracking-tight leading-[1.1]">
            See PageGen{" "}
            <span className="text-gradient-primary">in action</span>
          </h2>
          <p className="mt-6 text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto">
            Watch how teams generate thousands of SEO-optimized pages in minutes — from CSV upload to live publication.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2} className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-border/40 shadow-glow">
            {/* Glow behind */}
            <div className="absolute -inset-6 bg-gradient-to-b from-primary/15 via-[hsl(var(--primary-glow)/.08)] to-transparent rounded-3xl blur-3xl opacity-50 pointer-events-none" />

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
                  className="absolute inset-0 cursor-pointer group"
                  onClick={() => setPlaying(true)}
                >
                  {/* Placeholder visual */}
                  <div className="absolute inset-0 bg-gradient-cta opacity-90" />
                  <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                      backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                      backgroundSize: "20px 20px",
                    }}
                  />

                  {/* Content overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-[0_0_60px_rgba(255,255,255,.2)] group-hover:bg-white/30 transition-all duration-300"
                    >
                      <Play className="h-8 w-8 text-white ml-1 fill-white" />
                    </motion.div>
                    <div className="text-center">
                      <p className="text-white font-bold text-lg">Watch the 2-minute demo</p>
                      <p className="text-white/50 text-sm mt-1">See the complete CSV → Published Pages workflow</p>
                    </div>
                  </div>

                  {/* Fake timeline bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                    <div className="h-full w-0 bg-white/40 rounded-full" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* Stats below video */}
        <ScrollReveal delay={0.3}>
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { value: "2.4M+", label: "Pages generated" },
              { value: "340%", label: "Avg. traffic boost" },
              { value: "< 2min", label: "Setup time" },
              { value: "99.9%", label: "Uptime SLA" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-3xl font-extrabold tracking-tight text-gradient-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
