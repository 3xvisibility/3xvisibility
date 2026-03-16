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
    <section id="pricing" className="py-28 md:py-36 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-[300px] h-[300px] rounded-full bg-[hsl(var(--primary-glow)/.03)] blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-5 bg-primary/[0.06] rounded-full px-4 py-1.5">
            <Zap className="h-3 w-3" />
            Pricing
          </span>
          <h2 className="text-3xl md:text-[2.75rem] lg:text-5xl font-extrabold tracking-tight leading-[1.1]">
            Simple,{" "}
            <span className="text-gradient-primary">transparent pricing</span>
          </h2>
          <p className="mt-6 text-muted-foreground text-lg leading-relaxed">
            Start free and scale as you grow. No hidden fees.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {plans.map((plan) => (
            <StaggerItem key={plan.name}>
              <Card
                className={`relative bg-background transition-all duration-500 h-full rounded-2xl overflow-hidden ${
                  plan.popular
                    ? "ring-2 ring-primary/80 shadow-[0_0_80px_-20px_hsl(var(--primary)/.3)] md:scale-105"
                    : "border-border/40 hover:border-primary/20 hover:shadow-card-hover"
                }`}
              >
                {/* Top gradient bar for popular */}
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary" />
                )}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-primary border-0 text-primary-foreground shadow-lg shadow-primary/25 px-4 py-1 font-semibold">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2 pt-9">
                  <CardTitle className="text-base font-bold">{plan.name}</CardTitle>
                  <div className="mt-5">
                    <span className="text-5xl font-extrabold tabular-nums tracking-tight">{plan.price}</span>
                    <span className="text-muted-foreground text-sm ml-1.5">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.pages}</p>
                </CardHeader>
                <CardContent className="pt-6">
                  <ul className="space-y-3.5 mb-9">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm">
                        <div className="h-5 w-5 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-success" />
                        </div>
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full transition-all duration-300 active:scale-[0.97] rounded-xl h-12 font-semibold ${
                      plan.popular
                        ? "bg-gradient-primary border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110"
                        : "hover:bg-accent/80"
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link to="/auth">
                      {plan.cta}
                      {plan.popular && <ArrowRight className="ml-2 h-4 w-4" />}
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
