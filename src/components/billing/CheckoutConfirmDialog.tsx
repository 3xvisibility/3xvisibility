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
import { useLanguage } from "@/i18n/LanguageContext";

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
  const { t } = useLanguage();
  const fmtLimit = (v: number) =>
    v === -1 ? t("billing.checkoutUnlimited") : v.toLocaleString();
  const from = PLAN_FEATURES[currentPlan];
  const to = PLAN_FEATURES[targetPlan];

  const rows: { label: string; from: number; to: number }[] = [
    { label: t("billing.featurePagesMonth"), from: from.pagesLimit, to: to.pagesLimit },
    { label: t("billing.featureAiCreditsMonth"), from: from.aiLimit, to: to.aiLimit },
    { label: t("billing.featureWebsites"), from: from.websites, to: to.websites },
    { label: t("billing.featureTemplates"), from: from.templates, to: to.templates },
    { label: t("billing.featureCampaigns"), from: from.campaigns, to: to.campaigns },
  ];

  const billedText = isYearly
    ? t("billing.checkoutBilledYearly", {
        total: (monthlyPrice * 12).toLocaleString(),
        monthly: monthlyPrice,
      })
    : t("billing.checkoutBilledMonthly", { monthly: monthlyPrice });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {t("billing.checkoutConfirmTitle", { plan: to.label })}
            {trialEligible && (
              <Badge variant="secondary" className="gap-1">
                <Gift className="h-3 w-3" /> {t("billing.checkoutTrialBadge")}
              </Badge>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("billing.checkoutReview")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">{t("billing.checkoutPrice")}</span>
              <span className="text-sm font-semibold">{billedText}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden">
            <div className="grid grid-cols-3 gap-2 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
              <span>{t("billing.checkoutLimit")}</span>
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
                <span>{t("billing.checkoutTrialNote")}</span>
              </li>
            )}
            <li className="flex gap-2">
              <CalendarClock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{t(isYearly ? "billing.checkoutRenewsYearly" : "billing.checkoutRenewsMonthly")}</span>
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{t("billing.checkoutStripeNote")}</span>
            </li>
          </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t("common.cancel")}</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t(trialEligible ? "billing.checkoutStartTrial" : "billing.checkoutContinue")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
