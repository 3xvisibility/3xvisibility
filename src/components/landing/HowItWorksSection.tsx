import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";
import { Globe, FileText, ArrowRight, Rocket, Settings2 } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Globe,
    title: "Connect your website",
    description: "Add your WordPress or Shopify site credentials. The system validates the API connection and shows a green heartbeat.",
  },
  {
    step: "02",
    icon: FileText,
    title: "Create a template",
    description: "Define your page layout with dynamic {variables} — course names, cities, keywords, or any data point.",
  },
  {
    step: "03",
    icon: Settings2,
    title: "Upload CSV & map fields",
    description: "Upload your data CSV. Map column headers to template variable slots to create the mapping.",
  },
  {
    step: "04",
    icon: Rocket,
    title: "Execute & publish",
    description: "Hit Execute. Watch pages generate in real-time with a live log stream. Published pages get direct links.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 md:py-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[hsl(var(--primary-glow)/.04)] blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4 bg-primary/[0.06] rounded-full px-3.5 py-1">
            <ArrowRight className="h-3 w-3" />
            How it works
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1]">
            Four steps to{" "}
            <span className="text-gradient-primary">published pages</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base leading-relaxed">
            From raw data to live content in minutes.
          </p>
        </ScrollReveal>

        <StaggerContainer className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((s) => (
            <StaggerItem key={s.step}>
              <div className="relative group rounded-2xl border border-border/40 bg-background/60 backdrop-blur-sm p-6 hover:border-primary/30 hover:shadow-card-hover transition-all duration-500 h-full overflow-hidden">
                <span className="absolute top-3 right-4 text-[3rem] font-extrabold text-foreground/[0.03] leading-none select-none">
                  {s.step}
                </span>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/15 to-[hsl(var(--primary-glow)/.08)] border border-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                      <s.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-primary/60">Step {s.step}</span>
                      <h3 className="font-bold text-sm">{s.title}</h3>
                    </div>
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
