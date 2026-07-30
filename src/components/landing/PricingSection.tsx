import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, ArrowRight, Zap, Sparkles, Crown, Layers, FileText, Globe, Store, Search, Link2, Code, Users, Headphones, Gift } from "lucide-react";
import { ScrollReveal, useRevealed } from "./ScrollReveal";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { Loader2 } from "lucide-react";
import { startPlanCheckout } from "@/lib/checkout";
import type { PlanName } from "@/lib/plan-features";
import { useToast } from "@/hooks/use-toast";

const YEARLY_DISCOUNT = 2 / 12; // Save 2 months

function TableCell({ val }: { val: string | boolean }) {
  if (typeof val === "boolean") {
    return val ? (
      <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(142,76%,36%,0.1)]">
        <Check className="h-3.5 w-3.5 text-[hsl(142,76%,50%)]" />
      </div>
    ) : (
      <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(220,30%,12%)]">
        <X className="h-3.5 w-3.5 text-[hsl(220,10%,52%)]" />
      </div>
    );
  }
  return <span className="font-semibold tabular-nums">{val}</span>;
}

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkoutPlan, setCheckoutPlan] = useState<PlanName | null>(null);
  const [creditQty, setCreditQty] = useState<Partial<Record<PlanName, number>>>({});
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
    { key: "free" as PlanName, name: t("pricing.free"), monthlyPrice: 0, description: t("pricing.freeDesc"), popular: false, icon: <Layers className="h-5 w-5" />, cta: t("pricing.tryFree"), baseCredits: 500, creditSteps: [1], features: ["500 credits to try", "SEO score only (no auto-fix)", `10 ${t("pricing.aiGenerations")}`, `1 ${t("pricing.campaignsPerMonth")}`, `1 ${t("pricing.templates").toLowerCase()}`, `1 ${t("pricing.websites").toLowerCase()}`, `${t("pricing.wordpress")} ${t("pricing.only")}`, t("pricing.noCreditCard")] },
    { key: "starter" as PlanName, name: t("pricing.starter"), monthlyPrice: 19, description: t("pricing.starterDesc"), popular: false, icon: <Zap className="h-5 w-5" />, cta: t("pricing.getStarted"), baseCredits: 5000, creditSteps: [1, 2, 4], features: [t("pricing.trialFeature"), "SEO + SEA scoring & auto-fix", `100 ${t("pricing.aiGenerations")}`, `10 ${t("pricing.campaignsPerMonth")}`, `10 ${t("pricing.templates").toLowerCase()}`, `2 ${t("pricing.websites").toLowerCase()}`, t("pricing.wordpress"), `${t("pricing.email")} ${t("pricing.support").toLowerCase()}`] },
    { key: "pro" as PlanName, name: t("pricing.pro"), monthlyPrice: 59, description: t("pricing.proDesc"), popular: true, icon: <Sparkles className="h-5 w-5" />, cta: t("pricing.startProTrial"), baseCredits: 30000, creditSteps: [1, 2, 4], features: [t("pricing.trialFeature"), "SEO + SEA + GEO auto-fix (80+ guaranteed)", `1,000 ${t("pricing.aiGenerations")}`, `${t("pricing.unlimited")} ${t("pricing.campaignsPerMonth")}`, `${t("pricing.unlimited")} ${t("pricing.templates").toLowerCase()}`, `10 ${t("pricing.websites").toLowerCase()}`, t("pricing.wordpress") + ", " + t("pricing.shopify") + " & PrestaShop", t("pricing.googleIndexing"), t("pricing.internalLinks"), t("pricing.apiAccess"), `${t("pricing.priority")} ${t("pricing.support").toLowerCase()}`] },
    { key: "agency" as PlanName, name: t("pricing.agency"), monthlyPrice: 149, description: t("pricing.agencyDesc"), popular: false, icon: <Crown className="h-5 w-5" />, cta: t("pricing.contactSales"), baseCredits: 100000, creditSteps: [1, 2, 5], features: [t("pricing.trialFeature"), "Bulk SEO + SEA + GEO optimization", `5,000 ${t("pricing.aiGenerations")}`, `${t("pricing.unlimited")} ${t("pricing.campaignsPerMonth")}`, `${t("pricing.unlimited")} ${t("pricing.templates").toLowerCase()}`, `${t("pricing.unlimited")} ${t("pricing.websites").toLowerCase()}`, t("pricing.wordpress") + ", " + t("pricing.shopify") + " & PrestaShop", t("pricing.googleIndexing"), t("pricing.internalLinks"), t("pricing.apiAccess"), t("pricing.teamCollaboration"), `${t("pricing.dedicated")} ${t("pricing.support").toLowerCase()}`] },
  ];

  const comparisonFeatures = [
    { label: "Credits / month", icon: <Layers className="h-4 w-4 text-[hsl(96,80%,52%)]" />, free: "500", starter: "5,000", pro: "30,000", agency: "100,000" },
    { label: t("pricing.aiGenerations"), icon: <Sparkles className="h-4 w-4 text-[hsl(96,80%,52%)]" />, free: "10", starter: "100", pro: "1,000", agency: "5,000" },
    { label: t("pricing.campaigns"), icon: <Zap className="h-4 w-4 text-[hsl(96,80%,52%)]" />, free: "1", starter: "10", pro: t("pricing.unlimited"), agency: t("pricing.unlimited") },
    { label: t("pricing.templates"), icon: <FileText className="h-4 w-4 text-[hsl(96,80%,52%)]" />, free: "1", starter: "10", pro: t("pricing.unlimited"), agency: t("pricing.unlimited") },
    { label: t("pricing.websites"), icon: <Globe className="h-4 w-4 text-[hsl(96,80%,52%)]" />, free: "1", starter: "2", pro: "10", agency: t("pricing.unlimited") },
    { label: t("pricing.wordpress"), icon: <Globe className="h-4 w-4 text-[hsl(96,80%,52%)]" />, free: true, starter: true, pro: true, agency: true },
    { label: t("pricing.shopify"), icon: <Store className="h-4 w-4 text-[hsl(96,80%,52%)]" />, free: false, starter: false, pro: true, agency: true },
    { label: t("pricing.googleIndexing"), icon: <Search className="h-4 w-4 text-[hsl(96,80%,52%)]" />, free: false, starter: false, pro: true, agency: true },
    { label: t("pricing.internalLinks"), icon: <Link2 className="h-4 w-4 text-[hsl(96,80%,52%)]" />, free: false, starter: false, pro: true, agency: true },
    { label: t("pricing.apiAccess"), icon: <Code className="h-4 w-4 text-[hsl(96,80%,52%)]" />, free: false, starter: false, pro: true, agency: true },
    { label: t("pricing.teamCollaboration"), icon: <Users className="h-4 w-4 text-[hsl(96,80%,52%)]" />, free: false, starter: false, pro: false, agency: true },
    { label: t("pricing.support"), icon: <Headphones className="h-4 w-4 text-[hsl(96,80%,52%)]" />, free: "—", starter: t("pricing.email"), pro: t("pricing.priority"), agency: t("pricing.dedicated") },
  ];

  const trialFaqs = [1, 2, 3, 4, 5].map((n) => ({ q: t(`pricing.trialFaq.q${n}`), a: t(`pricing.trialFaq.a${n}`) }));


  return (
    <section id="pricing" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_50%_20%,hsl(96,90%,45%,0.06),transparent)] pointer-events-none" />
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-10">
          <span className="section-badge mb-6">{t("pricing.badge")}</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">{t("pricing.title")}</h2>
          <p className="mt-3 text-sm text-[hsl(220,10%,70%)] max-w-md mx-auto">{t("pricing.description")}</p>
        </ScrollReveal>

        <ScrollReveal className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[hsl(96,90%,45%,0.25)] bg-[hsl(96,90%,45%,0.08)] px-4 py-2 text-center">
            <Gift className="h-4 w-4 text-[hsl(96,80%,52%)] shrink-0" />
            <span className="text-xs md:text-[13px] font-medium text-[hsl(220,10%,86%)]">{t("pricing.trialBanner")}</span>
          </div>
        </ScrollReveal>

        <div className="flex items-center justify-center gap-3 mb-10">

          <span className={`text-sm font-medium transition-colors ${!isYearly ? "text-foreground" : "text-[hsl(220,10%,70%)]"}`}>{t("pricing.monthly")}</span>
          <button onClick={() => setIsYearly(!isYearly)} className={`relative h-7 w-[52px] rounded-full transition-colors duration-300 ${isYearly ? "bg-primary" : "bg-[hsl(220,30%,17%)]"}`}>
            <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${isYearly ? "translate-x-[26px]" : "translate-x-0.5"}`} />
          </button>
          <span className={`text-sm font-medium transition-colors ${isYearly ? "text-foreground" : "text-[hsl(220,10%,70%)]"}`}>{t("pricing.yearly")}</span>
          {isYearly && (
            <Badge className="bg-[hsl(96,90%,45%,0.1)] text-[hsl(96,80%,52%)] border-[hsl(96,90%,45%,0.2)] text-[10px] font-bold animate-fade-in">{t("pricing.save")}</Badge>
          )}
        </div>

        <motion.div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 max-w-6xl mx-auto items-stretch rounded-2xl border border-[hsl(96,90%,45%,0.12)] overflow-hidden bg-[hsl(220,40%,7%)]" initial="hidden" animate={gridRevealed ? "visible" : "hidden"} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          {plans.map((plan) => {
            const qty = creditQty[plan.key] ?? 1;
            const price = Math.round(plan.monthlyPrice * qty * (isYearly ? 1 - YEARLY_DISCOUNT : 1));
            return (
              <motion.div key={plan.name} className="h-full" variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}>
                <div className={`relative h-full flex flex-col p-6 border-r border-[hsl(96,90%,45%,0.1)] last:border-r-0 transition-colors ${plan.popular ? "bg-[hsl(220,40%,9%)]" : "bg-transparent hover:bg-[hsl(220,40%,8.5%)]"}`}>
                  {plan.popular && <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary" />}

                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
                    {plan.popular && <Badge className="bg-primary/15 text-[hsl(96,80%,52%)] border border-[hsl(96,90%,45%,0.3)] text-[10px] font-bold uppercase tracking-wider">{t("pricing.mostPopular")}</Badge>}
                  </div>
                  <p className="text-sm text-[hsl(220,10%,64%)] mt-1">{plan.description}</p>

                  <Separator className="my-5 bg-[hsl(96,90%,45%,0.1)]" />

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tabular-nums tracking-tight">€{price}</span>
                    {plan.monthlyPrice > 0 && <span className="text-sm text-[hsl(220,10%,64%)]">{isYearly ? t("pricing.yearly").toLowerCase() : "per month"}</span>}
                  </div>

                  <div className="mt-3">
                    {plan.creditSteps.length > 1 ? (
                      <Select value={String(qty)} onValueChange={(v) => setCreditQty((s) => ({ ...s, [plan.key]: Number(v) }))}>
                        <SelectTrigger className="h-10 rounded-lg bg-transparent border-[hsl(96,90%,45%,0.18)] text-sm">
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
                      <div className="h-10 flex items-center rounded-lg border border-[hsl(96,90%,45%,0.14)] px-3 text-sm text-[hsl(220,10%,80%)]">
                        {plan.baseCredits.toLocaleString()} credits to try
                      </div>
                    )}
                  </div>

                  {plan.monthlyPrice > 0 && (
                    <p className="text-[11px] text-[hsl(96,80%,52%)] mt-2 inline-flex items-center gap-1.5">
                      <Gift className="h-3 w-3" />{t("pricing.trialNote")}
                    </p>
                  )}

                  <Separator className="my-5 bg-[hsl(96,90%,45%,0.1)]" />

                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px]">
                        <Check className="h-3.5 w-3.5 mt-0.5 text-[hsl(220,10%,55%)] shrink-0" />
                        <span className="text-[hsl(220,10%,82%)]">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-6">
                    {plan.monthlyPrice === 0 ? (
                      <Button className="w-full rounded-lg h-11 text-sm font-semibold bg-[hsl(220,30%,12%)] border border-[hsl(96,90%,45%,0.15)] text-foreground hover:bg-[hsl(96,90%,45%,0.1)]" asChild>
                        <Link to="/auth">{plan.cta}</Link>
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleCheckout(plan.key, qty)}
                        disabled={checkoutPlan !== null}
                        className={`w-full rounded-lg h-11 text-sm font-semibold ${plan.popular ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-[hsl(220,30%,12%)] border border-[hsl(96,90%,45%,0.15)] text-foreground hover:bg-[hsl(96,90%,45%,0.1)]"}`}
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


        <ScrollReveal className="mt-16 max-w-5xl mx-auto">
          <Card className="rounded-2xl overflow-hidden border border-[hsl(96,90%,45%,0.1)] bg-[hsl(220,40%,8%)]">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl font-bold">{t("pricing.comparePlans")}</CardTitle>
              <p className="text-sm text-[hsl(220,10%,70%)]">{t("pricing.compareDesc")}</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(96,90%,45%,0.08)] bg-[hsl(220,35%,10%)]">
                      <th className="text-left py-3.5 px-5 font-semibold text-foreground">{t("pricing.feature")}</th>
                      {plans.map((p) => (
                        <th key={p.name} className="text-center py-3.5 px-5">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-semibold ${p.popular ? "text-[hsl(96,80%,52%)]" : "text-foreground"}`}>{p.name}</span>
                            <span className="text-xs text-[hsl(220,10%,64%)] tabular-nums">€{isYearly ? Math.round(p.monthlyPrice * (1 - YEARLY_DISCOUNT)) : p.monthlyPrice}{t("pricing.mo")}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((row, i) => (
                      <tr key={row.label} className={`border-b border-[hsl(96,90%,45%,0.06)] last:border-0 transition-colors hover:bg-[hsl(96,90%,45%,0.03)] ${i % 2 === 1 ? "bg-[hsl(220,35%,7%)]" : ""}`}>
                        <td className="py-3.5 px-5"><div className="flex items-center gap-2.5">{row.icon}<span className="text-foreground font-medium">{row.label}</span></div></td>
                        <td className="py-3.5 px-5 text-center"><TableCell val={row.free} /></td>
                        <td className="py-3.5 px-5 text-center"><TableCell val={row.starter} /></td>
                        <td className="py-3.5 px-5 text-center bg-[hsl(96,90%,45%,0.02)]"><TableCell val={row.pro} /></td>
                        <td className="py-3.5 px-5 text-center"><TableCell val={row.agency} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        <ScrollReveal className="mt-14 max-w-3xl mx-auto" delay={0.1}>
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-[hsl(96,80%,52%)]" />
              <h3 className="text-xl font-bold">{t("pricing.trialFaqTitle")}</h3>
            </div>
            <p className="text-sm text-[hsl(220,10%,70%)]">{t("pricing.trialFaqDesc")}</p>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {trialFaqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`trial-faq-${i}`}
                className="border border-[hsl(96,90%,45%,0.1)] rounded-xl px-5 bg-[hsl(220,40%,8%)] hover:border-[hsl(96,90%,45%,0.2)] transition-colors duration-200 data-[state=open]:border-[hsl(96,90%,45%,0.25)] data-[state=open]:bg-[hsl(220,40%,9%)]"
              >
                <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline py-4 text-foreground">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-[13px] text-[hsl(220,10%,74%)] leading-relaxed pb-4">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollReveal>
      </div>

    </section>
  );
}
