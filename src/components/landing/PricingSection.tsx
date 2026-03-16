import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";

const plans = [
  { name: "Starter", price: "$29", pages: "100 pages/month", features: ["1 connected website", "5 templates", "CSV upload", "Email support"], cta: "Get Started", popular: false },
  { name: "Pro", price: "$79", pages: "2,000 pages/month", features: ["5 connected websites", "Unlimited templates", "CSV upload", "Priority support", "API access", "Campaign analytics"], cta: "Start Pro Trial", popular: true },
  { name: "Agency", price: "$199", pages: "10,000 pages/month", features: ["Unlimited websites", "Unlimited templates", "CSV upload", "Dedicated support", "API access", "White-label", "Team members"], cta: "Contact Sales", popular: false },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">
            Pricing
          </span>
          <h2 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-tight">
            Simple,{" "}
            <span className="text-gradient-primary">transparent pricing</span>
          </h2>
          <p className="mt-5 text-muted-foreground text-base leading-relaxed">
            Start free and scale as you grow. No hidden fees.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto items-start">
          {plans.map((plan) => (
            <StaggerItem key={plan.name}>
              <Card
                className={`relative bg-background transition-all duration-300 h-full rounded-2xl ${
                  plan.popular
                    ? "ring-2 ring-primary/80 shadow-[0_0_60px_-20px_hsl(var(--primary)/.25)] scale-[1.03]"
                    : "border-border/40 hover:border-primary/20 hover:shadow-card-hover"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-primary border-0 text-primary-foreground shadow-lg shadow-primary/25 px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2 pt-8">
                  <CardTitle className="text-base font-semibold">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-[2.75rem] font-extrabold tabular-nums tracking-tight">{plan.price}</span>
                    <span className="text-muted-foreground text-sm ml-1">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">{plan.pages}</p>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-3 mb-8">
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
                    className={`w-full transition-all duration-200 active:scale-[0.97] rounded-xl h-11 ${
                      plan.popular
                        ? "bg-gradient-primary border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110"
                        : "hover:bg-accent/80"
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link to="/auth">
                      {plan.cta}
                      {plan.popular && <ArrowRight className="ml-1.5 h-4 w-4" />}
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
