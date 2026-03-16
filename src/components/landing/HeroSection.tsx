import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Play } from "lucide-react";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-dashboard.png";

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 lg:pt-28 lg:pb-40">
      {/* Refined gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full bg-primary/[0.04] blur-[120px]" />
        <div className="absolute top-[200px] -right-[200px] w-[500px] h-[500px] rounded-full bg-[hsl(var(--primary-glow)/.05)] blur-[100px]" />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Social proof pill */}
          <motion.div
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, ease }}
            className="inline-flex items-center gap-2.5 rounded-full border border-border/60 bg-background/80 backdrop-blur-sm px-4 py-2 text-xs font-medium text-muted-foreground mb-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <div className="flex -space-x-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="h-3 w-px bg-border" />
            Trusted by 2,000+ SEO teams
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.08, ease }}
            className="text-[2.5rem] sm:text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold tracking-[-0.035em] leading-[1.08]"
          >
            Deploy data-driven
            <br />
            <span className="text-gradient-primary">content at scale</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease }}
            className="mt-6 text-base md:text-lg text-muted-foreground max-w-[540px] mx-auto leading-relaxed"
          >
            Upload a CSV, map it to a template, and generate hundreds of SEO-optimized pages — published directly to WordPress or Shopify in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.26, ease }}
            className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button
              size="lg"
              className="w-full sm:w-auto bg-gradient-primary border-0 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:brightness-110 transition-all duration-200 active:scale-[0.97] text-base px-8 h-12 rounded-xl"
              asChild
            >
              <Link to="/auth">
                Start generating pages <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 text-base border-border/60 rounded-xl hover:bg-accent/50 gap-2" asChild>
              <a href="#how-it-works">
                <Play className="h-3.5 w-3.5 fill-current" />
                See how it works
              </a>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-5 text-xs text-muted-foreground/70"
          >
            Free to start · No credit card required · 100 pages/month on Starter
          </motion.p>
        </div>

        {/* Hero image */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.35, ease }}
          className="mt-16 md:mt-24 max-w-5xl mx-auto relative"
        >
          <div className="absolute -inset-6 bg-gradient-to-b from-primary/15 via-[hsl(var(--primary-glow)/.08)] to-transparent rounded-3xl blur-3xl opacity-50" />
          <div className="relative rounded-2xl shadow-glow overflow-hidden border border-border/40 bg-background">
            <div className="h-10 bg-muted/50 flex items-center gap-2 px-4 border-b border-border/40">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-destructive/50" />
                <div className="h-3 w-3 rounded-full bg-amber-400/50" />
                <div className="h-3 w-3 rounded-full bg-success/50" />
              </div>
              <div className="ml-2 flex-1 max-w-[240px] h-5 rounded-md bg-muted/80" />
            </div>
            <img
              src={heroImage}
              alt="Page Generator Platform dashboard showing CSV to page workflow"
              className="w-full h-auto"
              loading="eager"
            />
          </div>
        </motion.div>

        {/* Logos strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 md:mt-24 text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium mb-8">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {["Shopify", "WordPress", "HubSpot", "Webflow", "Ahrefs"].map((name) => (
              <span
                key={name}
                className="text-lg font-semibold tracking-tight text-foreground/25 hover:text-foreground/40 transition-colors duration-300"
              >
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
