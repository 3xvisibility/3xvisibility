import { Seo } from "@/components/Seo";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { WebsiteAnalyzerSection } from "@/components/landing/WebsiteAnalyzerSection";
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
import { useLanguage } from "@/i18n/LanguageContext";

export default function LandingPage() {
  const { t } = useLanguage();

  // FAQPage schema mirrors the visible FAQ section below, so answer engines
  // can extract the Q&A pairs directly. Only questions actually rendered on
  // the page are included.
  const faqItems = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
    { q: t("faq.q5"), a: t("faq.a5") },
    { q: t("faq.q6"), a: t("faq.a6") },
    { q: t("faq.q7"), a: t("faq.a7") },
  ];

  return (
    <div className="min-h-screen flex flex-col landing-page">
      <Seo
        title="Mass-build SEO, GEO & programmatic pages"
        titleFull="3xVisibility — Mass-build SEO, GEO & programmatic pages"
        description="Automatically mass-build local SEO, programmatic SEO, GEO sites, directories and content at scale with one-click deployment. Save 40 hours per site."
        path="/"
        image="https://3xvisibility.com/og-image.png"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "3x Visibility",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
          },
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "3xVisibility — Mass-build SEO, GEO & programmatic pages",
            url: "https://3xvisibility.com/",
            description: "Automatically mass-build local SEO, programmatic SEO, GEO sites, directories and content at scale with one-click deployment.",
            isPartOf: { "@type": "WebSite", name: "3x Visibility", url: "https://3xvisibility.com/" },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqItems.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />
      <LandingNav />
      <main className="flex-1">
        <HeroSection />
        <WebsiteAnalyzerSection />
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
