import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { motion } from "framer-motion";

const plans = [
  { name: "Starter", price: "$29", pages: "100 pages/month", features: ["1 connected website", "5 templates", "CSV upload", "Email support"], cta: "Get Started", popular: false },
  { name: "Pro", price: "$79", pages: "2,000 pages/month", features: ["5 connected websites", "Unlimited templates", "CSV upload", "Priority support", "API access", "Campaign analytics"], cta: "Start Pro Trial", popular: true },
  { name: "Agency", price: "$199", pages: "10,000 pages/month", features: ["Unlimited websites", "Unlimited templates", "CSV upload", "Dedicated support", "API access", "White-label", "Team members"], cta: "Contact Sales", popular: false },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-16 md:py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary mb-3 block">Pricing</span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.04em] leading-[1.05]">
                Simple pricing.
                <br />
                <span className="text-muted-foreground">No hidden fees.</span>
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Start free and scale as you grow.
            </p>
          </div>
        </ScrollReveal>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-4xl mx-auto items-start"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
            >
              <Card
                className={`relative bg-card/50 transition-all duration-500 h-full rounded-2xl overflow-hidden ${
                  plan.popular
                    ? "ring-1 ring-primary/50 shadow-[0_0_50px_-20px_hsl(var(--primary)/.2)]"
                    : "border-border/30 hover:border-primary/20"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 h-px bg-primary" />
                )}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary border-0 text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/.3)] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-1 pt-7">
                  <CardTitle className="text-sm font-bold">{plan.name}</CardTitle>
                  <div className="mt-3">
                    <span className="text-4xl font-extrabold tabular-nums tracking-tight">{plan.price}</span>
                    <span className="text-muted-foreground text-sm ml-1">/mo</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1">{plan.pages}</p>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-[12px]">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-foreground/75">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full transition-all duration-300 active:scale-[0.97] rounded-xl h-10 text-sm font-semibold ${
                      plan.popular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/.25)]"
                        : "bg-card border border-border/40 text-foreground hover:bg-accent hover:border-border/60"
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link to="/auth">
                      {plan.cta}
                      {plan.popular && <ArrowRight className="ml-1 h-3.5 w-3.5" />}
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
