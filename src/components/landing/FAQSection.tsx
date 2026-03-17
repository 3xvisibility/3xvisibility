import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollReveal } from "./ScrollReveal";

const faqs = [
  { q: "What websites can I connect?", a: "WordPress (via REST API with Application Passwords) and Shopify (via Admin API). More integrations coming soon." },
  { q: "How does CSV processing work?", a: "Upload any CSV — the system auto-detects columns. Map each column to a template variable. Each row becomes one page." },
  { q: "Can I preview before publishing?", a: "Yes. Use 'Dry Run' to generate a preview page before executing the full campaign." },
  { q: "What if a page fails to publish?", a: "Failed pages are logged with detailed errors. Retry individual pages or the entire batch with one click." },
  { q: "Is there an API?", a: "Yes, Pro and Agency plans include API access for programmatic campaign creation and generation." },
  { q: "Can I cancel anytime?", a: "Absolutely. No contracts, no commitments. Cancel your subscription at any time." },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4 lg:px-8 relative z-10 max-w-3xl">
        <ScrollReveal className="text-center mb-12">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-4 bg-primary/5 border border-primary/10 rounded-full px-4 py-1">
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em]">
            Frequently asked questions
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-border/30 rounded-xl px-5 bg-card/50 hover:border-border/50 transition-colors duration-200 data-[state=open]:border-primary/20 data-[state=open]:bg-card/80"
              >
                <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-[13px] text-muted-foreground leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollReveal>
      </div>
    </section>
  );
}
