import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, FileSpreadsheet, Layers, Rocket, CheckCircle2, BarChart3 } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { useEffect, useRef, useState } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

function AnimatedNumber({ value, prefix = "", suffix = "", delay = 0, color }: { value: number; prefix?: string; suffix?: string; delay?: number; color: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(false);

  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const timeout = setTimeout(() => {
      const mv = { v: 0 };
      const controls = animate(mv, { v: value }, {
        duration: 1.5,
        ease: "easeOut",
        onUpdate: () => setDisplay(Math.round(mv.v * 10) / 10),
      });
      return () => controls.stop();
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  const formatted = display >= 1000 ? display.toLocaleString("en-US", { maximumFractionDigits: 0 }) : 
    suffix === "%" && display % 1 !== 0 ? display.toFixed(1) : Math.round(display).toString();

  return (
    <p className={`text-lg md:text-xl font-bold tracking-tight ${color}`}>
      {prefix}{formatted}{suffix}
    </p>
  );
}

export function HeroSection() {
  const { t } = useLanguage();

  return (
    <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[600px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/.15),transparent)]" />
        <div className="absolute top-20 right-[10%] w-[400px] h-[400px] rounded-full bg-[hsl(var(--primary-glow))]/8 blur-[120px]" />
        <div className="absolute top-40 left-[10%] w-[300px] h-[300px] rounded-full bg-primary/6 blur-[100px]" />
      </div>

      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mb-8"
          >
            <Sparkles className="h-3 w-3" />
            <span>{t("hero.badge")}</span>
            <ArrowRight className="h-3 w-3" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-[-0.04em] leading-[1.05]"
          >
            {t("hero.title1")}
            <br />
            <span className="text-gradient-primary">{t("hero.title2")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease }}
            className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto"
          >
            {t("hero.description")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button
              size="lg"
              className="bg-foreground text-background hover:bg-foreground/90 transition-all duration-300 active:scale-[0.97] text-sm px-8 h-12 rounded-full font-semibold shadow-xl"
              asChild
            >
              <Link to="/auth">
                {t("hero.cta")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-border/50 text-foreground/70 hover:text-foreground h-12 text-sm px-8 rounded-full font-medium hover:bg-accent/50"
              asChild
            >
              <a href="#demo-video">{t("hero.watchDemo")}</a>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-5 flex items-center justify-center gap-6 text-xs text-muted-foreground/60"
          >
            <span>{t("hero.freeStart")}</span>
            <span>{t("hero.noCreditCard")}</span>
            <span>{t("hero.pagesPerMonth")}</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease }}
          className="mt-12 md:mt-16 max-w-3xl mx-auto relative"
        >
          <div className="absolute -inset-3 bg-gradient-to-b from-primary/8 via-primary/3 to-transparent rounded-2xl blur-2xl pointer-events-none" />
          <div className="relative rounded-xl overflow-hidden border border-border/40 bg-card/80 backdrop-blur-sm shadow-xl shadow-primary/5 p-5 md:p-6">
            {/* Animated workflow */}
            <div className="flex items-center gap-2 mb-4">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60 animate-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("hero.badge")}</span>
            </div>
            <div className="flex items-center justify-between gap-3 md:gap-4">
              {[
                { icon: FileSpreadsheet, label: "CSV", delay: 0.5 },
                { icon: Layers, label: "Template", delay: 0.7 },
                { icon: Rocket, label: "Deploy", delay: 0.9 },
                { icon: BarChart3, label: "Analytics", delay: 1.1 },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-3 md:gap-4 flex-1">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: step.delay, duration: 0.5, ease }}
                    className="flex flex-col items-center gap-1.5 flex-1"
                  >
                    <motion.div
                      animate={{ 
                        boxShadow: [
                          "0 0 0 0 hsl(var(--primary) / 0)",
                          "0 0 0 8px hsl(var(--primary) / 0.08)",
                          "0 0 0 0 hsl(var(--primary) / 0)",
                        ],
                      }}
                      transition={{ delay: 2 + i * 0.4, duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center"
                    >
                      <step.icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </motion.div>
                    <span className="text-[10px] font-medium text-muted-foreground">{step.label}</span>
                  </motion.div>
                  {i < 3 && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: step.delay + 0.2, duration: 0.4, ease }}
                      className="h-px flex-1 origin-left hidden sm:block relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-primary/10" />
                      <motion.div
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ delay: 2.5 + i * 0.4, duration: 1.5, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
                        className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-primary/40 to-transparent"
                      />
                    </motion.div>
                  )}
                </div>
              ))}
            </div>

            {/* Animated stats row */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { label: "Pages", value: "1,248", color: "text-emerald-500" },
                { label: "Indexed", value: "98.2%", color: "text-primary" },
                { label: "Traffic", value: "+340%", color: "text-amber-500" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 + i * 0.1, duration: 0.4, ease }}
                  className="rounded-lg bg-muted/40 border border-border/20 p-3 text-center"
                >
                  <p className={`text-lg md:text-xl font-bold tracking-tight ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Animated progress bars */}
            <div className="mt-4 space-y-2">
              {[
                { w: "85%", delay: 1.6 },
                { w: "62%", delay: 1.7 },
              ].map((bar, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500/60 shrink-0" />
                  <div className="flex-1 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: bar.w }}
                      transition={{ delay: bar.delay, duration: 0.8, ease }}
                      className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary/30 relative overflow-hidden"
                    >
                      <motion.div
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ delay: 3 + i * 0.5, duration: 1.2, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
                        className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                      />
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 md:mt-20 text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/40 font-medium mb-6">
            {t("hero.trustedBy")}
          </p>
          <div className="flex items-center justify-center gap-8 md:gap-14 flex-wrap">
            {["Shopify", "WordPress", "HubSpot", "Webflow", "Ahrefs"].map((name, i) => (
              <motion.span
                key={name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 + i * 0.08 }}
                className="text-sm md:text-base font-semibold text-foreground/10 hover:text-foreground/25 transition-colors duration-300 select-none"
              >
                {name}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
