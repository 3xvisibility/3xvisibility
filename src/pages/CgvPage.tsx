import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";

export default function CgvPage() {
  return (
    <>
      <Seo
        title="General Terms and Conditions of Sale (GTCS)"
        description="General terms and conditions governing the use of 3XVISIBILITY page generation and publishing services."
        path="/cgv"
      />
      <StaticPageLayout
        title="General Terms and Conditions of Sale"
        subtitle="Last updated: August 2026 — These terms govern the sale and use of the 3XVISIBILITY SaaS platform."
      >
        <h2>1. Purpose</h2>
        <p>
          These General Terms and Conditions of Sale (« GTCS ») govern the provision by
          <span translate="no"> 3XVISIBILITY</span> of its SaaS platform for generating,
          SEO-optimizing and automatically publishing web pages on WordPress, Shopify,
          PrestaShop, WooCommerce and via HTML/CSS export. Any subscription to the service
          implies full and unreserved acceptance of these GTCS.
        </p>

        <h2>2. Publisher</h2>
        <ul>
          <li><strong>Legal name</strong> : <span translate="no">VERODAV GROUP</span></li>
          <li><strong>Trading name</strong> : <span translate="no">3xvisibility</span></li>
          <li><strong>Legal form</strong> : SAS – Société par actions simplifiée</li>
          <li><strong>Registered address</strong> : <span translate="no">21 rue de Cherbourg, 67100 Strasbourg, France</span></li>
          <li><strong>RCS</strong> : <span translate="no">Strasbourg 843 715 954</span></li>
          <li><strong>Intra-community VAT</strong> : <span translate="no">FR95 843715954</span></li>
          <li><strong>Contact email</strong> : <a href="mailto:info@3xvisibility.com" translate="no">info@3xvisibility.com</a></li>
        </ul>

        <h2>3. Services</h2>
        <p>The platform provides, according to the subscribed plan:</p>
        <ul>
          <li>AI-assisted generation of SEO/SEA/GEO-optimized web pages</li>
          <li>Keyword group management, location databases and variable systems</li>
          <li>Template marketplace and HTML/CSS template import</li>
          <li>Publishing to connected platforms (WordPress, Shopify, PrestaShop, WooCommerce, HTML/CSS)</li>
          <li>SEO audit, content scoring and optimization tools</li>
          <li>Credit-based usage of AI generation features</li>
        </ul>

        <h2>4. Subscription</h2>
        <p>
          Access to paid features is provided through a monthly or annual subscription
          (Starter, Pro, Agency plans). Every new subscriber gets a 7-day free trial,
          with no commitment, cancellable at any time before the trial ends without
          being charged. Annual subscriptions benefit from 2 months free compared to
          monthly billing.
        </p>

        <h2>5. Credits system</h2>
        <p>
          Certain features (AI generation, translations, image generation) consume credits.
          Credits included in a plan are renewed each billing period and are not carried
          over. Additional credit packs may be purchased at any time; purchased credits
          remain valid for 12 months from the date of purchase.
        </p>

        <h2>6. Pricing and payment</h2>
        <p>
          Prices are shown in euros (€) excluding tax on the pricing page. Applicable VAT
          is added at checkout according to the customer's country. Payment is made by
          credit card through our provider <span translate="no">Stripe</span>. The
          subscription renews automatically at the end of each period (monthly or annual)
          until cancelled by the user.
        </p>

        <h2>7. Invoicing</h2>
        <p>
          An invoice is automatically generated in PDF format and emailed on every
          payment. All invoices are available at any time from the Billing page in your
          workspace. Invoices are retained for 10 years in accordance with French
          accounting obligations.
        </p>

        <h2>8. Cancellation and plan changes</h2>
        <p>
          You can cancel your subscription or change plan at any time from the Billing
          page. Cancellation takes effect at the end of the current billing period. In
          case of downgrade, new limits apply immediately while adjusted billing takes
          effect in the following period. No refund is due for the remaining days of a
          period already started.
        </p>

        <h2>9. Right of withdrawal</h2>
        <p>
          In accordance with article L.221-28 of the French Consumer Code, the right of
          withdrawal does not apply to services fully performed before the end of the
          withdrawal period whose execution began with the consumer's prior express
          consent. The free trial lets you evaluate the service without commitment.
        </p>

        <h2>10. User obligations</h2>
        <p>The user agrees to:</p>
        <ul>
          <li>Not use the service for spam, malware, deceptive or illegal content</li>
          <li>Respect the terms of use of connected third-party platforms (WordPress, Shopify, Google, etc.)</li>
          <li>Not attempt to disrupt, reverse-engineer or compromise the security of the service</li>
          <li>Keep credentials confidential and not share accounts between multiple organizations</li>
          <li>Verify generated content before publication (accuracy, legal compliance, third-party rights)</li>
        </ul>

        <h2>11. Liability</h2>
        <p>
          The service is provided « as is ». <span translate="no">3XVISIBILITY</span> uses
          its best efforts to guarantee availability and performance, but cannot be held
          liable for indirect damages (loss of traffic, loss of business, SEO penalties
          resulting from user practices, actions of third-party platforms) arising from
          use of the service. In all cases, liability is limited to the amounts paid by
          the user during the 12 months preceding the event giving rise to the claim.
        </p>

        <h2>12. Intellectual property</h2>
        <p>
          The user remains the owner of the content they create and publish via
          <span translate="no"> 3XVISIBILITY</span>. The platform, its templates, its code
          and its brand remain the exclusive property of <span translate="no">VERODAV GROUP</span>.
        </p>

        <h2>13. Personal data</h2>
        <p>
          The processing of personal data is described in our{" "}
          <a href="/confidentialite">Privacy Policy</a>, which forms an integral part of
          these GTCS.
        </p>

        <h2>14. Applicable law</h2>
        <p>
          These GTCS are governed by French law. Any dispute falls under the exclusive
          jurisdiction of the courts of <span translate="no">Strasbourg, France</span>,
          unless mandatory legal provisions provide otherwise.
        </p>

        <h2>15. Contact</h2>
        <p>
          For any question relating to these GTCS:{" "}
          <a href="mailto:info@3xvisibility.com" translate="no">info@3xvisibility.com</a>
        </p>
      </StaticPageLayout>
    </>
  );
}
