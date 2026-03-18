import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, X, ArrowRight, Zap, Sparkles, Crown, Layers, FileText, Globe, Store, Search, Link2, Code, Users, Headphones } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

const YEARLY_DISCOUNT = 0.2;

function TableCell({ val }: { val: string | boolean }) {
  if (typeof val === "boolean") {
    return val ? (
      <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(142,76%,36%,0.1)]">
        <Check className="h-3.5 w-3.5 text-[hsl(142,76%,50%)]" />
      </div>
    ) : (
      <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(220,30%,12%)]">
        <X className="h-3.5 w-3.5 text-[hsl(220,15%,35%)]" />
      </div>
    );
  }
  return <span className="font-semibold tabular-nums">{val}</span>;
}

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);
  const { t } = useLanguage();

  const plans = [
    { name: t("pricing.starter"), monthlyPrice: 29, description: t("pricing.starterDesc"), popular: false, icon: <Zap className="h-5 w-5" />, cta: t("pricing.getStarted"), pagesLimit: `100 ${t("pricing.pagesPerMonth")}`, features: [`100 ${t("pricing.pagesPerMonth")}`, `50 ${t("pricing.aiGenerations")}`, `5 ${t("pricing.templates")}`, `1 ${t("pricing.websites").toLowerCase()}`, t("pricing.wordpress"), `${t("pricing.email")} ${t("pricing.support").toLowerCase()}`] },
    { name: t("pricing.pro"), monthlyPrice: 79, description: t("pricing.proDesc"), popular: true, icon: <Sparkles className="h-5 w-5" />, cta: t("pricing.startProTrial"), pagesLimit: `2,000 ${t("pricing.pagesPerMonth")}`, features: [`2,000 ${t("pricing.pagesPerMonth")}`, `500 ${t("pricing.aiGenerations")}`, `${t("pricing.unlimited")} ${t("pricing.templates").toLowerCase()}`, `5 ${t("pricing.websites").toLowerCase()}`, t("pricing.wordpress") + " & " + t("pricing.shopify"), t("pricing.googleIndexing"), t("pricing.internalLinks"), t("pricing.apiAccess"), `${t("pricing.priority")} ${t("pricing.support").toLowerCase()}`] },
    { name: t("pricing.agency"), monthlyPrice: 199, description: t("pricing.agencyDesc"), popular: false, icon: <Crown className="h-5 w-5" />, cta: t("pricing.contactSales"), pagesLimit: `10,000 ${t("pricing.pagesPerMonth")}`, features: [`10,000 ${t("pricing.pagesPerMonth")}`, `5,000 ${t("pricing.aiGenerations")}`, `${t("pricing.unlimited")} ${t("pricing.templates").toLowerCase()}`, `${t("pricing.unlimited")} ${t("pricing.websites").toLowerCase()}`, t("pricing.wordpress") + " & " + t("pricing.shopify"), t("pricing.googleIndexing"), t("pricing.internalLinks"), t("pricing.apiAccess"), t("pricing.teamCollaboration"), `${t("pricing.dedicated")} ${t("pricing.support").toLowerCase()}`] },
  ];

  const comparisonFeatures = [
    { label: t("pricing.pagesMonth"), icon: <Layers className="h-4 w-4 text-[hsl(217,91%,68%)]" />, starter: "100", pro: "2,000", agency: "10,000" },
    { label: t("pricing.aiGenerations"), icon: <Sparkles className="h-4 w-4 text-[hsl(217,91%,68%)]" />, starter: "50", pro: "500", agency: "5,000" },
    { label: t("pricing.templates"), icon: <FileText className="h-4 w-4 text-[hsl(217,91%,68%)]" />, starter: "5", pro: t("pricing.unlimited"), agency: t("pricing.unlimited") },
    { label: t("pricing.websites"), icon: <Globe className="h-4 w-4 text-[hsl(217,91%,68%)]" />, starter: "1", pro: "5", agency: t("pricing.unlimited") },
    { label: t("pricing.wordpress"), icon: <Globe className="h-4 w-4 text-[hsl(217,91%,68%)]" />, starter: true, pro: true, agency: true },
    { label: t("pricing.shopify"), icon: <Store className="h-4 w-4 text-[hsl(217,91%,68%)]" />, starter: false, pro: true, agency: true },
    { label: t("pricing.googleIndexing"), icon: <Search className="h-4 w-4 text-[hsl(217,91%,68%)]" />, starter: false, pro: true, agency: true },
    { label: t("pricing.internalLinks"), icon: <Link2 className="h-4 w-4 text-[hsl(217,91%,68%)]" />, starter: false, pro: true, agency: true },
    { label: t("pricing.apiAccess"), icon: <Code className="h-4 w-4 text-[hsl(217,91%,68%)]" />, starter: false, pro: true, agency: true },
    { label: t("pricing.teamCollaboration"), icon: <Users className="h-4 w-4 text-[hsl(217,91%,68%)]" />, starter: false, pro: false, agency: true },
    { label: t("pricing.support"), icon: <Headphones className="h-4 w-4 text-[hsl(217,91%,68%)]" />, starter: t("pricing.email"), pro: t("pricing.priority"), agency: t("pricing.dedicated") },
  ];

  return (
    <section id="pricing" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_50%_20%,hsl(217,91%,60%,0.06),transparent)] pointer-events-none" />
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-10">
          <span className="section-badge mb-6">{t("pricing.badge")}</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">{t("pricing.title")}</h2>
          <p className="mt-3 text-sm text-[hsl(220,15%,50%)] max-w-md mx-auto">{t("pricing.description")}</p>
        </ScrollReveal>

        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm font-medium transition-colors ${!isYearly ? "text-foreground" : "text-[hsl(220,15%,50%)]"}`}>{t("pricing.monthly")}</span>
          <button onClick={() => setIsYearly(!isYearly)} className={`relative h-7 w-[52px] rounded-full transition-colors duration-300 ${isYearly ? "bg-primary" : "bg-[hsl(220,30%,17%)]"}`}>
            <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${isYearly ? "translate-x-[26px]" : "translate-x-0.5"}`} />
          </button>
          <span className={`text-sm font-medium transition-colors ${isYearly ? "text-foreground" : "text-[hsl(220,15%,50%)]"}`}>{t("pricing.yearly")}</span>
          {isYearly && (
            <Badge className="bg-[hsl(217,91%,60%,0.1)] text-[hsl(217,91%,68%)] border-[hsl(217,91%,60%,0.2)] text-[10px] font-bold animate-fade-in">{t("pricing.save")}</Badge>
          )}
        </div>

        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto items-start" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
          {plans.map((plan) => {
            const price = isYearly ? Math.round(plan.monthlyPrice * (1 - YEARLY_DISCOUNT)) : plan.monthlyPrice;
            return (
              <motion.div key={plan.name} variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}>
                <Card className={`relative h-full rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 border-0 ${plan.popular ? "border border-[hsl(217,91%,60%,0.3)] bg-[hsl(220,40%,8%)] shadow-xl glow-purple-sm md:scale-[1.03]" : "border border-[hsl(217,91%,60%,0.1)] bg-[hsl(220,40%,8%)] hover:border-[hsl(217,91%,60%,0.2)]"}`}>
                  {plan.popular && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(210,100%,70%)] to-primary" />}
                  <CardHeader className="pb-2 pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-[hsl(217,91%,60%,0.1)] border border-[hsl(217,91%,60%,0.15)] flex items-center justify-center">{plan.icon}</div>
                        <CardTitle className="text-base font-bold">{plan.name}</CardTitle>
                      </div>
                      {plan.popular && <Badge className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5">{t("pricing.mostPopular")}</Badge>}
                    </div>
                    <p className="text-xs text-[hsl(220,15%,50%)] mt-2">{plan.description}</p>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tabular-nums tracking-tight">€{price}</span>
                      <span className="text-[hsl(220,15%,50%)] text-sm">{t("pricing.mo")}</span>
                    </div>
                    {isYearly && (
                      <p className="text-[11px] text-[hsl(220,15%,45%)] mt-0.5">
                        {t("pricing.billed")} €{price * 12}/{t("pricing.year")} <span className="line-through text-[hsl(220,15%,35%)]">€{plan.monthlyPrice * 12}</span>
                      </p>
                    )}
                    <p className="text-xs text-[hsl(220,15%,50%)] mt-1">{plan.pagesLimit}</p>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <Separator className="bg-[hsl(217,91%,60%,0.08)]" />
                    <ul className="space-y-2.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-[13px]">
                          <div className="h-5 w-5 rounded-full bg-[hsl(142,76%,36%,0.1)] flex items-center justify-center shrink-0"><Check className="h-3 w-3 text-[hsl(142,76%,50%)]" /></div>
                          <span className="text-[hsl(220,15%,65%)]">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className={`w-full rounded-xl h-11 text-sm font-semibold transition-all duration-300 active:scale-[0.97] ${plan.popular ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25" : "bg-[hsl(220,30%,12%)] border border-[hsl(217,91%,60%,0.2)] text-foreground hover:bg-[hsl(217,91%,60%,0.1)] hover:border-[hsl(217,91%,60%,0.3)]"}`} asChild>
                      <Link to="/auth">{plan.cta}<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        <ScrollReveal className="mt-16 max-w-5xl mx-auto">
          <Card className="rounded-2xl overflow-hidden border border-[hsl(217,91%,60%,0.1)] bg-[hsl(220,40%,8%)]">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl font-bold">{t("pricing.comparePlans")}</CardTitle>
              <p className="text-sm text-[hsl(220,15%,50%)]">{t("pricing.compareDesc")}</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(217,91%,60%,0.08)] bg-[hsl(220,35%,10%)]">
                      <th className="text-left py-3.5 px-5 font-semibold text-foreground">{t("pricing.feature")}</th>
                      {plans.map((p) => (
                        <th key={p.name} className="text-center py-3.5 px-5">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-semibold ${p.popular ? "text-[hsl(217,91%,68%)]" : "text-foreground"}`}>{p.name}</span>
                            <span className="text-xs text-[hsl(220,15%,45%)] tabular-nums">€{isYearly ? Math.round(p.monthlyPrice * (1 - YEARLY_DISCOUNT)) : p.monthlyPrice}{t("pricing.mo")}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((row, i) => (
                      <tr key={row.label} className={`border-b border-[hsl(217,91%,60%,0.06)] last:border-0 transition-colors hover:bg-[hsl(217,91%,60%,0.03)] ${i % 2 === 1 ? "bg-[hsl(220,35%,7%)]" : ""}`}>
                        <td className="py-3.5 px-5"><div className="flex items-center gap-2.5">{row.icon}<span className="text-foreground font-medium">{row.label}</span></div></td>
                        <td className="py-3.5 px-5 text-center"><TableCell val={row.starter} /></td>
                        <td className="py-3.5 px-5 text-center bg-[hsl(217,91%,60%,0.02)]"><TableCell val={row.pro} /></td>
                        <td className="py-3.5 px-5 text-center"><TableCell val={row.agency} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </section>
  );
}
