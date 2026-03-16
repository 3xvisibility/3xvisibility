import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { motion } from "framer-motion";

export function CTASection() {
  return (
    <section className="py-20 md:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal>
          <div className="rounded-2xl bg-gradient-cta p-10 md:p-16 text-center relative overflow-hidden">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.04, 0.08, 0.04] }}
              transition={{ duration: 6, repeat: Infinity }}
              className="absolute top-0 right-0 w-80 h-80 rounded-full bg-white blur-[100px] pointer-events-none"
            />
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{
                backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
              }}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative z-10"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-medium text-white/80 mb-6 border border-white/10">
                <Sparkles className="h-3 w-3" />
                Start for free — no credit card required
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight max-w-xl mx-auto">
                Ready to deploy content at scale?
              </h2>
              <p className="mt-4 text-white/45 max-w-md mx-auto text-base leading-relaxed">
                Join 2,000+ SEO teams already generating thousands of pages with PageGen.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  size="lg"
                  className="bg-white/90 backdrop-blur-md text-foreground hover:bg-white border border-white/40 shadow-[0_8px_32px_rgba(255,255,255,.2),inset_0_1px_0_rgba(255,255,255,.5)] hover:shadow-[0_12px_40px_rgba(255,255,255,.3)] transition-all duration-300 active:scale-[0.97] text-sm px-8 h-11 rounded-full font-semibold"
                  asChild
                >
                  <Link to="/auth">
                    Get started for free <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/15 bg-white/5 backdrop-blur-md text-white hover:bg-white/10 h-11 rounded-full text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,.08)]"
                  asChild
                >
                  <a href="#pricing">View pricing</a>
                </Button>
              </div>
            </motion.div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
