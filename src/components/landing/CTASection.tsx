import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { motion } from "framer-motion";

export function CTASection() {
  return (
    <section className="py-28 md:py-36 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal>
          <div className="rounded-3xl bg-gradient-cta p-14 md:p-24 text-center relative overflow-hidden">
            {/* Animated decorative orbs */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.04, 0.08, 0.04] }}
              transition={{ duration: 6, repeat: Infinity }}
              className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white blur-[100px] pointer-events-none"
            />
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.03, 0.06, 0.03] }}
              transition={{ duration: 8, repeat: Infinity, delay: 2 }}
              className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white blur-[80px] pointer-events-none"
            />
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{
                backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                backgroundSize: "28px 28px",
              }}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative z-10"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-xs font-medium text-white/80 mb-8 border border-white/10">
                <Sparkles className="h-3.5 w-3.5" />
                Start for free — no credit card required
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight max-w-2xl mx-auto">
                Ready to deploy content at scale?
              </h2>
              <p className="mt-6 text-white/50 max-w-lg mx-auto text-lg leading-relaxed">
                Join 2,000+ SEO teams and agencies already generating thousands of pages with PageGen.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-white text-foreground hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-[0.97] text-base px-10 h-13 rounded-2xl font-semibold"
                  asChild
                >
                  <Link to="/auth">
                    Get started for free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/20 text-white hover:bg-white/10 h-13 rounded-2xl text-base font-medium"
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
