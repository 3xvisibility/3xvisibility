import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";

export default function ConfidentialitePage() {
  return (
    <>
      <Seo
        title="Privacy Policy"
        description="How 3XVISIBILITY collects, uses and protects your personal data in accordance with the GDPR."
        path="/confidentialite"
      />
      <StaticPageLayout title="Privacy Policy" subtitle="Last updated: July 2026">
        <h2>1. Introduction</h2>
        <p>
          This privacy policy describes how 3XVISIBILITY ("we") collects, uses, stores
          and protects the personal data of users of its SaaS platform, in accordance
          with the General Data Protection Regulation (GDPR) and the French Data
          Protection Act.
        </p>

        <h2>2. Data collected</h2>
        <ul>
          <li><strong>Account:</strong> last name, first name, email, password (encrypted), workspace</li>
          <li><strong>Created content:</strong> templates, campaigns, keyword groups, generated pages</li>
          <li><strong>Third-party connection credentials:</strong> WordPress, Shopify, Google Search Console tokens
              (encrypted at rest)</li>
          <li><strong>Billing:</strong> handled by Stripe, no card data is stored on our servers</li>
          <li><strong>Usage data:</strong> pages generated, AI credits consumed, security audit logs</li>
        </ul>

        <h2>3. Purposes of processing</h2>
        <ul>
          <li>Provide and operate the service (generation, SEO optimization, publishing)</li>
          <li>Bill subscriptions and manage customer relations</li>
          <li>Improve the quality and security of the service</li>
          <li>Comply with our legal and accounting obligations</li>
        </ul>

        <h2>4. Legal basis</h2>
        <p>
          Processing is based on contract performance (providing the service), our
          legitimate interest (security, product improvement), and compliance with
          legal obligations (invoicing, security logging).
        </p>

        <h2>5. Subprocessors</h2>
        <p>We use subprocessors that are strictly necessary for the operation of the service:</p>
        <ul>
          <li><strong>Supabase</strong> — database hosting and authentication</li>
          <li><strong>Stripe</strong> — payment processing and invoicing</li>
          <li><strong>AI providers</strong> (Google Gemini, OpenAI, DeepSeek depending on configuration) —
              content and image generation</li>
          <li><strong>Resend / email provider</strong> — sending transactional emails</li>
        </ul>

        <h2>6. Data retention</h2>
        <p>
          Your data is retained for the duration of your active subscription. Upon
          cancellation, content is deleted or anonymized within 30 days, subject to
          legal retention obligations (invoices: 10 years).
        </p>

        <h2>7. Security</h2>
        <p>
          We apply robust security measures: encryption in transit (TLS) and at rest,
          workspace isolation (Row-Level Security), audit logs of sensitive access,
          strong authentication, and detection of cross-workspace access attempts.
        </p>

        <h2>8. Your rights</h2>
        <p>Under the GDPR, you have the following rights:</p>
        <ul>
          <li>Right of access, rectification and deletion</li>
          <li>Right to data portability</li>
          <li>Right to object to and restrict processing</li>
          <li>Right to lodge a complaint with the CNIL</li>
        </ul>
        <p>
          To exercise these rights:
          <a href="mailto:info@3xvisibility.com"> info@3xvisibility.com</a>
        </p>

        <h2>9. Cookies</h2>
        <p>
          We use only cookies strictly necessary for the operation of the service
          (session, language and theme preferences). No advertising cookies are placed
          without consent.
        </p>

        <h2>10. Contact</h2>
        <p>
          For any question regarding the protection of your data:
          <a href="mailto:info@3xvisibility.com"> info@3xvisibility.com</a>
        </p>
      </StaticPageLayout>
    </>
  );
}
