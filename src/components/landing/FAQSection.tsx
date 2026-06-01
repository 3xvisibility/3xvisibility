import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollReveal } from "./ScrollReveal";
import { useLanguage } from "@/i18n/LanguageContext";

export function FAQSection() {
  const { t } = useLanguage();

  const faqs = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
    { q: t("faq.q5"), a: t("faq.a5") },
    { q: t("faq.q6"), a: t("faq.a6") },
    { q: t("faq.q7"), a: t("faq.a7") },
  ];
  return (
    <section id="faq" className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4 lg:px-8 relative z-10 max-w-3xl">
        <ScrollReveal className="text-center mb-12">
          <span className="section-badge mb-6">{t("faq.badge")}</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">{t("faq.title")}</h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border border-[hsl(96,90%,45%,0.1)] rounded-xl px-5 bg-[hsl(220,40%,8%)] hover:border-[hsl(96,90%,45%,0.2)] transition-colors duration-200 data-[state=open]:border-[hsl(96,90%,45%,0.25)] data-[state=open]:bg-[hsl(220,40%,9%)]">
                <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline py-4 text-foreground">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-[13px] text-[hsl(220,15%,55%)] leading-relaxed pb-4">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollReveal>
      </div>
    </section>
  );
}
