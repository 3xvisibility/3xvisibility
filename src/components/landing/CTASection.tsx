import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

export function CTASection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal>
          <div className="rounded-3xl bg-gradient-cta p-12 md:p-20 text-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white/[0.04] blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-white/[0.04] blur-[60px] pointer-events-none" />
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{
                backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
              }}
            />

            <h2 className="text-2xl md:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-white relative z-10 leading-tight">
              Ready to deploy content at scale?
            </h2>
            <p className="mt-5 text-white/60 max-w-lg mx-auto text-base leading-relaxed relative z-10">
              Join 2,000+ SEO teams and agencies already generating thousands of pages with PageGen.
            </p>
            <Button
              size="lg"
              className="mt-10 bg-white text-foreground hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all duration-200 active:scale-[0.97] text-base px-8 h-12 rounded-xl relative z-10"
              asChild
            >
              <Link to="/auth">
                Get started for free <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
