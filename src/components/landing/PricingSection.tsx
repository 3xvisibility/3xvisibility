import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, ArrowRight, Zap, Sparkles, Crown, Layers, FileText, Globe, Store, Search, Link2, Code, Users, Headphones, Gift, ChevronDown, Info } from "lucide-react";
import { ScrollReveal, useRevealed } from "./ScrollReveal";
import { OpenAIMark, GeminiMark, ClaudeMark, PerplexityMark } from "@/components/billing/ModelBrandIcons";
import { Cpu } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { Loader2 } from "lucide-react";
import { startPlanCheckout } from "@/lib/checkout";
import type { PlanName } from "@/lib/plan-features";
import { useToast } from "@/hooks/use-toast";
import { BrandIconTooltip, BrandTooltipProvider } from "@/components/billing/BrandIconTooltip";
import { Tooltip, TooltipArrow, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const YEARLY_DISCOUNT = 2 / 12; // Save 2 months

function TableCell({ val }: { val: string | boolean | JSX.Element }) {
  if (typeof val === "boolean") {
    return val ? (
      <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-success/15">
        <Check className="h-4 w-4 text-success" strokeWidth={3} />
      </div>
    ) : (
      <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted">
        <X className="h-4 w-4 text-muted-foreground" strokeWidth={2.5} />
      </div>
    );
  }
  if (typeof val !== "string") return val;
  return <span className="text-sm font-semibold tabular-nums text-foreground">{val}</span>;
}

const SUPPORT_HINTS = {
  email: {
    title: "Email support",
    body: "Get setup help, troubleshooting, and how-to guidance by email within 1–2 business days.",
  },
  priority: {
    title: "Priority support",
    body: "Get faster responses within a few business hours, priority issue handling, and hands-on help with templates, keywords, and publishing.",
  },
  dedicated: {
    title: "Dedicated support",
    body: "Get a named success manager, same-day responses, migration and onboarding assistance, custom template help, and direct engineering escalation.",
  },
} as const;

function SupportHint({ label, level }: { label: string; level: keyof typeof SUPPORT_HINTS }) {
  const hint = SUPPORT_HINTS[level];
  return (
    <TooltipProvider delayDuration={100}>
      <span className="inline-flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`What is included with ${label} support?`}
              className="h-6 w-6 shrink-0 rounded-full border-primary/50 bg-primary/10 text-primary shadow-sm hover:border-primary hover:bg-primary/20 hover:text-primary"
              onClick={(event) => event.preventDefault()}
            >
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} className="max-w-[280px] px-3 py-2 text-left text-xs leading-relaxed">
            <p className="font-bold">{hint.title}</p>
            <p className="mt-1 text-popover-foreground/80">{hint.body}</p>
            <TooltipArrow />
          </TooltipContent>
        </Tooltip>
      </span>
    </TooltipProvider>
  );
}

const MARK_NAMES = new Map<React.ComponentType<{ className?: string }>, string>([
  [OpenAIMark, "ChatGPT (OpenAI)"],
  [GeminiMark, "Google Gemini"],
  [ClaudeMark, "Anthropic Claude"],
  [PerplexityMark, "Perplexity"],
]);

function ModelIcons({ marks }: { marks: React.ComponentType<{ className?: string }>[] }) {
  return (
    <BrandTooltipProvider>
      <ul className="flex list-none flex-wrap items-center justify-start gap-1.5 p-0">
        {marks.map((Mark, i) => (
          <li key={i}>
            <BrandIconTooltip
              label={MARK_NAMES.get(Mark) ?? "AI model"}
              title={MARK_NAMES.get(Mark) ?? "AI model"}
              className="h-9 w-9 bg-muted/60 hover:bg-primary/10 md:h-6 md:w-6"
            >
              <Mark className="h-4 w-4" aria-hidden="true" />
            </BrandIconTooltip>
          </li>
        ))}
      </ul>
    </BrandTooltipProvider>
  );
}



