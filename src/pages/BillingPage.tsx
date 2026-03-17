import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles, ArrowRight } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { PLAN_FEATURES, type PlanName } from "@/lib/plan-features";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

const plans: { name: PlanName; price: string; period: string }[] = [
  { name: "starter", price: "$29", period: "/month" },
  { name: "pro", price: "$79", period: "/month" },
  { name: "agency", price: "$199", period: "/month" },
];

const featureRows: { label: string; key: string }[] = [
  { label: "Pages / month", key: "pagesLimit" },
  { label: "AI generations / month", key: "aiLimit" },
  { label: "Templates", key: "templates" },
  { label: "Websites", key: "websites" },
  { label: "WordPress", key: "wordpress" },
  { label: "Shopify", key: "shopify" },
  { label: "PrestaShop", key: "prestashop" },
  { label: "WooCommerce", key: "woocommerce" },
  { label: "Social Sharing", key: "socialShare" },
  { label: "AI Store Generator", key: "storeGenerator" },
  { label: "Google Indexing", key: "indexing" },
  { label: "Website Discovery", key: "discovery" },
  { label: "Internal Links", key: "internalLinks" },
  { label: "API Access", key: "apiAccess" },
  { label: "Team Collaboration", key: "teamCollaboration" },
];

function formatValue(val: number | boolean): React.ReactNode {
  if (typeof val === "boolean") {
    return val ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-muted-foreground/40" />;
  }
  return val === -1 ? "Unlimited" : val.toLocaleString();
}

export default function BillingPage() {
  const { plan: currentPlan, pagesUsed, pagesLimit, aiUsed, aiLimit } = useSubscription();
  const pagesPercent = pagesLimit > 0 ? Math.round((pagesUsed / pagesLimit) * 100) : 0;
  const aiPercent = aiLimit > 0 ? Math.round((aiUsed / aiLimit) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display">Billing</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription and usage.</p>
      </div>

      {/* Current usage */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-surface">
          <CardContent className="p-5 space-y-2">
            <p className="text-sm text-muted-foreground">Current Plan</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold capitalize">{PLAN_FEATURES[currentPlan]?.label || "Free"}</span>
              <Badge variant="outline" className="text-primary border-primary/30">Active</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-surface">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page Generations</p>
              <span className="text-xs tabular-nums text-muted-foreground">{pagesUsed} / {pagesLimit}</span>
            </div>
            <Progress value={pagesPercent} className="h-2" />
            <p className={`text-xs ${pagesPercent >= 90 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {pagesLimit - pagesUsed} remaining this month
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-surface">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">AI Generations</p>
              <span className="text-xs tabular-nums text-muted-foreground">{aiUsed} / {aiLimit}</span>
            </div>
            <Progress value={aiPercent} className="h-2" />
            <p className={`text-xs ${aiPercent >= 90 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {aiLimit - aiUsed} remaining this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const features = PLAN_FEATURES[p.name];
          const isCurrent = p.name === currentPlan;
          return (
            <Card
              key={p.name}
              className={`shadow-surface hover:shadow-surface-hover transition-shadow duration-150 ${isCurrent ? "ring-2 ring-primary" : ""}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{features.label}</CardTitle>
                  {isCurrent && <Badge className="bg-primary/10 text-primary">Current</Badge>}
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold tabular-nums">{p.price}</span>
                  <span className="text-muted-foreground">{p.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{features.pagesLimit.toLocaleString()} pages/month</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2">
                  {[
                    `${features.aiLimit.toLocaleString()} AI generations`,
                    `${features.templates === -1 ? "Unlimited" : features.templates} templates`,
                    `${features.websites === -1 ? "Unlimited" : features.websites} website${features.websites !== 1 ? "s" : ""}`,
                    ...(features.shopify ? ["All CMS integrations"] : features.wordpress ? ["WordPress integration"] : []),
                    ...(features.storeGenerator ? ["AI Store Generator"] : []),
                    ...(features.indexing ? ["Google Indexing"] : []),
                    ...(features.apiAccess ? ["API Access"] : []),
                    ...(features.teamCollaboration ? ["Team Collaboration"] : []),
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent}
                >
                  {isCurrent ? "Current Plan" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      {/* Feature comparison table */}
      <Card className="shadow-surface overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Feature Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Feature</th>
                  {plans.map((p) => (
                    <th key={p.name} className={`text-center py-3 px-4 font-medium ${p.name === currentPlan ? "text-primary" : "text-muted-foreground"}`}>
                      {PLAN_FEATURES[p.name].label}
                      {p.name === currentPlan && <span className="block text-[10px] text-primary">Current</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureRows.map((row, i) => (
                  <tr key={row.key} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                    <td className="py-3 px-4 text-foreground">{row.label}</td>
                    {plans.map((p) => {
                      const val = (PLAN_FEATURES[p.name] as any)[row.key];
                      return (
                        <td key={p.name} className="py-3 px-4 text-center">
                          <span className="inline-flex justify-center">{formatValue(val)}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
