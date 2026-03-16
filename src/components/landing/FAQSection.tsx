import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollReveal } from "./ScrollReveal";
import { HelpCircle } from "lucide-react";

const faqs = [
  { q: "What types of websites can I connect?", a: "Currently we support WordPress (via REST API with Application Passwords) and Shopify (via Admin API). More integrations are coming soon." },
  { q: "How does CSV processing work?", a: "Upload any CSV file — the system auto-detects column headers. You then map each column to a template variable. Each row becomes one generated page." },
  { q: "Can I preview pages before publishing?", a: "Yes. Use the 'Dry Run' option to generate a single preview page before executing the full campaign. This lets you verify the template and mapping are correct." },
  { q: "What happens if a page fails to publish?", a: "Failed pages are logged with detailed error messages (e.g., '401 Unauthorized on Row 12'). You can retry individual failed pages or the entire batch." },
  { q: "Can I use this for SEO landing pages?", a: "Absolutely. PageGen is built for SEO teams generating city pages, service pages, product pages, and location-based content at scale." },
  { q: "Is there an API?", a: "Yes, Pro and Agency plans include API access for programmatic campaign creation and page generation." },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-20 md:py-24 relative">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4 bg-primary/[0.06] rounded-full px-3.5 py-1">
            <HelpCircle className="h-3 w-3" />
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1]">
            Frequently asked{" "}
            <span className="text-gradient-primary">questions</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base leading-relaxed">
            Everything you need to know about PageGen.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.15} className="max-w-xl mx-auto">
          <Accordion type="single" collapsible className="space-y-2.5">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-border/40 rounded-xl px-5 bg-background/60 backdrop-blur-sm hover:border-primary/20 transition-colors duration-200 data-[state=open]:border-primary/25 data-[state=open]:shadow-card-hover"
              >
                <AccordionTrigger className="text-[13px] font-semibold text-left hover:no-underline py-4">
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
