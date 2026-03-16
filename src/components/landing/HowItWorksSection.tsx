import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";

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
    description: "Upload your data CSV. Map column headers to template variable slots to create the mapping.",
  },
  {
    step: "04",
    title: "Execute & publish",
    description: "Hit Execute. Watch pages generate in real-time with a live log stream. Published pages get direct links.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[hsl(var(--primary-glow)/.04)] blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">
            How it works
          </span>
          <h2 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-tight">
            Four steps to{" "}
            <span className="text-gradient-primary">published pages</span>
          </h2>
          <p className="mt-5 text-muted-foreground text-base leading-relaxed">
            From raw data to live content in minutes.
          </p>
        </ScrollReveal>

        <StaggerContainer className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          {steps.map((s) => (
            <StaggerItem key={s.step}>
              <div className="relative group rounded-2xl border border-border/40 bg-background p-7 hover:border-primary/25 hover:shadow-card-hover transition-all duration-300 h-full">
                {/* Step number watermark */}
                <span className="absolute top-5 right-6 text-[3rem] font-extrabold text-foreground/[0.03] leading-none select-none">
                  {s.step}
                </span>
                <div className="flex items-center gap-3 mb-4 relative z-10">
                  <span className="h-9 w-9 rounded-full bg-primary/[0.1] flex items-center justify-center text-xs font-bold text-primary">
                    {s.step}
                  </span>
                  <h3 className="font-semibold text-[0.95rem]">{s.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-12 relative z-10">{s.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
