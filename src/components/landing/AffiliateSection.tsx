import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ScrollReveal } from "./ScrollReveal";
import { useLanguage } from "@/i18n/LanguageContext";
import { DollarSign, Users, TrendingUp, Gift } from "lucide-react";

export function AffiliateSection() {
  const { t } = useLanguage();

  const benefits = [
    { icon: DollarSign, title: t("affiliateLanding.benefit1Title"), desc: t("affiliateLanding.benefit1Desc") },
    { icon: Users, title: t("affiliateLanding.benefit2Title"), desc: t("affiliateLanding.benefit2Desc") },
    { icon: TrendingUp, title: t("affiliateLanding.benefit3Title"), desc: t("affiliateLanding.benefit3Desc") },
    { icon: Gift, title: t("affiliateLanding.benefit4Title"), desc: t("affiliateLanding.benefit4Desc") },
  ];

  return (
    <section id="affiliate" className="py-20 md:py-28 relative">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent pointer-events-none" />
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center mb-12">
          <span className="section-badge mb-6">{t("affiliateLanding.badge")}</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">
            {t("affiliateLanding.title1")}{" "}
            <span className="text-primary">{t("affiliateLanding.title2")}</span>
          </h2>
          <p className="text-[hsl(220,15%,55%)] mt-4 max-w-2xl mx-auto text-base md:text-lg">
            {t("affiliateLanding.description")}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {benefits.map((b, i) => (
              <div key={i} className="p-6 rounded-2xl border border-[hsl(217,91%,60%,0.1)] bg-[hsl(220,40%,8%)] hover:border-[hsl(217,91%,60%,0.2)] transition-all duration-300 group">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <b.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{b.title}</h3>
                <p className="text-sm text-[hsl(220,15%,55%)]">{b.desc}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-8 text-center">
              <div>
                <p className="text-3xl font-extrabold text-primary">5%</p>
                <p className="text-xs text-[hsl(220,15%,55%)] mt-1">{t("affiliateLanding.commissionRate")}</p>
              </div>
              <div className="h-10 w-px bg-[hsl(217,91%,60%,0.15)]" />
              <div>
                <p className="text-3xl font-extrabold text-foreground">$25</p>
                <p className="text-xs text-[hsl(220,15%,55%)] mt-1">{t("affiliateLanding.minPayout")}</p>
              </div>
              <div className="h-10 w-px bg-[hsl(217,91%,60%,0.15)]" />
              <div>
                <p className="text-3xl font-extrabold text-foreground">∞</p>
                <p className="text-xs text-[hsl(220,15%,55%)] mt-1">{t("affiliateLanding.unlimited")}</p>
              </div>
            </div>
          </div>
          <div className="text-center mt-8">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20" asChild>
              <Link to="/auth">{t("affiliateLanding.cta")}</Link>
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
