import { useState } from "react";
import { z } from "zod";
import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const channels = [
  { icon: Mail, label: "Email", value: "Support@3xvisibility.com", href: "mailto:Support@3xvisibility.com" },
  { icon: MapPin, label: "Address", value: "21 rue de Cherbourg, 67100 Strasbourg, France", href: undefined },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      toast({ title: result.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSending(true);
    const { name, email, subject, message } = result.data;
    try {
      // Save submission to the in-app inbox (best-effort)
      await supabase
        .from("contact_submissions")
        .insert({ name, email, subject: subject || null, message });

      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contact-notification",
          idempotencyKey: `contact-${email}-${Date.now()}`,
          templateData: { name, email, subject, message },
        },
      });
      if (error) throw error;
      toast({ title: t("contact.success") });
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      toast({ title: t("contact.errorMessage"), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Seo title={t("contact.title")} description={t("contact.metaDesc")} path="/contact" />
      <StaticPageLayout title={t("contact.title")} subtitle={t("contact.subtitle")}>
        <div className="not-prose grid gap-4 sm:grid-cols-2">
          {channels.map(({ icon: Icon, label, value, href }) => {
            const Tag = href ? "a" : "div";
            return (
              <Tag
                key={label}
                {...(href ? { href } : {})}
                className="group rounded-xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-3 font-semibold text-foreground">{label}</h3>
                <p className="text-xs text-muted-foreground mt-1 break-words">{value}</p>
              </Tag>
            );
          })}
        </div>

        <div className="not-prose mt-10 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--primary)/0.06),transparent)] pointer-events-none" />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("contact.formTitle")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("contact.formSubtitle")}</p>

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
