import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { useLanguage } from "@/i18n/LanguageContext";

export function CTASection() {
  const { t } = useLanguage();

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal>
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-[hsl(220,45%,7%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(96,90%,45%,0.2),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(96,92%,62%,0.15),transparent_60%)]" />
            <div className="absolute inset-0 rounded-3xl border border-[hsl(96,90%,45%,0.15)]" />
            <div className="relative z-10 py-16 md:py-20 px-8 md:px-16 text-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-tight max-w-lg mx-auto">{t("cta.title")}</h2>
              <p className="mt-4 text-[hsl(220,10%,70%)] max-w-md mx-auto text-sm leading-relaxed">{t("cta.description")}</p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-[0.97] text-sm px-8 h-12 rounded-xl font-semibold shadow-xl shadow-primary/25" asChild>
                  <Link to="/auth">{t("cta.getStarted")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button variant="outline" size="lg" className="border-[hsl(96,90%,45%,0.2)] bg-transparent text-[hsl(220,10%,85%)] hover:text-foreground hover:bg-[hsl(96,90%,45%,0.08)] h-12 rounded-xl text-sm font-medium" asChild>
                  <a href="#pricing">{t("cta.viewPricing")}</a>
                </Button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
