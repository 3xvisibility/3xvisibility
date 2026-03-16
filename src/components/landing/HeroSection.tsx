import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from "lucide-react";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-dashboard.png";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
      {/* Gradient background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -top-20 -left-40 w-[400px] h-[400px] rounded-full bg-[hsl(var(--primary-glow)/.07)] blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-primary/[0.02] blur-3xl" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Social proof pill */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mb-8"
          >
            <div className="flex -space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-primary text-primary" />
              ))}
            </div>
            Trusted by 2,000+ SEO teams worldwide
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]"
          >
            Deploy data-driven
            <br />
            <span className="text-gradient-primary">content at scale</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 md:mt-6 text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
          >
            Upload a CSV, map it to a template, and generate hundreds of SEO-optimized pages — published directly to WordPress or Shopify in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button
              size="lg"
              className="w-full sm:w-auto bg-gradient-primary border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 transition-all duration-200 active:scale-[0.97] text-base px-8 h-12"
              asChild
            >
              <Link to="/auth">
                Start generating pages <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 text-base border-border/60" asChild>
              <a href="#how-it-works">See how it works</a>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-4 text-xs text-muted-foreground"
          >
            Free to start · No credit card required · 100 pages/month on Starter
          </motion.p>
        </div>

        {/* Hero image with glow */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14 md:mt-20 max-w-5xl mx-auto relative"
        >
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-[hsl(var(--primary-glow)/.15)] to-primary/20 rounded-2xl blur-2xl opacity-60" />
          <div className="relative rounded-xl shadow-glow overflow-hidden border border-primary/10 bg-background">
            <div className="h-8 bg-muted/80 flex items-center gap-1.5 px-4 border-b">
              <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
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
          className="mt-14 md:mt-20 text-center"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground/60 font-medium mb-6">Trusted by teams at</p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 opacity-40">
            {["Shopify", "WordPress", "HubSpot", "Webflow", "Ahrefs"].map((name) => (
              <span key={name} className="text-lg font-bold tracking-tight text-foreground">{name}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
