import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

export function CTASection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal>
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground/90 dark:from-card dark:via-card dark:to-card/90" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/.2),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--primary-glow)/.15),transparent_60%)]" />

            <div className="relative z-10 py-16 md:py-20 px-8 md:px-16 text-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] text-background dark:text-foreground leading-tight max-w-lg mx-auto">
                Ready to deploy content at scale?
              </h2>
              <p className="mt-4 text-background/60 dark:text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
                Join 2,000+ SEO teams already generating thousands of pages.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  size="lg"
                  className="bg-background text-foreground hover:bg-background/90 dark:bg-foreground dark:text-background dark:hover:bg-foreground/90 transition-all duration-300 active:scale-[0.97] text-sm px-8 h-12 rounded-full font-semibold shadow-xl"
                  asChild
                >
                  <Link to="/auth">
                    Get started free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-background/20 dark:border-border/30 bg-transparent text-background/80 dark:text-foreground/70 hover:bg-background/10 dark:hover:bg-accent h-12 rounded-full text-sm font-medium"
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
