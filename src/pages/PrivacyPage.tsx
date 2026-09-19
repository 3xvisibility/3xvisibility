import { Seo } from "@/components/Seo";
import ConfidentialitePage from "@/pages/ConfidentialitePage";

export default function PrivacyPage() {
  // The full professional privacy policy lives in ConfidentialitePage.
  // This route renders the same content with its own SEO path so it has its
  // own canonical URL instead of duplicating /confidentialite.
  return (
    <>
      <Seo
        title="Privacy Policy"
        titleFull="3xVisibility privacy policy (GDPR)"
        description="How 3x Visibility collects, uses and protects your personal data in accordance with the GDPR (EU) 2016/679 and the French Data Protection Act."
        path="/privacy"
        image="https://3xvisibility.com/og-image.png"
      />
      <ConfidentialitePage suppressSeo />
    </>
  );
}
