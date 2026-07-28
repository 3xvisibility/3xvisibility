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
      <StaticPageLayout title="General Terms and Conditions of Sale" subtitle="Last updated: July 2026">
        <h2>1. Purpose</h2>
        <p>
          These General Terms and Conditions of Sale (GTCS) govern the provision by 3XVISIBILITY
          of its SaaS platform for generating, SEO-optimizing and automatically publishing web
          pages on WordPress, Shopify, PrestaShop, WooCommerce and via HTML/CSS.
        </p>

        <h2>2. Publisher</h2>
        <p>
          The service is published by 3XVISIBILITY. Any question can be sent to
          <a href="mailto:info@3xvisibility.com"> info@3xvisibility.com</a>.
        </p>

        <h2>3. Subscription</h2>
        <p>
          Access to paid features is provided through a monthly or annual subscription
          (Starter, Pro, Agency plans). Every new subscriber gets a 30-day free trial,
          with no commitment, cancellable at any time before the trial ends without
          being charged.
        </p>

        <h2>4. Pricing and payment</h2>
        <p>
          Prices are shown in euros excluding tax on the pricing page. Payment is made
          by credit card through our provider Stripe. The subscription renews automatically
          at the end of each period (monthly or annual) until cancelled by the user.
        </p>

        <h2>5. Invoicing</h2>
        <p>
          An invoice is automatically generated and emailed on every payment. All invoices
          are available from the Billing page in your workspace.
        </p>

        <h2>6. Cancellation and plan changes</h2>
        <p>
          You can cancel your subscription or change plan at any time from the Billing page.
          Cancellation takes effect at the end of the current billing period. In case of
          downgrade, new limits apply immediately while adjusted billing takes effect in the
          following period.
        </p>

        <h2>7. Right of withdrawal</h2>
        <p>
          In accordance with article L.221-28 of the French Consumer Code, the right of
          withdrawal does not apply to services fully performed before the end of the
          withdrawal period whose execution began with the consumer's prior express
          consent. The 30-day free trial lets you evaluate the service without commitment.
        </p>

        <h2>8. User obligations</h2>
        <ul>
          <li>Do not use the service for spam, malware or illegal content</li>
          <li>Respect the terms of use of connected third-party platforms
              (WordPress, Shopify, Google, etc.)</li>
          <li>Do not attempt to disrupt, reverse-engineer or compromise the security of the service</li>
          <li>Keep your credentials confidential</li>
        </ul>

        <h2>9. Liability</h2>
        <p>
          The service is provided "as is". 3XVISIBILITY uses its best efforts to guarantee
          service availability and performance, but cannot be held liable for indirect
          damages (loss of traffic, loss of business, SEO penalties resulting from user
          practices) arising from use of the service.
        </p>

        <h2>10. Intellectual property</h2>
        <p>
          The user remains the owner of the content they create and publish via 3XVISIBILITY.
          The platform, its templates, its code and its brand remain the exclusive property
          of 3XVISIBILITY.
        </p>

        <h2>11. Applicable law</h2>
        <p>
          These GTCS are governed by French law. Any dispute falls under the exclusive
          jurisdiction of French courts.
        </p>

        <h2>12. Contact</h2>
        <p>
          For any question relating to these GTCS:
          <a href="mailto:info@3xvisibility.com"> info@3xvisibility.com</a>
        </p>
      </StaticPageLayout>
    </>
  );
}
