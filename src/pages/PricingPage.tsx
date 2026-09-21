import { useRef } from "react";
import { usePageAutoTranslate } from "@/i18n/usePageAutoTranslate";
import { Seo } from "@/components/Seo";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { BackToTop } from "@/components/BackToTop";

export default function PricingPage() {
  const contentRef = useRef<HTMLDivElement>(null);
  usePageAutoTranslate(contentRef);

  return (
    <div className="min-h-screen flex flex-col landing-page" ref={contentRef}>
      <Seo
        path="/pricing"
        title="Pricing & plans for 3xVisibility"
        titleFull="3xVisibility pricing — plans for programmatic SEO"
        description="Compare 3x Visibility plans: pages, AI generations, connected sites and support. Simple monthly or yearly pricing, cancel anytime."
        image="https://www.3xvisibility.com/og-image.png"
      />
      <LandingNav />
      <main className="flex-1 pt-20">
        {/* Visible H1 for the standalone /pricing page. On the homepage the
            hero already provides the H1, so this is scoped to this route only. */}
        <h1 className="sr-only">3x Visibility pricing &amp; plans</h1>
        <PricingSection />
        <section className="py-16 md:py-20 border-t border-[hsl(96,67%,48%,0.08)]">
          <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-[-0.02em]">
              Which 3x Visibility plan is right for you?
            </h2>
            <p className="mt-4 text-sm md:text-base text-[hsl(220,12%,42%)] leading-relaxed">
              Every plan includes the full page-generation engine: CSV or data-source import,
              template mapping, AI content generation and one-click publishing to WordPress,
              Shopify, WooCommerce and PrestaShop. What changes between plans is the monthly
              page allowance, the number of connected sites, and the level of support.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[hsl(96,67%,48%,0.12)] bg-[hsl(250,30%,98%)] p-6">
                <h3 className="font-bold text-sm mb-2">Starting out</h3>
                <p className="text-xs text-[hsl(220,12%,45%)] leading-relaxed">
                  Begin with the free trial to generate your first pages and connect one site.
                  No credit card is required, and you can cancel at any time.
                </p>
              </div>
              <div className="rounded-2xl border border-[hsl(96,67%,48%,0.12)] bg-[hsl(250,30%,98%)] p-6">
                <h3 className="font-bold text-sm mb-2">Growing teams</h3>
                <p className="text-xs text-[hsl(220,12%,45%)] leading-relaxed">
                  Pro plans raise the monthly page allowance and unlock API access for
                  programmatic campaign creation and automation.
                </p>
              </div>
              <div className="rounded-2xl border border-[hsl(96,67%,48%,0.12)] bg-[hsl(250,30%,98%)] p-6">
                <h3 className="font-bold text-sm mb-2">Agencies &amp; scale</h3>
                <p className="text-xs text-[hsl(220,12%,45%)] leading-relaxed">
                  Agency plans cover multiple client workspaces, the highest page volumes and
                  priority support for time-sensitive launches.
                </p>
              </div>
            </div>
          </div>
        </section>
        <FAQSection />
      </main>
      <LandingFooter />
      <BackToTop />
    </div>
  );
}
