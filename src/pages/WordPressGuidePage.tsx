import { Seo } from "@/components/Seo";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import {
  ArrowRight, Globe, CheckCircle2, KeyRound, UserPlus, Plug,
  ShieldCheck, AlertTriangle, Rocket, ListChecks,
} from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import { wordpressGuide } from "@/data/integration-guides";

const STEP_ICONS = [KeyRound, Plug, UserPlus, ShieldCheck, Rocket];

export default function WordPressGuidePage() {
  const { language } = useLanguage();
  const c = wordpressGuide[language] ?? wordpressGuide.en;

  useEffect(() => {
    document.title = "Connect WordPress — 3XVISIBILITY";
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute("content", "Step-by-step guide to connect your WordPress site to 3XVISIBILITY and publish pages at scale.");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Connect WordPress"
        description="A step-by-step guide to connecting your WordPress website to 3XVISIBILITY using Application Passwords, then publishing programmatic pages."
        path="/guides/wordpress"
      />
      <LandingNav />

      <main className="container mx-auto px-4 lg:px-8 pt-28 pb-16">
        {/* Hero */}
        <header className="max-w-3xl mx-auto text-center mb-14">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Globe className="h-3 w-3 mr-1" /> {c.badge}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {c.heroTitle}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            {c.heroSubtitle}
          </p>
        </header>

        {/* Prerequisites */}
        <section className="max-w-4xl mx-auto mb-14">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" /> {c.beforeYouStart}
            </h2>
            <ul className="grid sm:grid-cols-3 gap-3">
              {c.prereqs.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Steps */}
        <section className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">{c.stepByStep}</h2>
          <div className="relative space-y-5">
            {c.steps.map((s, i) => {
              const Icon = STEP_ICONS[i] ?? KeyRound;
              return (
                <article
                  key={i}
                  className="relative rounded-2xl border border-border bg-card p-6 md:p-7 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="mt-2 text-xs font-bold text-muted-foreground">{c.stepLabel} {i + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-lg">{s.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">{s.desc}</p>
                      <ol className="space-y-2">
                        {s.bullets.map((b, j) => (
                          <li key={j} className="flex gap-2 text-sm">
                            <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center mt-0.5">
                              {j + 1}
                            </span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="max-w-4xl mx-auto mt-16">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" /> {c.troubleshooting}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {c.troubleshoot.map((t, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-medium text-sm mb-1.5">{t.q}</h3>
                <p className="text-sm text-muted-foreground">{t.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto mt-16 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-8 text-center">
          <h2 className="text-xl font-bold mb-2">{c.ctaTitle}</h2>
          <p className="text-sm text-muted-foreground mb-5">
            {c.ctaSubtitle}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link to="/dashboard">{c.ctaPrimary} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/guides/shopify">{c.ctaSecondary}</Link>
            </Button>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
