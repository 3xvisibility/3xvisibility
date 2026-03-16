import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-dashboard.png";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground mb-6">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Now with WordPress &amp; Shopify integration
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
            Deploy data-driven
            <br />
            <span className="text-primary">content at scale</span>
          </h1>

          <p className="mt-4 md:mt-6 text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Upload a CSV, map it to a template, and generate hundreds of SEO-optimized pages — published directly to WordPress or Shopify in minutes.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="w-full sm:w-auto transition-all duration-150 hover:brightness-110 active:scale-[0.97]" asChild>
              <Link to="/auth">
                Start generating pages <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Free to start · No credit card required · 100 pages/month on Starter
          </p>
        </div>

        <div className="mt-12 md:mt-16 max-w-4xl mx-auto">
          <div className="rounded-xl shadow-surface-hover overflow-hidden border">
            <img
              src={heroImage}
              alt="Page Generator Platform dashboard showing CSV to page workflow"
              className="w-full h-auto"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
