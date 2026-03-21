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
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col landing-page">
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
        <FAQSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
