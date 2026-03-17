import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { motion } from "framer-motion";

export function CTASection() {
  return (
    <section className="py-16 md:py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal>
          <div className="relative rounded-2xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-foreground dark:bg-card" />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
              }}
            />
            <motion.div
              animate={{ opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 6, repeat: Infinity }}
              className="absolute top-0 right-0 w-[50%] h-full bg-primary/20 blur-[150px] pointer-events-none"
            />

            <div className="relative z-10 p-10 md:p-16 text-center">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-[-0.04em] text-background dark:text-foreground leading-tight max-w-lg mx-auto">
                Ready to deploy content at scale?
              </h2>
              <p className="mt-3 text-background/50 dark:text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
                Join 2,000+ SEO teams already generating thousands of pages.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_hsl(var(--primary)/.4)] hover:shadow-[0_0_50px_hsl(var(--primary)/.5)] transition-all duration-300 active:scale-[0.97] text-sm px-7 h-11 rounded-xl font-semibold"
                  asChild
                >
                  <Link to="/auth">
                    Get started free <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-background/15 dark:border-border/30 bg-transparent text-background/70 dark:text-foreground/70 hover:bg-background/10 dark:hover:bg-accent h-11 rounded-xl text-sm font-medium"
                  asChild
                >
                  <a href="#pricing">View pricing</a>
                </Button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
