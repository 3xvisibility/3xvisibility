import { Upload, GitBranch, Globe, Zap, LayoutTemplate, BarChart3 } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";

const features = [
  {
    icon: Upload,
    title: "CSV Upload & Parsing",
    description: "Upload CSV files with your data — keywords, cities, titles — and the system auto-detects columns for mapping.",
  },
  {
    icon: LayoutTemplate,
    title: "Dynamic Templates",
    description: "Build reusable templates with {variable} placeholders. Map any CSV column to any template variable.",
  },
  {
    icon: GitBranch,
    title: "Field Mapping",
    description: "Intuitive interface to map CSV columns to template variables with instant preview.",
  },
  {
    icon: Zap,
    title: "Bulk Generation",
    description: "Generate hundreds of pages in a single campaign with real-time progress tracking and error logging.",
  },
  {
    icon: Globe,
    title: "WordPress & Shopify",
    description: "Publish directly to WordPress via REST API or Shopify via Admin API. Connect unlimited websites.",
  },
  {
    icon: BarChart3,
    title: "Campaign Monitoring",
    description: "Track every campaign: progress bars, success rates, live URLs, and detailed error logs per row.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 md:py-32 relative">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4">
            Features
          </span>
          <h2 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-tight">
            Everything you need to{" "}
            <span className="text-gradient-primary">generate pages at scale</span>
          </h2>
          <p className="mt-5 text-muted-foreground text-base leading-relaxed">
            From CSV upload to live published pages — a complete pipeline in one platform.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {features.map((f) => (
            <StaggerItem key={f.title}>
              <div className="group relative rounded-2xl border border-border/40 bg-background p-7 hover:border-primary/25 hover:shadow-card-hover transition-all duration-300 h-full">
                <div className="h-11 w-11 rounded-xl bg-primary/[0.08] flex items-center justify-center mb-5 group-hover:bg-primary/[0.12] transition-colors duration-300">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-[0.95rem] mb-2.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
