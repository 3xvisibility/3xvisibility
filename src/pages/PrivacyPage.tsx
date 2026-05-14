import { StaticPageLayout } from "@/components/landing/StaticPageLayout";

export default function PrivacyPage() {
  return (
    <StaticPageLayout title="Privacy Policy" subtitle="Last updated: May 2026">
      <h2>Overview</h2>
      <p>
        This Privacy Policy explains how PageGen ("we", "us") collects, uses and
        protects information when you use our service.
      </p>
      <h2>Data we collect</h2>
      <ul>
        <li>Account information (name, email, workspace)</li>
        <li>Content you create (templates, campaigns, generated pages)</li>
        <li>Connection credentials for third-party platforms (encrypted at rest)</li>
        <li>Usage analytics to improve the product</li>
      </ul>
      <h2>How we use data</h2>
      <p>
        We use your data to operate the service, generate and publish pages on your
        behalf, provide support and improve PageGen. We never sell your data.
      </p>
      <h2>Data storage</h2>
      <p>
        Data is stored on secure cloud infrastructure with row-level access control.
        You can export or delete your data at any time from workspace settings.
      </p>
      <h2>Contact</h2>
      <p>
        Privacy questions: <a href="mailto:privacy@pagegen.app">privacy@pagegen.app</a>
      </p>
    </StaticPageLayout>
  );
}
