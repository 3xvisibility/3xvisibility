import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$29",
    pages: "100 pages/month",
    features: ["1 connected website", "5 templates", "CSV upload", "Email support"],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$79",
    pages: "2,000 pages/month",
    features: ["5 connected websites", "Unlimited templates", "CSV upload", "Priority support", "API access", "Campaign analytics"],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Agency",
    price: "$199",
    pages: "10,000 pages/month",
    features: ["Unlimited websites", "Unlimited templates", "CSV upload", "Dedicated support", "API access", "White-label", "Team members"],
    cta: "Contact Sales",
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-3">Pricing</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Simple,{" "}
            <span className="text-gradient-primary">transparent pricing</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base">
            Start free and scale as you grow. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative bg-background hover:shadow-card-hover transition-all duration-300 ${
                plan.popular
                  ? "ring-2 ring-primary shadow-glow scale-[1.02]"
                  : "border-border/50 hover:border-primary/20"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-primary border-0 text-primary-foreground shadow-lg shadow-primary/25">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="pb-2 pt-7">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="mt-3">
                  <span className="text-4xl font-extrabold tabular-nums">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{plan.pages}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <div className="h-5 w-5 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-success" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full transition-all duration-200 active:scale-[0.97] ${
                    plan.popular
                      ? "bg-gradient-primary border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110"
                      : ""
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link to="/auth">{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
