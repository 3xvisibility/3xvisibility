import { ScrollReveal } from "./ScrollReveal";
import { Play, MonitorPlay } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export function VideoSection() {
  const [playing, setPlaying] = useState(false);

  return (
    <section id="demo-video" className="py-20 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-[150px] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4 bg-primary/[0.06] rounded-full px-3.5 py-1">
            <MonitorPlay className="h-3 w-3" />
            Demo Video
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1]">
            See PageGen{" "}
            <span className="text-gradient-primary">in action</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base leading-relaxed max-w-lg mx-auto">
            Watch how teams generate thousands of SEO-optimized pages in minutes.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2} className="max-w-3xl mx-auto">
          <div className="relative rounded-xl overflow-hidden border border-border/40 shadow-glow">
            <div className="absolute -inset-4 bg-gradient-to-b from-primary/10 via-[hsl(var(--primary-glow)/.06)] to-transparent rounded-2xl blur-2xl opacity-50 pointer-events-none" />

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
                  <div className="absolute inset-0 bg-gradient-cta opacity-90" />
                  <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                      backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                      backgroundSize: "20px 20px",
                    }}
                  />

                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="h-16 w-16 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,.15)] group-hover:bg-white/25 transition-all duration-300"
                    >
                      <Play className="h-6 w-6 text-white ml-0.5 fill-white" />
                    </motion.div>
                    <div className="text-center">
                      <p className="text-white font-bold text-base">Watch the 2-minute demo</p>
                      <p className="text-white/45 text-sm mt-1">See the complete CSV → Published Pages workflow</p>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                    <div className="h-full w-0 bg-white/40 rounded-full" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* Stats */}
        <ScrollReveal delay={0.3}>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-5 max-w-2xl mx-auto">
            {[
              { value: "2.4M+", label: "Pages generated" },
              { value: "340%", label: "Avg. traffic boost" },
              { value: "< 2min", label: "Setup time" },
              { value: "99.9%", label: "Uptime SLA" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xl md:text-2xl font-extrabold tracking-tight text-gradient-primary">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
