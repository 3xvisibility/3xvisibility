import { Badge } from "@/components/ui/badge";

const steps = [
  {
    step: "01",
    title: "Connect your website",
    description: "Add your WordPress or Shopify site credentials. The system validates the API connection and shows a green heartbeat.",
  },
  {
    step: "02",
    title: "Create a template",
    description: "Define your page layout with dynamic {variables} — course names, cities, keywords, or any data point.",
  },
  {
    step: "03",
    title: "Upload CSV & map fields",
    description: "Upload your data CSV. Drag CSV column headers onto template variable slots to create the mapping.",
  },
  {
    step: "04",
    title: "Execute & publish",
    description: "Hit Execute. Watch pages generate in real-time with a live log stream. Published pages get direct links.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 md:py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            Four steps from raw data to published pages.
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-0">
          {steps.map((s, i) => (
            <div key={s.step} className="flex gap-4 md:gap-6">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <Badge className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  {s.step}
                </Badge>
                {i < steps.length - 1 && (
                  <div className="w-px flex-1 bg-border my-2" />
                )}
              </div>

              <div className="pb-8 md:pb-10">
                <h3 className="font-semibold text-base">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
