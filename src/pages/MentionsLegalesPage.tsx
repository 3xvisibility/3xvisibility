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
      <StaticPageLayout title="Legal Notice" subtitle="Last updated: July 2026">
        <h2>1. Site publisher</h2>
        <p>
          The site <strong>3xvisibility.com</strong> is published by <strong>3XVISIBILITY</strong>.
          <br />
          Contact: <a href="mailto:info@3xvisibility.com">info@3xvisibility.com</a>
        </p>

        <h2>2. Publication director</h2>
        <p>
          The publication director is the legal representative of 3XVISIBILITY.
        </p>

        <h2>3. Hosting</h2>
        <p>
          The site is hosted on secure cloud infrastructure provided by
          <strong> Lovable</strong> (frontend and distribution) and <strong>Supabase</strong>
          (database, authentication and server functions), with replication within the
          European Union.
        </p>

        <h2>4. Intellectual property</h2>
        <p>
          All content on 3xvisibility.com (text, graphics, logos, icons, images, source
          code) is the exclusive property of 3XVISIBILITY, except for trademarks and logos
          belonging to their respective owners (WordPress, Shopify, PrestaShop, WooCommerce,
          Stripe, etc.).
        </p>
        <p>
          Any reproduction, representation, modification, publication or adaptation of the
          site's elements, in whole or in part, is prohibited without prior written
          authorization.
        </p>

        <h2>5. Personal data</h2>
        <p>
          The processing of your personal data is described in our
          <a href="/confidentialite"> Privacy Policy</a>.
        </p>

        <h2>6. Cookies</h2>
        <p>
          Only cookies strictly necessary for the operation of the service are used
          (user session, language and theme preferences). No advertising tracking cookie
          is placed without consent.
        </p>

        <h2>7. Terms of use</h2>
        <p>
          Use of the service is governed by our
          <a href="/cgv"> General Terms and Conditions of Sale</a>.
        </p>

        <h2>8. Applicable law</h2>
        <p>
          The site 3xvisibility.com and its use are governed by French law. Any dispute
          falls under the exclusive jurisdiction of French courts.
        </p>

        <h2>9. Contact</h2>
        <p>
          For any question:
          <a href="mailto:info@3xvisibility.com"> info@3xvisibility.com</a>
        </p>
      </StaticPageLayout>
    </>
  );
}
