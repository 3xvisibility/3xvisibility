import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    pages: "100 pages/month",
    features: ["1 website", "5 templates", "CSV upload", "Email support"],
    current: false,
  },
  {
    name: "Pro",
    price: "$79",
    period: "/month",
    pages: "2,000 pages/month",
    features: ["5 websites", "Unlimited templates", "CSV upload", "Priority support", "API access"],
    current: true,
  },
  {
    name: "Agency",
    price: "$199",
    period: "/month",
    pages: "10,000 pages/month",
    features: ["Unlimited websites", "Unlimited templates", "CSV upload", "Dedicated support", "API access", "White-label"],
    current: false,
  },
];

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display">Billing</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription and usage.</p>
      </div>

      <Card className="shadow-surface">
        <CardContent className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="text-lg font-semibold mt-1">Pro Plan</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Usage This Month</p>
              <p className="text-lg font-semibold mt-1 tabular-nums">42 / 2,000 pages</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Billing Date</p>
              <p className="text-lg font-semibold mt-1 tabular-nums">April 1, 2026</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`shadow-surface hover:shadow-surface-hover transition-shadow duration-150 ${plan.current ? "ring-2 ring-primary" : ""}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                {plan.current && <Badge className="bg-primary/10 text-primary">Current</Badge>}
              </div>
              <div className="mt-2">
                <span className="text-3xl font-bold tabular-nums">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{plan.pages}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
                variant={plan.current ? "outline" : "default"}
                disabled={plan.current}
              >
                {plan.current ? "Current Plan" : "Upgrade"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
