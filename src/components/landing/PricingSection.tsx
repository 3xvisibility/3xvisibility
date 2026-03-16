import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Zap } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";

const plans = [
  { name: "Starter", price: "$29", pages: "100 pages/month", features: ["1 connected website", "5 templates", "CSV upload", "Email support"], cta: "Get Started", popular: false },
  { name: "Pro", price: "$79", pages: "2,000 pages/month", features: ["5 connected websites", "Unlimited templates", "CSV upload", "Priority support", "API access", "Campaign analytics"], cta: "Start Pro Trial", popular: true },
  { name: "Agency", price: "$199", pages: "10,000 pages/month", features: ["Unlimited websites", "Unlimited templates", "CSV upload", "Dedicated support", "API access", "White-label", "Team members"], cta: "Contact Sales", popular: false },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 md:py-24 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4 bg-primary/[0.06] rounded-full px-3.5 py-1">
            <Zap className="h-3 w-3" />
            Pricing
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1]">
            Simple,{" "}
            <span className="text-gradient-primary">transparent pricing</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base leading-relaxed">
            Start free and scale as you grow. No hidden fees.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto items-start">
          {plans.map((plan) => (
            <StaggerItem key={plan.name}>
              <Card
                className={`relative bg-background/60 backdrop-blur-sm transition-all duration-500 h-full rounded-2xl overflow-hidden ${
                  plan.popular
                    ? "ring-2 ring-primary/70 shadow-[0_0_60px_-20px_hsl(var(--primary)/.25)] md:scale-[1.03]"
                    : "border-border/40 hover:border-primary/20 hover:shadow-card-hover"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-primary" />
                )}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-primary border-0 text-primary-foreground shadow-lg shadow-primary/25 px-3 py-0.5 text-[11px] font-semibold">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-1 pt-7">
                  <CardTitle className="text-sm font-bold">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-extrabold tabular-nums tracking-tight">{plan.price}</span>
                    <span className="text-muted-foreground text-sm ml-1">/month</span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mt-1.5">{plan.pages}</p>
                </CardHeader>
                <CardContent className="pt-5">
                  <ul className="space-y-3 mb-7">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-[13px]">
                        <div className="h-4 w-4 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                          <Check className="h-2.5 w-2.5 text-success" />
                        </div>
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full transition-all duration-300 active:scale-[0.97] rounded-full h-10 text-sm font-semibold ${
                      plan.popular
                        ? "bg-primary/80 backdrop-blur-xl border border-primary/40 shadow-[0_4px_20px_hsl(var(--primary)/.3),inset_0_1px_0_rgba(255,255,255,.15)] hover:bg-primary/90 hover:shadow-[0_6px_28px_hsl(var(--primary)/.4)] text-primary-foreground"
                        : "bg-background/50 backdrop-blur-xl border-border/40 hover:bg-background/80 hover:border-border/60 shadow-[0_2px_8px_rgba(0,0,0,.04),inset_0_1px_0_rgba(255,255,255,.1)]"
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
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
