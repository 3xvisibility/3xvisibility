import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Play, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-dashboard.png";

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 lg:pt-24 lg:pb-32">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.04, 0.07, 0.04] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] rounded-full bg-primary blur-[150px]"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.08, 0.05] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[100px] -right-[300px] w-[600px] h-[600px] rounded-full bg-[hsl(var(--primary-glow))] blur-[120px]"
        />
      </div>

      {/* Dot grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Animated badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease }}
            className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/[0.05] backdrop-blur-sm px-5 py-2 text-xs font-medium text-primary mb-8 shadow-[0_0_20px_hsl(var(--primary)/.1)]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Trusted by 2,000+ SEO teams worldwide</span>
            <div className="flex -space-x-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="text-[2.5rem] sm:text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold tracking-[-0.04em] leading-[1.05]"
          >
            Deploy data-driven
            <br />
            <span className="text-gradient-primary relative">
              content at scale
              <motion.span
                className="absolute -bottom-1.5 left-0 right-0 h-1 bg-gradient-primary rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.6, ease }}
              />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease }}
            className="mt-5 text-base md:text-lg text-muted-foreground max-w-[560px] mx-auto leading-relaxed"
          >
            Upload a CSV, map it to a template, and generate hundreds of SEO-optimized pages — published directly to WordPress or Shopify in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button
              size="lg"
              className="w-full sm:w-auto bg-gradient-primary border border-primary/30 backdrop-blur-md shadow-[0_8px_32px_hsl(var(--primary)/.4),inset_0_1px_0_rgba(255,255,255,.15)] hover:shadow-[0_12px_40px_hsl(var(--primary)/.55)] hover:brightness-110 transition-all duration-300 active:scale-[0.97] text-sm px-8 h-12 rounded-full font-semibold"
              asChild
            >
              <Link to="/auth">
                Start generating pages <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-12 text-sm border-border/40 bg-background/50 backdrop-blur-xl rounded-full hover:bg-background/80 hover:border-border/60 gap-2.5 font-medium shadow-[0_2px_12px_rgba(0,0,0,.06),inset_0_1px_0_rgba(255,255,255,.1)] transition-all duration-300"
              asChild
            >
              <a href="#demo-video">
                <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center">
                  <Play className="h-3 w-3 fill-primary text-primary ml-0.5" />
                </div>
                Watch demo
              </a>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mt-5 flex items-center justify-center gap-5 text-xs text-muted-foreground/60"
          >
            {["Free to start", "No credit card", "100 pages/mo on Starter"].map((t, i) => (
              <span key={t} className="flex items-center gap-2">
                {i > 0 && <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />}
                {t}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Hero image — properly sized and centered */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.4, ease }}
          className="mt-14 md:mt-20 max-w-4xl mx-auto relative"
        >
          {/* Glow behind image */}
          <div className="absolute -inset-6 bg-gradient-to-b from-primary/15 via-[hsl(var(--primary-glow)/.08)] to-transparent rounded-3xl blur-3xl opacity-50" />

          <div className="relative rounded-xl shadow-glow overflow-hidden border border-border/40 bg-background">
            <div className="h-10 bg-muted/50 flex items-center gap-2 px-4 border-b border-border/40">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
              </div>
              <div className="ml-3 flex-1 max-w-[220px] h-4 rounded bg-muted/80" />
            </div>
            <img
              src={heroImage}
              alt="Page Generator Platform dashboard showing CSV to page workflow"
              className="w-full h-auto block"
              loading="eager"
            />
          </div>
        </motion.div>

        {/* Logos strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="mt-14 md:mt-20 text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground/40 font-semibold mb-7">
            Powering content for teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {["Shopify", "WordPress", "HubSpot", "Webflow", "Ahrefs"].map((name, i) => (
              <motion.span
                key={name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="text-lg font-bold tracking-tight text-foreground/20 hover:text-foreground/40 transition-colors duration-300 cursor-default"
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