export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkoutPlan, setCheckoutPlan] = useState<PlanName | null>(null);
  const [creditQty, setCreditQty] = useState<Partial<Record<PlanName, number>>>({});
  const [openRow, setOpenRow] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridRevealed = useRevealed(gridRef, 700);


  const handleCheckout = async (plan: PlanName, quantity = 1) => {
    setCheckoutPlan(plan);
    try {
      const result = await startPlanCheckout(plan, quantity);
      if (result.status === "unauthenticated") {
        navigate(`/auth?plan=${plan}`);
        return;
      }
      if (result.status === "unsupported") {
        navigate("/billing");
        return;
      }
      window.location.href = result.url;
    } catch (err: any) {
      toast({
        title: t("pricing.checkoutFailed"),
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    } finally {
      setCheckoutPlan(null);
    }
  };


  const plans = [
    { key: "free" as PlanName, name: t("pricing.free"), monthlyPrice: 0, description: t("pricing.freeDesc"), popular: false, icon: <Layers className="h-5 w-5" />, cta: t("pricing.tryFree"), baseCredits: 10, creditSteps: [1], features: ["10 credits to try", "SEO score only (no auto-fix)", `10 ${t("pricing.aiGenerations")}`, `1 ${t("pricing.campaignsPerMonth")}`, `1 ${t("pricing.templates").toLowerCase()}`, `1 ${t("pricing.websites").toLowerCase()}`, `${t("pricing.wordpress")} ${t("pricing.only")}`, t("pricing.noCreditCard")] },
    { key: "starter" as PlanName, name: t("pricing.starter"), monthlyPrice: 19, description: t("pricing.starterDesc"), popular: false, icon: <Zap className="h-5 w-5" />, cta: t("pricing.getStarted"), baseCredits: 100, creditSteps: [1, 3, 5], features: [t("pricing.trialFeature"), "SEO + SEA scoring & auto-fix", `100 ${t("pricing.aiGenerations")}`, `10 ${t("pricing.campaignsPerMonth")}`, `10 ${t("pricing.templates").toLowerCase()}`, `2 ${t("pricing.websites").toLowerCase()}`, t("pricing.wordpress"), `${t("pricing.email")} ${t("pricing.support").toLowerCase()}`] },
    { key: "pro" as PlanName, name: t("pricing.pro"), monthlyPrice: 59, description: t("pricing.proDesc"), popular: true, icon: <Sparkles className="h-5 w-5" />, cta: t("pricing.startProTrial"), baseCredits: 300, creditSteps: [1, 2, 3], features: [t("pricing.trialFeature"), "SEO + SEA + GEO auto-fix (80+ guaranteed)", `1,000 ${t("pricing.aiGenerations")}`, `${t("pricing.unlimited")} ${t("pricing.campaignsPerMonth")}`, `${t("pricing.unlimited")} ${t("pricing.templates").toLowerCase()}`, `10 ${t("pricing.websites").toLowerCase()}`, t("pricing.wordpress") + ", " + t("pricing.shopify") + " & PrestaShop", t("pricing.googleIndexing"), t("pricing.internalLinks"), t("pricing.apiAccess"), `${t("pricing.priority")} ${t("pricing.support").toLowerCase()}`] },
    { key: "agency" as PlanName, name: t("pricing.agency"), monthlyPrice: 149, description: t("pricing.agencyDesc"), popular: false, icon: <Crown className="h-5 w-5" />, cta: t("pricing.contactSales"), baseCredits: 500, creditSteps: [1, 2], features: [t("pricing.trialFeature"), "Bulk SEO + SEA + GEO optimization", `5,000 ${t("pricing.aiGenerations")}`, `${t("pricing.unlimited")} ${t("pricing.campaignsPerMonth")}`, `${t("pricing.unlimited")} ${t("pricing.templates").toLowerCase()}`, `${t("pricing.unlimited")} ${t("pricing.websites").toLowerCase()}`, t("pricing.wordpress") + ", " + t("pricing.shopify") + " & PrestaShop", t("pricing.googleIndexing"), t("pricing.internalLinks"), t("pricing.apiAccess"), t("pricing.teamCollaboration"), `${t("pricing.dedicated")} ${t("pricing.support").toLowerCase()}`] },
  ];

  const comparisonFeatures = [
    {
      label: "Available models",
      icon: <Cpu className="h-4 w-4 text-primary" />,
      free: <ModelIcons marks={[GeminiMark]} />,
      starter: <ModelIcons marks={[GeminiMark, OpenAIMark]} />,
      pro: <ModelIcons marks={[GeminiMark, OpenAIMark, ClaudeMark, PerplexityMark]} />,
      agency: <ModelIcons marks={[GeminiMark, OpenAIMark, ClaudeMark, PerplexityMark]} />,
    },
    { label: "Credits / month", icon: <Layers className="h-4 w-4 text-primary" />, free: "10", starter: "100 – 500", pro: "300 – 900", agency: "500 – 1,000" },
    { label: t("pricing.aiGenerations"), icon: <Sparkles className="h-4 w-4 text-primary" />, free: "10", starter: "100", pro: "1,000", agency: "5,000" },
    { label: t("pricing.campaigns"), icon: <Zap className="h-4 w-4 text-primary" />, free: "1", starter: "10", pro: t("pricing.unlimited"), agency: t("pricing.unlimited") },
    { label: t("pricing.templates"), icon: <FileText className="h-4 w-4 text-primary" />, free: "1", starter: "10", pro: t("pricing.unlimited"), agency: t("pricing.unlimited") },
    { label: t("pricing.websites"), icon: <Globe className="h-4 w-4 text-primary" />, free: "1", starter: "2", pro: "10", agency: t("pricing.unlimited") },
    { label: t("pricing.wordpress"), icon: <Globe className="h-4 w-4 text-primary" />, free: true, starter: true, pro: true, agency: true },
    { label: t("pricing.shopify"), icon: <Store className="h-4 w-4 text-primary" />, free: false, starter: false, pro: true, agency: true },
    { label: t("pricing.googleIndexing"), icon: <Search className="h-4 w-4 text-primary" />, free: false, starter: false, pro: true, agency: true },
    { label: t("pricing.internalLinks"), icon: <Link2 className="h-4 w-4 text-primary" />, free: false, starter: false, pro: true, agency: true },
    { label: t("pricing.apiAccess"), icon: <Code className="h-4 w-4 text-primary" />, free: false, starter: false, pro: true, agency: true },
    { label: t("pricing.teamCollaboration"), icon: <Users className="h-4 w-4 text-primary" />, free: false, starter: false, pro: false, agency: true },
    {
      label: t("pricing.support"),
      icon: <Headphones className="h-4 w-4 text-primary" />,
      free: "—",
      starter: <SupportHint label={t("pricing.email")} level="email" />,
      pro: <SupportHint label={t("pricing.priority")} level="priority" />,
      agency: <SupportHint label={t("pricing.dedicated")} level="dedicated" />,
    },
  ];



  return (
    <section id="pricing" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_50%_20%,hsl(96,67%,48%,0.06),transparent)] pointer-events-none" />
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-10">
          <span className="section-badge mb-6">{t("pricing.badge")}</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">{t("pricing.title")}</h2>
          <p className="mt-3 text-sm text-[hsl(220,12%,42%)] max-w-md mx-auto">{t("pricing.description")}</p>
        </ScrollReveal>

        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative h-7 w-[52px] rounded-full transition-colors duration-300 ${isYearly ? "bg-primary" : "bg-[hsl(250,30%,92%)]"}`}
            aria-label={t("pricing.yearly")}
          >
            <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${isYearly ? "translate-x-[26px]" : "translate-x-0.5"}`} />
          </button>
          <span className="text-sm font-medium text-foreground">
            {isYearly ? `${t("pricing.billed")} ${t("pricing.yearly").toLowerCase()}` : `${t("pricing.billed")} ${t("pricing.monthly").toLowerCase()}`}
          </span>
          {isYearly && (
            <Badge className="rounded-full bg-primary/10 text-[hsl(96,67%,35%)] border border-[hsl(96,67%,48%,0.25)] text-xs font-medium px-3 py-1">
              {t("pricing.save")}
            </Badge>
          )}
        </div>


        <motion.div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 max-w-6xl mx-auto items-stretch rounded-2xl border border-[hsl(96,67%,48%,0.12)] overflow-hidden bg-[hsl(250,30%,98%)]" initial="hidden" animate={gridRevealed ? "visible" : "hidden"} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          {plans.map((plan) => {
            const qty = creditQty[plan.key] ?? 1;
            const price = Math.round(plan.monthlyPrice * qty * (isYearly ? 1 - YEARLY_DISCOUNT : 1));
            return (
              <motion.div key={plan.name} className="h-full" variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}>
                <div className={`group relative h-full flex flex-col p-6 border-r border-[hsl(96,67%,48%,0.1)] last:border-r-0 transition-all duration-300 ${plan.popular ? "bg-[hsl(250,30%,97%)] hover:bg-[hsl(250,30%,96%)]" : "bg-transparent hover:bg-[hsl(250,30%,96%)]"} hover:shadow-[inset_0_0_0_1px_hsl(96,67%,48%,0.25)]`}>
                  {plan.popular && <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary" />}

                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
                    {plan.popular && <Badge className="bg-primary/15 text-[hsl(96,67%,35%)] border border-[hsl(96,67%,48%,0.3)] text-[10px] font-bold uppercase tracking-wider">{t("pricing.mostPopular")}</Badge>}
                  </div>
                  <p className="text-sm text-[hsl(220,12%,38%)] mt-1">{plan.description}</p>

                  <Separator className="my-5 bg-[hsl(96,67%,48%,0.1)]" />

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tabular-nums tracking-tight">€{price}</span>
                    {plan.monthlyPrice > 0 && <span className="text-sm text-[hsl(220,12%,38%)]">{isYearly ? t("pricing.yearly").toLowerCase() : "per month"}</span>}
                  </div>

                  <div className="mt-3">
                    {plan.creditSteps.length > 1 ? (
                      <Select value={String(qty)} onValueChange={(v) => setCreditQty((s) => ({ ...s, [plan.key]: Number(v) }))}>
                        <SelectTrigger className="h-10 rounded-lg bg-transparent border-[hsl(96,67%,48%,0.18)] text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {plan.creditSteps.map((step) => (
                            <SelectItem key={step} value={String(step)}>
                              {(plan.baseCredits * step).toLocaleString()} credits / month
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="h-10 flex items-center rounded-lg border border-[hsl(96,67%,48%,0.14)] px-3 text-sm text-[hsl(220,12%,50%)]">
                        {plan.baseCredits.toLocaleString()} credits to try
                      </div>
                    )}
                  </div>

                  {plan.monthlyPrice > 0 && (
                    <p className="text-[11px] text-[hsl(96,67%,35%)] mt-2 inline-flex items-center gap-1.5">
                      <Gift className="h-3 w-3" />{t("pricing.trialNote")}
                    </p>
                  )}

                  <Separator className="my-5 bg-[hsl(96,67%,48%,0.1)]" />

                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px]">
                        <Check className="h-3.5 w-3.5 mt-0.5 text-[hsl(220,12%,32%)] shrink-0" />
                        <span className="text-[hsl(220,12%,52%)]">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-6">
                    {plan.monthlyPrice === 0 ? (
                      <Button className="w-full rounded-lg h-11 text-sm font-semibold bg-[hsl(250,30%,95%)] border border-[hsl(96,67%,48%,0.15)] text-foreground hover:bg-[hsl(96,67%,48%,0.1)]" asChild>
                        <Link to="/auth">{plan.cta}</Link>
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleCheckout(plan.key, qty)}
                        disabled={checkoutPlan !== null}
                        className={`w-full rounded-lg h-11 text-sm font-semibold ${plan.popular ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-[hsl(250,30%,95%)] border border-[hsl(96,67%,48%,0.15)] text-foreground hover:bg-[hsl(96,67%,48%,0.1)]"}`}
                      >
                        {checkoutPlan === plan.key ? (
                          <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t("pricing.startingTrial")}</>
                        ) : (
                          <>{t("pricing.startTrialCta")}</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>


        <ScrollReveal className="mt-24 max-w-6xl mx-auto">
          <div className="mb-10 text-center">
            <span className="section-badge mb-5">{t("pricing.feature")}</span>
            <h3 className="text-3xl font-extrabold text-foreground md:text-5xl">{t("pricing.comparePlans")}</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">{t("pricing.compareDesc")}</p>
          </div>

          {/* Mobile: tap-to-expand feature list */}
          <div className="md:hidden overflow-hidden rounded-2xl border border-border bg-card">
            <ul className="divide-y divide-border/60">
              {comparisonFeatures.map((row) => {
                const isOpen = openRow === row.label;
                const panelId = `pricing-row-${row.label.replace(/\W+/g, "-").toLowerCase()}`;
                return (
                  <li key={row.label}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenRow(isOpen ? null : row.label)}
                      className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none active:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">{row.icon}</span>
                        <span className="text-sm font-medium text-foreground">{row.label}</span>
                      </span>
                      <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <dl id={panelId} className="space-y-3 bg-muted/30 px-4 pb-4 pt-1">
                        {plans.map((plan) => (
                          <div
                            key={plan.key}
                            className={
                              typeof row[plan.key] === "object"
                                ? "space-y-1.5"
                                : "flex items-center justify-between gap-4"
                            }
                          >
                            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{plan.name}</dt>
                            <dd className={typeof row[plan.key] === "object" ? "" : "text-right"}>
                              <TableCell val={row[plan.key]} />
                            </dd>
                          </div>
                        ))}
                      </dl>

                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="hidden md:block overflow-hidden rounded-2xl border border-border bg-card shadow-surface">
            <div className="overflow-x-auto" role="region" aria-label={t("pricing.comparePlans")} tabIndex={0}>
              <table className="w-full min-w-[940px] border-separate border-spacing-0 text-sm">

                <caption className="sr-only">{t("pricing.compareDesc")}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-[260px] border-b border-border bg-muted/50 px-6 py-6 text-left align-bottom">
                      <span className="text-base font-bold text-foreground">{t("pricing.feature")}</span>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">Everything included, side by side</span>
                    </th>
                    {plans.map((plan) => {
                      const price = isYearly ? Math.round(plan.monthlyPrice * (1 - YEARLY_DISCOUNT)) : plan.monthlyPrice;
                      return (
                        <th
                          key={plan.key}
                          scope="col"
                          className={`relative min-w-[170px] border-b border-border px-5 py-6 text-left align-top ${plan.popular ? "bg-primary/10" : "bg-muted/50"}`}
                        >
                          {plan.popular && <span className="absolute inset-x-0 top-0 h-1 bg-primary" />}
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${plan.popular ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>
                              {plan.icon}
                            </span>
                            <span className="font-bold text-foreground">{plan.name}</span>
                          </div>
                          <div className="mt-4 flex items-end gap-1">
                            <span className="text-2xl font-extrabold tabular-nums text-foreground">€{price}</span>
                            <span className="pb-0.5 text-xs font-normal text-muted-foreground">{t("pricing.mo")}</span>
                          </div>
                          <Button
                            size="sm"
                            variant={plan.popular ? "default" : "outline"}
                            className="mt-4 h-9 w-full rounded-lg"
                            onClick={() => plan.monthlyPrice === 0 ? navigate("/auth") : handleCheckout(plan.key, creditQty[plan.key] ?? 1)}
                            disabled={checkoutPlan !== null}
                          >
                            {checkoutPlan === plan.key ? <Loader2 className="h-4 w-4 animate-spin" /> : plan.cta}
                          </Button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, index) => (
                    <tr key={row.label} className="group">
                      <th
                        scope="row"
                        className={`border-b border-border/60 px-6 py-4 text-left font-medium text-foreground transition-colors group-hover:bg-primary/5 ${index % 2 ? "bg-muted/25" : "bg-card"}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">{row.icon}</span>
                          {row.label}
                        </div>
                      </th>
                      {(["free", "starter", "pro", "agency"] as const).map((planKey) => (
                        <td
                          key={planKey}
                          className={`border-b border-border/60 px-5 py-4 text-left transition-colors group-hover:bg-primary/5 ${index % 2 ? "bg-muted/25" : "bg-card"} ${planKey === "pro" ? "border-x border-x-primary/10 bg-primary/5" : ""}`}
                        >
                          <TableCell val={row[planKey]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border bg-muted/30 px-6 py-4">
              <p className="text-xs text-muted-foreground">Scroll horizontally on smaller screens to compare every plan.</p>
              <Button variant="ghost" size="sm" asChild className="shrink-0 text-primary">
                <Link to="/auth">{t("pricing.getStarted")} <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </ScrollReveal>

      </div>

    </section>
  );
}
