import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, FileSpreadsheet, Layers, Rocket, CheckCircle2, BarChart3 } from "lucide-react";
import { motion, animate } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { BrandLogos } from "./BrandLogos";
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
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden">
      {/* Background effects - deep purple radials like Revo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top center purple glow */}
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(262,83%,58%,0.15),transparent_70%)]" />
        {/* Left purple accent */}
        <div className="absolute top-[100px] left-[5%] w-[400px] h-[400px] rounded-full bg-[hsl(280,80%,65%,0.06)] blur-[100px]" />
        {/* Right purple accent */}
        <div className="absolute top-[200px] right-[5%] w-[350px] h-[350px] rounded-full bg-[hsl(262,83%,58%,0.05)] blur-[80px]" />
        {/* Subtle noise overlay */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(262,83%,58%) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge pill */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-[hsl(262,83%,58%,0.2)] bg-[hsl(262,83%,58%,0.08)] px-4 py-1.5 text-xs font-medium text-[hsl(262,83%,68%)] mb-8"
          >
            <Sparkles className="h-3 w-3" />
            <span>{t("hero.badge")}</span>
            <ArrowRight className="h-3 w-3" />
          </motion.div>

          {/* Main heading - large and dramatic like Revo */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-extrabold tracking-[-0.04em] leading-[1.05]"
          >
            {t("hero.title1")}
            <br />
            <span className="text-gradient-primary">{t("hero.title2")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease }}
            className="mt-6 text-base md:text-lg text-[hsl(250,15%,55%)] leading-relaxed max-w-xl mx-auto"
          >
            {t("hero.description")}
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-[0.97] text-sm px-8 h-12 rounded-xl font-semibold shadow-xl shadow-primary/25"
              asChild
            >
              <Link to="/auth">
                {t("hero.cta")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-[hsl(262,83%,58%,0.2)] bg-transparent text-[hsl(250,15%,70%)] hover:text-foreground h-12 text-sm px-8 rounded-xl font-medium hover:bg-[hsl(262,83%,58%,0.08)] hover:border-[hsl(262,83%,58%,0.3)]"
              asChild
            >
              <a href="#demo-video">{t("hero.watchDemo")}</a>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-5 flex items-center justify-center gap-6 text-xs text-[hsl(250,15%,45%)]"
          >
            <span>{t("hero.freeStart")}</span>
            <span>{t("hero.noCreditCard")}</span>
            <span>{t("hero.pagesPerMonth")}</span>
          </motion.div>
        </div>

        {/* Dashboard preview card - Revo style with glow border */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease }}
          className="mt-14 md:mt-20 max-w-4xl mx-auto relative"
        >
          {/* Glow behind card */}
          <div className="absolute -inset-4 bg-[radial-gradient(ellipse_at_center,hsl(262,83%,58%,0.12),transparent_70%)] rounded-3xl blur-xl pointer-events-none" />
          
          <div className="relative rounded-2xl overflow-hidden border border-[hsl(262,83%,58%,0.15)] bg-[hsl(252,30%,9%)] shadow-2xl">
            {/* Top bar like browser */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[hsl(262,83%,58%,0.08)] bg-[hsl(252,30%,8%)]">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[hsl(0,60%,45%)]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[hsl(40,70%,50%)]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[hsl(140,50%,40%)]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="h-5 w-48 rounded-md bg-[hsl(250,25%,14%)] flex items-center justify-center">
                  <span className="text-[9px] text-[hsl(250,15%,45%)] font-mono">app.pagegen.io/dashboard</span>
                </div>
              </div>
            </div>

            {/* Dashboard content */}
            <div className="p-5 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2.5 w-2.5 rounded-full bg-[hsl(142,76%,36%)] animate-pulse" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(250,15%,50%)]">{t("hero.badge")}</span>
              </div>

              {/* Workflow steps */}
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
                            "0 0 0 0 hsl(262 83% 58% / 0)",
                            "0 0 0 8px hsl(262 83% 58% / 0.1)",
                            "0 0 0 0 hsl(262 83% 58% / 0)",
                          ],
                        }}
                        transition={{ delay: 2 + i * 0.4, duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-[hsl(262,83%,58%,0.1)] border border-[hsl(262,83%,58%,0.2)] flex items-center justify-center"
                      >
                        <step.icon className="h-4 w-4 md:h-5 md:w-5 text-[hsl(262,83%,68%)]" />
                      </motion.div>
                      <span className="text-[10px] font-medium text-[hsl(250,15%,50%)]">{step.label}</span>
                    </motion.div>
                    {i < 3 && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: step.delay + 0.2, duration: 0.4, ease }}
                        className="h-px flex-1 origin-left hidden sm:block relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(262,83%,58%,0.3)] to-[hsl(262,83%,58%,0.1)]" />
                        <motion.div
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{ delay: 2.5 + i * 0.4, duration: 1.5, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
                          className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-[hsl(262,83%,58%,0.4)] to-transparent"
                        />
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>

              {/* Stats row */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { label: "Pages", numValue: 1248, prefix: "", suffix: "", color: "text-[hsl(142,76%,50%)]" },
                  { label: "Indexed", numValue: 98.2, prefix: "", suffix: "%", color: "text-[hsl(262,83%,68%)]" },
                  { label: "Traffic", numValue: 340, prefix: "+", suffix: "%", color: "text-[hsl(38,92%,60%)]" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.3 + i * 0.1, duration: 0.4, ease }}
                    className="rounded-lg bg-[hsl(250,25%,12%)] border border-[hsl(262,83%,58%,0.08)] p-3 text-center"
                  >
                    <AnimatedNumber value={stat.numValue} prefix={stat.prefix} suffix={stat.suffix} delay={1.5 + i * 0.15} color={stat.color} />
                    <p className="text-[10px] text-[hsl(250,15%,45%)] mt-0.5">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Progress bars */}
              <div className="mt-4 space-y-2">
                {[
                  { w: "85%", delay: 1.6 },
                  { w: "62%", delay: 1.7 },
                ].map((bar, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-[hsl(142,76%,50%,0.6)] shrink-0" />
                    <div className="flex-1 h-1.5 rounded-full bg-[hsl(250,25%,14%)] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: bar.w }}
                        transition={{ delay: bar.delay, duration: 0.8, ease }}
                        className="h-full rounded-full bg-gradient-to-r from-[hsl(262,83%,58%,0.6)] to-[hsl(280,80%,65%,0.3)] relative overflow-hidden"
                      >
                        <motion.div
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{ delay: 3 + i * 0.5, duration: 1.2, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
                          className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-[hsl(262,83%,58%,0.3)] to-transparent"
                        />
                      </motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <BrandLogos />
      </div>
    </section>
  );
}
