import { Seo } from "@/components/Seo";
import ConfidentialitePage from "@/pages/ConfidentialitePage";

export default function PrivacyPage() {
  // The full professional privacy policy lives in ConfidentialitePage.
  // This route renders the same content with its own SEO path.
  return <ConfidentialitePage key="privacy" />;
}
