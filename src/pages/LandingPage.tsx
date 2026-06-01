import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { FeatureShowcaseSection } from "@/components/landing/FeatureShowcaseSection";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { VideoSection } from "@/components/landing/VideoSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ReviewsSection } from "@/components/landing/ReviewsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { AffiliateSection } from "@/components/landing/AffiliateSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { BackToTop } from "@/components/BackToTop";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col landing-page">
      <Seo
        title="Mass-build SEO, GEO & programmatic pages at scale"
        titleFull="3XVISIBILITY — Mass-build SEO, GEO & programmatic pages at scale"
        description="Automatically mass-build local SEO, programmatic SEO, GEO sites, directories and content at scale with one-click deployment. Save 40 hours per site."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "3XVISIBILITY",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }}
      />
      <LandingNav />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <FeatureShowcaseSection />
        <UseCasesSection />
        <IntegrationsSection />
        <VideoSection />
        <HowItWorksSection />
        <ReviewsSection />
        <PricingSection />
        <AffiliateSection />
        <FAQSection />
        <CTASection />
      </main>
      <LandingFooter />
      <BackToTop />
    </div>
  );
}
