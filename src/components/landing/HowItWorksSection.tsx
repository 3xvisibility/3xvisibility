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
    <section id="how-it-works" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[hsl(var(--primary-glow)/.04)] blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-3">How it works</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Four steps to{" "}
            <span className="text-gradient-primary">published pages</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base">
            From raw data to live content in minutes.
          </p>
        </ScrollReveal>

        <StaggerContainer className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((s, i) => (
            <StaggerItem key={s.step}>
              <div className="relative group rounded-xl border border-border/50 bg-background p-6 hover:border-primary/30 hover:shadow-card-hover transition-all duration-300 h-full">
                <div className="flex items-center gap-3 mb-3">
                  <span className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20">
                    {s.step}
                  </span>
                  <h3 className="font-semibold text-base">{s.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-[52px]">{s.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
