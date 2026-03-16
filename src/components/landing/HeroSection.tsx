import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Play, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-dashboard.png";

const ease = [0.22, 1, 0.36, 1] as const;

const floatingStats = [
  { label: "Pages Generated", value: "2.4M+", x: "-8%", y: "35%" },
  { label: "Avg. Traffic Boost", value: "340%", x: "85%", y: "45%" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-36 lg:pt-32 lg:pb-44">
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
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.03, 0.06, 0.03] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute bottom-[100px] -left-[200px] w-[500px] h-[500px] rounded-full bg-primary blur-[100px]"
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
            className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/[0.05] backdrop-blur-sm px-5 py-2.5 text-xs font-medium text-primary mb-10 shadow-[0_0_20px_hsl(var(--primary)/.1)]"
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
            className="text-[2.75rem] sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-[-0.04em] leading-[1.05]"
          >
            Deploy data-driven
            <br />
            <span className="text-gradient-primary relative">
              content at scale
              <motion.span
                className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-primary rounded-full"
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
            className="mt-7 text-lg md:text-xl text-muted-foreground max-w-[600px] mx-auto leading-relaxed"
          >
            Upload a CSV, map it to a template, and generate hundreds of SEO-optimized pages — published directly to WordPress or Shopify in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              className="w-full sm:w-auto bg-gradient-primary border-0 shadow-[0_8px_30px_hsl(var(--primary)/.35)] hover:shadow-[0_12px_40px_hsl(var(--primary)/.5)] hover:brightness-110 transition-all duration-300 active:scale-[0.97] text-base px-10 h-13 rounded-2xl font-semibold"
              asChild
            >
              <Link to="/auth">
                Start generating pages <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-13 text-base border-border/60 rounded-2xl hover:bg-accent/50 gap-2.5 font-medium"
              asChild
            >
              <a href="#demo-video">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
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
            className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground/60"
          >
            {["Free to start", "No credit card", "100 pages/mo on Starter"].map((t, i) => (
              <span key={t} className="flex items-center gap-2">
                {i > 0 && <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />}
                {t}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Hero image with floating stats */}
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.4, ease }}
          className="mt-20 md:mt-28 max-w-5xl mx-auto relative"
        >
          {/* Glow behind image */}
          <div className="absolute -inset-8 bg-gradient-to-b from-primary/20 via-[hsl(var(--primary-glow)/.1)] to-transparent rounded-[2rem] blur-3xl opacity-60" />

          {/* Floating stat cards */}
          {floatingStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 + i * 0.15, ease }}
              className="absolute z-20 hidden lg:block"
              style={{ left: stat.x, top: stat.y }}
            >
              <div className="rounded-xl border border-border/60 bg-background/90 backdrop-blur-xl shadow-lg px-4 py-3">
                <p className="text-xl font-extrabold tracking-tight text-primary">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </motion.div>
          ))}

          <div className="relative rounded-2xl shadow-glow overflow-hidden border border-border/40 bg-background">
            <div className="h-11 bg-muted/50 flex items-center gap-2 px-4 border-b border-border/40">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-amber-400/60" />
                <div className="h-3 w-3 rounded-full bg-success/60" />
              </div>
              <div className="ml-3 flex-1 max-w-[260px] h-5 rounded-md bg-muted/80" />
            </div>
            <img
              src={heroImage}
              alt="Page Generator Platform dashboard showing CSV to page workflow"
              className="w-full h-auto"
              loading="eager"
            />
          </div>
        </motion.div>

        {/* Logos strip with animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="mt-20 md:mt-28 text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground/40 font-semibold mb-10">
            Powering content for teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
            {["Shopify", "WordPress", "HubSpot", "Webflow", "Ahrefs"].map((name, i) => (
              <motion.span
                key={name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="text-xl font-bold tracking-tight text-foreground/20 hover:text-foreground/40 transition-colors duration-300 cursor-default"
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
