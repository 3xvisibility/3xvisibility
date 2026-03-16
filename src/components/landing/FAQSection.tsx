import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What types of websites can I connect?",
    a: "Currently we support WordPress (via REST API with Application Passwords) and Shopify (via Admin API). More integrations are coming soon.",
  },
  {
    q: "How does CSV processing work?",
    a: "Upload any CSV file — the system auto-detects column headers. You then map each column to a template variable. Each row becomes one generated page.",
  },
  {
    q: "Can I preview pages before publishing?",
    a: "Yes. Use the 'Dry Run' option to generate a single preview page before executing the full campaign. This lets you verify the template and mapping are correct.",
  },
  {
    q: "What happens if a page fails to publish?",
    a: "Failed pages are logged with detailed error messages (e.g., '401 Unauthorized on Row 12'). You can retry individual failed pages or the entire batch.",
  },
  {
    q: "Can I use this for SEO landing pages?",
    a: "Absolutely. PageGen is built for SEO teams generating city pages, service pages, product pages, and location-based content at scale.",
  },
  {
    q: "Is there an API?",
    a: "Yes, Pro and Agency plans include API access for programmatic campaign creation and page generation.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-20 md:py-28 relative">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-3">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
        </div>

        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="border border-border/50 rounded-xl px-5 bg-background hover:border-primary/20 transition-colors duration-200"
              >
                <AccordionTrigger className="text-sm font-medium text-left hover:no-underline py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
