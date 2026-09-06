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
        title="Pricing & Plans"
        description="Compare 3XVISIBILITY plans: pages, AI generations, connected sites and support. Simple monthly or yearly pricing, cancel anytime."
      />
      <LandingNav />
      <main className="flex-1 pt-20">
        <PricingSection />
        <FAQSection />
      </main>
      <LandingFooter />
      <BackToTop />
    </div>
  );
}
