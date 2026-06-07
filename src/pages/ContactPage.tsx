import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";
import { Mail, MessageSquare, LifeBuoy } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ContactPage() {
  const { t } = useLanguage();

  return (
    <>
      <Seo
        title={t("contact.title")}
        description={t("contact.metaDesc")}
        path="/contact"
      />
      <StaticPageLayout
        title={t("contact.title")}
        subtitle={t("contact.subtitle")}
      >
        <div className="not-prose grid gap-4 sm:grid-cols-3">
          <a
            href="mailto:info@3xvisibility.com"
            className="rounded-xl border border-[hsl(96,90%,45%,0.12)] bg-[hsl(250,30%,8%,0.4)] p-6 hover:border-[hsl(96,90%,45%,0.3)] transition-colors"
          >
            <Mail className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-semibold">{t("contact.email")}</h3>
            <p className="text-xs text-[hsl(250,15%,55%)] mt-1">info@3xvisibility.com</p>
          </a>
          <a
            href="mailto:info@3xvisibility.com"
            className="rounded-xl border border-[hsl(96,90%,45%,0.12)] bg-[hsl(250,30%,8%,0.4)] p-6 hover:border-[hsl(96,90%,45%,0.3)] transition-colors"
          >
            <LifeBuoy className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-semibold">{t("contact.support")}</h3>
            <p className="text-xs text-[hsl(250,15%,55%)] mt-1">info@3xvisibility.com</p>
          </a>
          <a
            href="mailto:info@3xvisibility.com"
            className="rounded-xl border border-[hsl(96,90%,45%,0.12)] bg-[hsl(250,30%,8%,0.4)] p-6 hover:border-[hsl(96,90%,45%,0.3)] transition-colors"
          >
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-semibold">{t("contact.sales")}</h3>
            <p className="text-xs text-[hsl(250,15%,55%)] mt-1">info@3xvisibility.com</p>
          </a>
        </div>
        <h2>{t("contact.responseTime")}</h2>
        <p>{t("contact.responseTimeDesc")}</p>
      </StaticPageLayout>
    </>
  );
}
