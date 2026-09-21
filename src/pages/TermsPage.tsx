import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";

export default function TermsPage() {
  return (
    <>
      <Seo
        title="Terms of Service"
        titleFull="3xVisibility terms of service"
        description="The terms that govern your use of the 3x Visibility page generation and publishing service, including billing, acceptable use and liability."
        path="/terms"
        image="https://www.3xvisibility.com/og-image.png"
      />
    <StaticPageLayout title="Terms of Service" subtitle="Last updated: May 2026">
      <h2>Acceptance</h2>
      <p>
        By using 3x Visibility you agree to these Terms. If you do not agree, do not use
        the service.
      </p>
      <h2>Your account</h2>
      <p>
        You are responsible for safeguarding your account credentials and for all
        activity on your workspace. Keep your password confidential and notify us
        promptly if you believe an unauthorised person has accessed your account.
      </p>
      <h2>Acceptable use</h2>
      <p>
        You may use 3x Visibility to generate and publish content that you own or have
        the right to publish. The following is not permitted:
      </p>
      <ul>
        <li>Spam, malware, or content that violates applicable laws</li>
        <li>Content that infringes the intellectual property rights of a third party</li>
        <li>Reverse engineering or attempts to disrupt the service</li>
        <li>Reselling or sub-licensing access to the platform</li>
        <li>Respect third-party platform terms (WordPress, Shopify, etc.)</li>
      </ul>
      <h2>Your content</h2>
      <p>
        You retain ownership of all content you generate with the platform. Granting us
        the limited right to process your content is necessary solely to provide the
        service — we do not claim ownership of your pages, templates or data.
      </p>
      <h2>Billing</h2>
      <p>
        Paid plans renew automatically. You can cancel any time from the Billing page;
        the cancellation takes effect at the end of the current period. Fees already
        paid for the current period are not refunded for partial use.
      </p>
      <h2>Service availability</h2>
      <p>
        The platform is provided on a commercially reasonable basis. We do not guarantee
        uninterrupted availability, and we are not liable for outages caused by factors
        outside our control, including third-party CMS or hosting providers.
      </p>
      <h2>Liability</h2>
      <p>
        3x Visibility is provided "as is". We are not liable for indirect or consequential
        damages arising from use of the service. Our total liability is limited to the
        fees you paid in the twelve months preceding the claim.
      </p>
      <h2>Changes to these terms</h2>
      <p>
        We may update these Terms as the service evolves. Material changes will be
        announced in advance, and continued use after the effective date constitutes
        acceptance of the revised terms.
      </p>
      <h2>Contact</h2>
      <p>
        Legal questions: <a href="mailto:Support@3xvisibility.com">Support@3xvisibility.com</a>
      </p>
    </StaticPageLayout>
    </>
  );
}
