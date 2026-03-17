import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { motion } from "framer-motion";

const plans = [
  { name: "Starter", price: "$29", pages: "100 pages/month", features: ["1 website", "5 templates", "CSV upload", "Email support"], cta: "Get Started", popular: false },
  { name: "Pro", price: "$79", pages: "2,000 pages/month", features: ["5 websites", "Unlimited templates", "CSV upload", "Priority support", "API access", "Analytics"], cta: "Start Pro Trial", popular: true },
  { name: "Agency", price: "$199", pages: "10,000 pages/month", features: ["Unlimited websites", "Unlimited templates", "CSV upload", "Dedicated support", "API access", "White-label", "Team members"], cta: "Contact Sales", popular: false },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 md:py-28 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-4 bg-primary/5 border border-primary/10 rounded-full px-4 py-1">
            Pricing
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em]">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Start free. Scale as you grow. No hidden fees.
          </p>
        </ScrollReveal>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto items-stretch"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
            >
              <Card
                className={`relative h-full rounded-2xl overflow-hidden transition-all duration-300 ${
                  plan.popular
                    ? "border-primary/40 bg-card shadow-xl shadow-primary/10 scale-[1.02]"
                    : "border-border/30 bg-card/60 hover:border-border/50"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))]" />
                )}
                <CardHeader className="pb-2 pt-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold">{plan.name}</CardTitle>
                    {plan.popular && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="mt-4">
                    <span className="text-4xl font-extrabold tabular-nums tracking-tight">{plan.price}</span>
                    <span className="text-muted-foreground text-sm ml-1">/mo</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1">{plan.pages}</p>
                </CardHeader>
                <CardContent className="pt-5">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[12px]">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="text-foreground/75">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full rounded-xl h-10 text-sm font-semibold transition-all duration-300 active:scale-[0.97] ${
                      plan.popular
                        ? "bg-foreground text-background hover:bg-foreground/90 shadow-lg"
                        : "bg-card border border-border/50 text-foreground hover:bg-accent"
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link to="/auth">
                      {plan.cta}
                      {plan.popular && <ArrowRight className="ml-1.5 h-3.5 w-3.5" />}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
