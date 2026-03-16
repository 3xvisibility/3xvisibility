import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="rounded-2xl bg-gradient-cta p-10 md:p-16 text-center relative overflow-hidden">
          {/* Decorative orbs */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />

          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white relative z-10">
            Ready to deploy content at scale?
          </h2>
          <p className="mt-4 text-white/70 max-w-lg mx-auto text-base relative z-10">
            Join 2,000+ SEO teams and agencies already generating thousands of pages with PageGen.
          </p>
          <Button
            size="lg"
            className="mt-8 bg-white text-foreground hover:bg-white/90 shadow-xl transition-all duration-200 active:scale-[0.97] text-base px-8 h-12 relative z-10"
            asChild
          >
            <Link to="/auth">
              Get started for free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
