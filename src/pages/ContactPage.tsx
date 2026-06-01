import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";
import { Mail, MessageSquare, LifeBuoy } from "lucide-react";

export default function ContactPage() {
  return (
    <>
      <Seo
        title="Contact us"
        description="Questions, feedback or partnership inquiries — reach the 3XVISIBILITY team by email. We read every message and reply within one business day."
        path="/contact"
      />
    <StaticPageLayout
      title="Contact us"
      subtitle="Questions, feedback or partnership inquiries — we read every message."
    >
      <div className="not-prose grid gap-4 sm:grid-cols-3">
        <a
          href="mailto:hello@pagegen.app"
          className="rounded-xl border border-[hsl(96,90%,45%,0.12)] bg-[hsl(250,30%,8%,0.4)] p-6 hover:border-[hsl(96,90%,45%,0.3)] transition-colors"
        >
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">Email</h3>
          <p className="text-xs text-[hsl(250,15%,55%)] mt-1">hello@pagegen.app</p>
        </a>
        <a
          href="mailto:support@pagegen.app"
          className="rounded-xl border border-[hsl(96,90%,45%,0.12)] bg-[hsl(250,30%,8%,0.4)] p-6 hover:border-[hsl(96,90%,45%,0.3)] transition-colors"
        >
          <LifeBuoy className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">Support</h3>
          <p className="text-xs text-[hsl(250,15%,55%)] mt-1">support@pagegen.app</p>
        </a>
        <a
          href="mailto:sales@pagegen.app"
          className="rounded-xl border border-[hsl(96,90%,45%,0.12)] bg-[hsl(250,30%,8%,0.4)] p-6 hover:border-[hsl(96,90%,45%,0.3)] transition-colors"
        >
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="mt-3 font-semibold">Sales</h3>
          <p className="text-xs text-[hsl(250,15%,55%)] mt-1">sales@pagegen.app</p>
        </a>
      </div>
      <h2>Response time</h2>
      <p>We aim to reply to all messages within one business day.</p>
    </StaticPageLayout>
  );
}
