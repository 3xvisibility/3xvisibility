import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-dashboard.png";

const ease = [0.16, 1, 0.3, 1] as const;

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Grain overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")` }} />
      
      {/* Accent glow */}
      <motion.div
        animate={{ opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[40%] -right-[20%] w-[70vw] h-[70vw] rounded-full bg-primary/20 blur-[200px] pointer-events-none"
      />
      <motion.div
        animate={{ opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute -bottom-[30%] -left-[20%] w-[50vw] h-[50vw] rounded-full bg-[hsl(var(--primary-glow))]/15 blur-[180px] pointer-events-none"
      />

      <div className="container mx-auto px-4 lg:px-8 relative z-10 py-16 md:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[11px] font-semibold text-primary tracking-wide uppercase mb-6"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Trusted by 2,000+ SEO teams
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease }}
              className="text-[2.75rem] sm:text-5xl lg:text-6xl xl:text-[4.5rem] font-extrabold tracking-[-0.05em] leading-[0.95]"
            >
              CSV to
              <br />
              published
              <br />
              <span className="text-gradient-primary">pages.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease }}
              className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-md"
            >
              Upload your data. Map it to a template. Generate hundreds of SEO-optimized pages — published to WordPress or Shopify in minutes.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_hsl(var(--primary)/.3)] hover:shadow-[0_0_50px_hsl(var(--primary)/.4)] transition-all duration-300 active:scale-[0.97] text-sm px-7 h-12 rounded-xl font-semibold"
                asChild
              >
                <Link to="/auth">
                  Start generating <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-muted-foreground hover:text-foreground h-12 text-sm gap-2 rounded-xl font-medium"
                asChild
              >
                <a href="#demo-video">
                  <div className="h-8 w-8 rounded-full border border-border/60 flex items-center justify-center">
                    <Play className="h-3 w-3 fill-current ml-0.5" />
                  </div>
                  Watch demo
                </a>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-6 flex items-center gap-4 text-xs text-muted-foreground/50"
            >
              <span>Free to start</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/20" />
              <span>No credit card</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/20" />
              <span>100 pages/mo</span>
            </motion.div>
          </div>

          {/* Right — Dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 50, rotateY: -5 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease }}
            className="relative"
          >
            <div className="absolute -inset-8 bg-gradient-to-br from-primary/10 via-[hsl(var(--primary-glow))]/5 to-transparent rounded-3xl blur-3xl" />
            <div className="relative rounded-2xl overflow-hidden border border-border/30 bg-card shadow-[0_20px_80px_-20px_hsl(var(--primary)/.15)]">
              <div className="h-9 bg-muted/40 flex items-center gap-2 px-4 border-b border-border/30">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400/50" />
                  <div className="h-2.5 w-2.5 rounded-full bg-success/50" />
                </div>
                <div className="ml-3 flex-1 max-w-[180px] h-3.5 rounded-md bg-muted/60" />
              </div>
              <img
                src={heroImage}
                alt="PageGen dashboard — CSV to page generation workflow"
                className="w-full h-auto block"
                loading="eager"
              />
            </div>
          </motion.div>
        </div>

        {/* Logo marquee */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-20 lg:mt-28 border-t border-border/20 pt-8"
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/30 font-semibold mb-6 text-center">
            Powering content for
          </p>
          <div className="flex items-center justify-center gap-12 flex-wrap">
            {["Shopify", "WordPress", "HubSpot", "Webflow", "Ahrefs"].map((name, i) => (
              <motion.span
                key={name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 + i * 0.1 }}
                className="text-base font-bold tracking-tight text-foreground/15 hover:text-foreground/30 transition-colors duration-300 cursor-default select-none"
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
