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
      <StaticPageLayout
        title="Privacy Policy"
        subtitle="Last updated: August 2026 — In accordance with the GDPR (EU) 2016/679 and the French Data Protection Act."
      >
        <h2>1. Introduction</h2>
        <p>
          This privacy policy describes how <span translate="no">3XVISIBILITY</span>{" "}
          (« we »), published by <span translate="no">VERODAV GROUP</span> (SAS,
          <span translate="no"> 21 rue de Cherbourg, 67100 Strasbourg, France</span>),
          collects, uses, stores and protects the personal data of users of its SaaS
          platform.
        </p>

        <h2>2. Data controller</h2>
        <p>
          <strong>Data controller</strong> : <span translate="no">VERODAV GROUP / 3XVISIBILITY</span> —{" "}
          <a href="mailto:Support@3xvisibility.com" translate="no">Support@3xvisibility.com</a>
        </p>

        <h2>3. Data collected</h2>
        <ul>
          <li><strong>Account:</strong> last name, first name, email, password (encrypted), workspace</li>
          <li><strong>Created content:</strong> templates, campaigns, keyword groups, generated pages</li>
          <li><strong>Third-party connection credentials:</strong> WordPress, Shopify, Google Search Console tokens (encrypted at rest)</li>
          <li><strong>Billing:</strong> handled by <span translate="no">Stripe</span>, no card data is stored on our servers</li>
          <li><strong>Usage data:</strong> pages generated, AI credits consumed, security audit logs</li>
          <li><strong>Technical data:</strong> IP address, browser characteristics (security and delivery purposes)</li>
        </ul>

        <h2>4. Purposes of processing</h2>
        <ul>
          <li>Provide and operate the service (generation, SEO optimization, publishing)</li>
          <li>Bill subscriptions, generate invoices and manage customer relations</li>
          <li>Improve the quality and security of the service</li>
          <li>Send transactional emails (account, invoices, notifications)</li>
          <li>Comply with our legal and accounting obligations</li>
        </ul>

        <h2>5. Legal basis</h2>
        <p>
          Processing is based on contract performance (providing the service), our
          legitimate interest (security, product improvement), and compliance with
          legal obligations (invoicing, security logging). Where processing is based on
          consent, you may withdraw it at any time.
        </p>

        <h2>6. Subprocessors</h2>
        <p>We use subprocessors that are strictly necessary for the operation of the service:</p>
        <div className="overflow-x-auto my-5">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[hsl(96,67%,48%,0.2)]">
                <th className="text-left py-2 pr-4 font-semibold">Provider</th>
                <th className="text-left py-2 pr-4 font-semibold">Role</th>
                <th className="text-left py-2 pr-4 font-semibold">Country</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[hsl(96,67%,48%,0.08)]">
                <td className="py-2 pr-4" translate="no">Supabase, Inc.</td>
                <td className="py-2 pr-4">Database hosting, authentication, storage</td>
                <td className="py-2 pr-4">Singapore / USA</td>
              </tr>
              <tr className="border-b border-[hsl(96,67%,48%,0.08)]">
                <td className="py-2 pr-4" translate="no">Stripe, Inc.</td>
                <td className="py-2 pr-4">Payment processing and invoicing</td>
                <td className="py-2 pr-4">USA</td>
              </tr>
              <tr className="border-b border-[hsl(96,67%,48%,0.08)]">
                <td className="py-2 pr-4" translate="no">Cloudflare, Inc.</td>
                <td className="py-2 pr-4">CDN, reverse proxy, security</td>
                <td className="py-2 pr-4">USA</td>
              </tr>
              <tr className="border-b border-[hsl(96,67%,48%,0.08)]">
                <td className="py-2 pr-4" translate="no">Lovable</td>
                <td className="py-2 pr-4">Development and hosting platform</td>
                <td className="py-2 pr-4">Sweden / USA</td>
              </tr>
              <tr className="border-b border-[hsl(96,67%,48%,0.08)]">
                <td className="py-2 pr-4" translate="no">Resend</td>
                <td className="py-2 pr-4">Transactional email delivery</td>
                <td className="py-2 pr-4">USA</td>
              </tr>
              <tr className="border-b border-[hsl(96,67%,48%,0.08)]">
                <td className="py-2 pr-4" translate="no">Google Ireland Ltd.</td>
                <td className="py-2 pr-4">AI content generation (Gemini), web fonts</td>
                <td className="py-2 pr-4">Ireland / USA</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Where personal data is transferred outside the EU/EEA, such transfers are
          governed by the providers' data processing terms and appropriate safeguards
          (standard contractual clauses or equivalent mechanisms).
        </p>

        <h2>7. Data retention</h2>
        <p>
          Your data is retained for the duration of your active subscription. Upon
          cancellation, content is deleted or anonymized within 30 days, subject to
          legal retention obligations (invoices: 10 years).
        </p>

        <h2>8. Security</h2>
        <p>
          We apply robust security measures: encryption in transit (TLS) and at rest,
          workspace isolation (Row-Level Security), audit logs of sensitive access,
          strong authentication, and detection of cross-workspace access attempts.
        </p>

        <h2>9. Your rights</h2>
        <p>Under the GDPR, you have the following rights:</p>
        <ul>
          <li>Right of access, rectification and deletion</li>
          <li>Right to data portability</li>
          <li>Right to object to and restrict processing</li>
          <li>Right to withdraw consent at any time</li>
          <li>Right to lodge a complaint with the <span translate="no">CNIL</span> (www.cnil.fr)</li>
        </ul>
        <p>
          To exercise these rights:{" "}
          <a href="mailto:Support@3xvisibility.com" translate="no">Support@3xvisibility.com</a>
        </p>

        <h2>10. Cookies</h2>
        <p>
          We use only cookies and browser storage strictly necessary for the operation
          of the service (session, language and theme preferences). No advertising
          cookies or third-party analytics trackers are placed without consent.
        </p>

        <h2>11. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. The « Last updated » date at the
          top of this page reflects the most recent revision. Significant changes will
          be notified by email or in-app notice.
        </p>

        <h2>12. Contact</h2>
        <p>
          For any question regarding the protection of your data:{" "}
          <a href="mailto:Support@3xvisibility.com" translate="no">Support@3xvisibility.com</a>
        </p>
      </StaticPageLayout>
    </>
  );
}
