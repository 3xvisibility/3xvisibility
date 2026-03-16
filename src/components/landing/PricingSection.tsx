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
    <section id="pricing" className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-muted-foreground">
            Start free and scale as you grow. No hidden fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`shadow-surface hover:shadow-surface-hover transition-shadow duration-150 bg-background relative ${plan.popular ? "ring-2 ring-primary" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="pb-2 pt-6">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="mt-3">
                  <span className="text-3xl font-bold tabular-nums">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{plan.pages}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
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
