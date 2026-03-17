import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-dashboard.png";
import { useLanguage } from "@/i18n/LanguageContext";

const ease = [0.22, 1, 0.36, 1] as const;

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
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease }}
          className="mt-16 md:mt-20 max-w-5xl mx-auto relative"
        >
          <div className="absolute -inset-4 md:-inset-8 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent rounded-3xl blur-3xl pointer-events-none" />
          <div className="relative rounded-xl md:rounded-2xl overflow-hidden border border-border/40 bg-card shadow-2xl shadow-primary/5">
            <div className="h-10 bg-muted/50 flex items-center px-4 border-b border-border/30 gap-3">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
              </div>
              <div className="flex-1 max-w-sm mx-auto h-5 rounded-md bg-muted/60 flex items-center justify-center">
                <span className="text-[9px] text-muted-foreground/40 font-mono">app.pagegen.io/campaigns</span>
              </div>
            </div>
            <img
              src={heroImage}
              alt={t("hero.altImage")}
              className="w-full h-auto block"
              loading="eager"
            />
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
