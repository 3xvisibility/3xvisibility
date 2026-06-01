import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";

export default function TermsPage() {
  return (
    <StaticPageLayout title="Terms of Service" subtitle="Last updated: May 2026">
      <h2>Acceptance</h2>
      <p>
        By using 3XVISIBILITY you agree to these Terms. If you do not agree, do not use
        the service.
      </p>
      <h2>Account</h2>
      <p>
        You are responsible for safeguarding your account credentials and for all
        activity on your workspace.
      </p>
      <h2>Acceptable use</h2>
      <ul>
        <li>No spam, malware, or content that violates applicable laws</li>
        <li>No reverse engineering or attempts to disrupt the service</li>
        <li>Respect third-party platform terms (WordPress, Shopify, etc.)</li>
      </ul>
      <h2>Billing</h2>
      <p>
        Paid plans renew automatically. You can cancel any time from the Billing page;
        the cancellation takes effect at the end of the current period.
      </p>
      <h2>Liability</h2>
      <p>
        3XVISIBILITY is provided "as is". We are not liable for indirect or consequential
        damages arising from use of the service.
      </p>
      <h2>Contact</h2>
      <p>
        Legal questions: <a href="mailto:legal@pagegen.app">legal@pagegen.app</a>
      </p>
    </StaticPageLayout>
  );
}
