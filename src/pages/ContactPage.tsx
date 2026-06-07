import { useState } from "react";
import { z } from "zod";
import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";
import { Mail, MessageSquare, LifeBuoy, Send } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const channels = [
  { icon: Mail, key: "email" as const },
  { icon: LifeBuoy, key: "support" as const },
  { icon: MessageSquare, key: "sales" as const },
];

export default function ContactPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const schema = z.object({
    name: z.string().trim().nonempty(t("contact.errorName")).max(100),
    email: z.string().trim().email(t("contact.errorEmail")).max(255),
    subject: z.string().trim().max(150).optional(),
    message: z.string().trim().nonempty(t("contact.errorMessage")).max(2000),
  });

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      toast({ title: result.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSending(true);
    const { name, email, subject, message } = result.data;
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    const mailSubject = encodeURIComponent(subject || "Contact request");
    window.location.href = `mailto:info@3xvisibility.com?subject=${mailSubject}&body=${body}`;
    setTimeout(() => {
      setSending(false);
      toast({ title: t("contact.success") });
      setForm({ name: "", email: "", subject: "", message: "" });
    }, 600);
  };

  return (
    <>
      <Seo title={t("contact.title")} description={t("contact.metaDesc")} path="/contact" />
      <StaticPageLayout title={t("contact.title")} subtitle={t("contact.subtitle")}>
        <div className="not-prose grid gap-4 sm:grid-cols-3">
          {channels.map(({ icon: Icon, key }) => (
            <a
              key={key}
              href="mailto:info@3xvisibility.com"
              className="group rounded-xl border border-[hsl(96,90%,45%,0.12)] bg-[hsl(250,30%,8%,0.4)] p-6 hover:border-[hsl(96,90%,45%,0.3)] hover:bg-[hsl(250,30%,10%,0.5)] transition-all"
            >
              <div className="h-10 w-10 rounded-lg bg-[hsl(96,90%,45%,0.1)] border border-[hsl(96,90%,45%,0.15)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-3 font-semibold">{t(`contact.${key}`)}</h3>
              <p className="text-xs text-[hsl(250,15%,55%)] mt-1">info@3xvisibility.com</p>
            </a>
          ))}
        </div>

        <div className="not-prose mt-10 rounded-2xl border border-[hsl(96,90%,45%,0.12)] bg-[hsl(250,30%,8%,0.4)] p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(96,90%,45%,0.07),transparent)] pointer-events-none" />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight">{t("contact.formTitle")}</h2>
            <p className="mt-2 text-sm text-[hsl(250,15%,60%)]">{t("contact.formSubtitle")}</p>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t("contact.nameLabel")}</Label>
                  <Input id="name" value={form.name} onChange={update("name")} placeholder={t("contact.namePlaceholder")} maxLength={100} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">{t("contact.emailLabel")}</Label>
                  <Input id="email" type="email" value={form.email} onChange={update("email")} placeholder={t("contact.emailPlaceholder")} maxLength={255} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subject">{t("contact.subjectLabel")}</Label>
                <Input id="subject" value={form.subject} onChange={update("subject")} placeholder={t("contact.subjectPlaceholder")} maxLength={150} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">{t("contact.messageLabel")}</Label>
                <Textarea id="message" value={form.message} onChange={update("message")} placeholder={t("contact.messagePlaceholder")} rows={5} maxLength={2000} />
              </div>
              <div>
                <Button type="submit" disabled={sending} className="gap-2">
                  <Send className="h-4 w-4" />
                  {sending ? t("contact.sending") : t("contact.send")}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <h2>{t("contact.responseTime")}</h2>
        <p>{t("contact.responseTimeDesc")}</p>
      </StaticPageLayout>
    </>
  );
}
