import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, CalendarClock, Gift, Loader2, ShieldCheck } from "lucide-react";
import { PLAN_FEATURES, type PlanName } from "@/lib/plan-features";

function fmtLimit(v: number) {
  return v === -1 ? "Unlimited" : v.toLocaleString();
}

interface CheckoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: PlanName;
  targetPlan: PlanName;
  /** Displayed price per month for the selected billing cycle. */
  monthlyPrice: number;
  isYearly: boolean;
  /** Whether the 30-day first-subscription trial may apply. */
  trialEligible: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

export function CheckoutConfirmDialog({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  monthlyPrice,
  isYearly,
  trialEligible,
  loading,
  onConfirm,
}: CheckoutConfirmDialogProps) {
  const from = PLAN_FEATURES[currentPlan];
  const to = PLAN_FEATURES[targetPlan];

  const rows: { label: string; from: number; to: number }[] = [
    { label: "Pages / month", from: from.pagesLimit, to: to.pagesLimit },
    { label: "AI credits / month", from: from.aiLimit, to: to.aiLimit },
    { label: "Websites", from: from.websites, to: to.websites },
    { label: "Templates", from: from.templates, to: to.templates },
    { label: "Campaigns", from: from.campaigns, to: to.campaigns },
  ];

  const billedText = isYearly
    ? `€${(monthlyPrice * 12).toLocaleString()} billed yearly (€${monthlyPrice}/mo)`
    : `€${monthlyPrice}/month billed monthly`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            Confirm {to.label} plan
            {trialEligible && (
              <Badge variant="secondary" className="gap-1">
                <Gift className="h-3 w-3" /> 30-day trial
              </Badge>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Review what you get and how billing works before continuing to secure checkout.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Price</span>
              <span className="text-sm font-semibold">{billedText}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden">
            <div className="grid grid-cols-3 gap-2 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
              <span>Limit</span>
              <span className="text-center">{from.label}</span>
              <span className="text-center">{to.label}</span>
            </div>
            {rows.map((r) => (
              <div key={r.label} className="grid grid-cols-3 gap-2 px-4 py-2 text-sm border-t border-border/50 items-center">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="text-center tabular-nums text-muted-foreground">{fmtLimit(r.from)}</span>
                <span className="text-center tabular-nums font-semibold flex items-center justify-center gap-1">
                  <ArrowRight className="h-3 w-3 text-primary" />
                  {fmtLimit(r.to)}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          <ul className="space-y-2 text-sm text-muted-foreground">
            {trialEligible && (
              <li className="flex gap-2">
                <Gift className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>
                  Your first subscription includes a <strong className="text-foreground">30-day free trial</strong>. You
                  are not charged until the trial ends.
                </span>
              </li>
            )}
            <li className="flex gap-2">
              <CalendarClock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                Renews automatically {isYearly ? "every year" : "every month"}. Cancel anytime from the customer
                portal — you keep access until the end of the paid period.
              </span>
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Payment is handled securely by Stripe in a new tab. Downgrades apply limits immediately.</span>
            </li>
          </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {trialEligible ? "Start free trial" : "Continue to checkout"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
