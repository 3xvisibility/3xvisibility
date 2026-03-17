import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollReveal } from "./ScrollReveal";

const faqs = [
  { q: "What types of websites can I connect?", a: "Currently we support WordPress (via REST API with Application Passwords) and Shopify (via Admin API). More integrations are coming soon." },
  { q: "How does CSV processing work?", a: "Upload any CSV file — the system auto-detects column headers. You then map each column to a template variable. Each row becomes one generated page." },
  { q: "Can I preview pages before publishing?", a: "Yes. Use the 'Dry Run' option to generate a single preview page before executing the full campaign." },
  { q: "What happens if a page fails to publish?", a: "Failed pages are logged with detailed error messages. You can retry individual failed pages or the entire batch." },
  { q: "Can I use this for SEO landing pages?", a: "Absolutely. PageGen is built for SEO teams generating city pages, service pages, product pages, and location-based content at scale." },
  { q: "Is there an API?", a: "Yes, Pro and Agency plans include API access for programmatic campaign creation and page generation." },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-16 md:py-20 relative">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="lg:sticky lg:top-24">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary mb-3 block">FAQ</span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.04em] leading-[1.05]">
                Common
                <br />
                <span className="text-muted-foreground">questions.</span>
              </h2>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-sm">
                Everything you need to know about PageGen. Can't find your answer? Reach out to our team.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <Accordion type="single" collapsible className="space-y-2">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="border border-border/30 rounded-xl px-4 bg-card/40 hover:border-primary/20 transition-colors duration-200 data-[state=open]:border-primary/25"
                >
                  <AccordionTrigger className="text-[13px] font-semibold text-left hover:no-underline py-3.5">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[12px] text-muted-foreground leading-relaxed pb-3.5">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
