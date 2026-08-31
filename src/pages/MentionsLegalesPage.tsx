import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";

export default function MentionsLegalesPage() {
  return (
    <>
      <Seo
        title="Legal Notice"
        description="Legal information about the publisher and hosting of the 3XVISIBILITY website."
        path="/mentions-legales"
      />
      <StaticPageLayout
        title="Legal Notice"
        subtitle="In accordance with the applicable French and European legislation (in particular Article 6 of the French Law for Confidence in the Digital Economy — LCEN — and the GDPR)."
      >
        <h2>1. Website Publisher</h2>
        <p>
          The website <strong>verodav-shop.com</strong> is published by:
        </p>
        <ul>
          <li><strong>Legal name</strong> : VERODAV GROUP</li>
          <li><strong>Trading name</strong> : 3xvisibility.com</li>
          <li><strong>Legal form</strong> : SAS – Société par actions simplifiée</li>
          <li><strong>Registered address</strong> : 21 rue de Cherbourg, 67100 Strasbourg, France</li>
          <li><strong>Trade and companies register (RCS)</strong> : Strasbourg 843 715 954</li>
          <li><strong>National business number (SIREN)</strong> : 843 715 954</li>
          <li><strong>Headquarters SIRET</strong> : 843 715 954 00023</li>
          <li><strong>Intra-community VAT number</strong> : FR95 843715954</li>
          <li><strong>Contact email</strong> : <a href="mailto:info@3xvisibility.com">info@3xvisibility.com</a></li>
          <li><strong>Director of publication</strong> : Yannick Humphrey</li>
        </ul>

        <h2>2. Hosting & Infrastructure</h2>
        <p>
          The website is hosted and operated on the Lovable platform. The application is served
          to visitors through Cloudflare's global edge network, which acts as content delivery
          network (CDN), reverse proxy and security layer.
        </p>
        <ul>
          <li><strong>Lovable</strong> — Development and hosting platform — <a href="https://lovable.dev/">lovable.dev</a></li>
          <li><strong>Cloudflare, Inc.</strong> — CDN, reverse proxy, caching and security (edge network) — 101 Townsend Street, San Francisco, CA 94107, United States — <a href="https://www.cloudflare.com/">cloudflare.com</a></li>
        </ul>

        <h2>3. Technology and Third-Party Service Providers</h2>
        <p>
          The following table lists the third-party services actually used by this website in
          production. Only services that run in production or process user data are listed.
        </p>
        <div className="overflow-x-auto my-5">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[hsl(96,67%,48%,0.2)]">
                <th className="text-left py-2 pr-4 font-semibold">Provider</th>
                <th className="text-left py-2 pr-4 font-semibold">Role</th>
                <th className="text-left py-2 pr-4 font-semibold">Purpose</th>
                <th className="text-left py-2 pr-4 font-semibold">Data potentially processed</th>
                <th className="text-left py-2 pr-4 font-semibold">Country</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[hsl(96,67%,48%,0.08)]">
                <td className="py-2 pr-4">Supabase, Inc.</td>
                <td className="py-2 pr-4">Database, authentication, file storage, API</td>
                <td className="py-2 pr-4">User accounts, workspaces, campaigns, generated pages, invoices</td>
                <td className="py-2 pr-4">Account data, workspace data, generated content, invoices, contact details</td>
                <td className="py-2 pr-4">Singapore / USA</td>
              </tr>
              <tr className="border-b border-[hsl(96,67%,48%,0.08)]">
                <td className="py-2 pr-4">Cloudflare, Inc.</td>
                <td className="py-2 pr-4">CDN, reverse proxy, caching, security</td>
                <td className="py-2 pr-4">Fast and secure delivery of the website</td>
                <td className="py-2 pr-4">Technical connection data (IP address, browser characteristics)</td>
                <td className="py-2 pr-4">USA</td>
              </tr>
              <tr className="border-b border-[hsl(96,67%,48%,0.08)]">
                <td className="py-2 pr-4">Lovable</td>
                <td className="py-2 pr-4">Development and hosting platform</td>
                <td className="py-2 pr-4">Build, deployment and hosting of the application</td>
                <td className="py-2 pr-4">Technical hosting data</td>
                <td className="py-2 pr-4">Sweden / USA</td>
              </tr>
              <tr className="border-b border-[hsl(96,67%,48%,0.08)]">
                <td className="py-2 pr-4">Resend</td>
                <td className="py-2 pr-4">Transactional email service</td>
                <td className="py-2 pr-4">Account, invoice and notification emails</td>
                <td className="py-2 pr-4">Recipient name and email address, email content</td>
                <td className="py-2 pr-4">USA</td>
              </tr>
              <tr className="border-b border-[hsl(96,67%,48%,0.08)]">
                <td className="py-2 pr-4">Google Ireland Ltd.</td>
                <td className="py-2 pr-4">Web font delivery (Google Fonts)</td>
                <td className="py-2 pr-4">Display of the site's typography</td>
                <td className="py-2 pr-4">Technical request data (IP address) when fonts are downloaded</td>
                <td className="py-2 pr-4">Ireland / USA</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>4. Supabase (Database, Authentication, Storage)</h2>
        <p>
          This website uses Supabase as its data platform: a PostgreSQL database (user accounts,
          workspaces, campaigns, generated pages, invoices), Supabase Auth (account creation,
          sign-in, password reset) and Supabase Storage (generated assets and documents). Access
          to data is controlled by row-level security policies enforced on the server. No API
          key, credential or internal identifier is exposed on this page or in the public pages
          of the site.
        </p>

        <h2>5. Cloudflare (CDN & Security)</h2>
        <p>
          Cloudflare provides the CDN and reverse-proxy layer through which the website is
          delivered, including response caching and network-level security. Cloudflare
          processes technical data such as the IP address and browser characteristics solely
          for security verification and content delivery.
        </p>

        <h2>6. Personal Data (GDPR)</h2>
        <p>
          <strong>Data controller</strong> : 3XVISIBILITY — <a href="mailto:info@3xvisibility.com">info@3xvisibility.com</a>
        </p>
        <p>
          Personal data is processed for the following purposes: creation and management of user
          accounts, processing and follow-up of subscriptions and invoices, customer service and
          responses to contact requests, and the security of the website. The legal bases are
          the performance of the contract (subscriptions, account management), legal obligations
          (invoicing and accounting records) and the legitimate interest of the publisher
          (website security).
        </p>
        <p>
          The categories of data processed are: identity and contact details (name, email),
          account and workspace information, subscription and invoice data, and technical
          connection data required for security. Data is kept only for the time needed for
          these purposes and for the applicable legal retention obligations (in particular
          accounting retention for invoices).
        </p>
        <p>
          Some of the providers listed above are established outside the European Union (United
          States, Singapore). Where personal data is transferred outside the EU/EEA, such
          transfers are governed by the providers' own data processing terms and the safeguards
          described in their respective privacy documentation (standard contractual clauses or
          equivalent mechanisms).
        </p>
        <p>
          For full details, please read our <a href="/confidentialite">Privacy Policy</a>.
        </p>

        <h2>7. Cookies & Trackers</h2>
        <p>
          This website uses only strictly necessary technologies: the authentication session and
          your preferences (such as language and theme) are stored in your browser's local
          storage. These technologies are essential to the operation of the site and do not
          require prior consent.
        </p>
        <p>
          No advertising tracker, advertising pixel or third-party analytics cookie is currently
          loaded on this website. Should consent-requiring trackers be added in the future, a
          consent mechanism allowing you to accept, refuse, manage and withdraw your choices
          will be displayed before they are activated.
        </p>

        <h2>8. Your Rights</h2>
        <p>
          You have the right of access, rectification, erasure, restriction, portability and
          objection regarding your personal data, as well as the right to withdraw consent where
          processing is based on consent. To exercise these rights, contact us at:{" "}
          <a href="mailto:info@3xvisibility.com">info@3xvisibility.com</a>
        </p>
        <p>
          You also have the right to lodge a complaint with the competent supervisory authority,
          the CNIL (Commission Nationale de l'Informatique et des Libertés), 3 Place de Fontenoy,
          TSA 80715, 75334 PARIS CEDEX 07, France — www.cnil.fr.
        </p>

        <h2>9. Legal & Commercial Documents</h2>
        <p>Our legal and commercial documents are available here:</p>
        <ul>
          <li><a href="/cgv">Terms and Conditions of Sale</a></li>
          <li><a href="/confidentialite">Privacy Policy</a></li>
        </ul>

        <h2>10. Notice</h2>
        <p>
          This page is provided for transparency purposes. Fields marked « Information to be
          completed by the website owner » must be confirmed and completed by the publisher.
          This page does not constitute a guarantee or certification of legal compliance.
        </p>

        <h2>11. Contact</h2>
        <p>
          For any question: <a href="mailto:info@3xvisibility.com">info@3xvisibility.com</a>
        </p>
      </StaticPageLayout>
    </>
  );
}
