import { Upload, GitBranch, Globe, Zap, LayoutTemplate, BarChart3 } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";

const features = [
  {
    icon: Upload,
    title: "CSV Upload & Parsing",
    description: "Upload CSV files with your data — keywords, cities, titles — and the system auto-detects columns for mapping.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: LayoutTemplate,
    title: "Dynamic Templates",
    description: "Build reusable templates with {variable} placeholders. Map any CSV column to any template variable.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: GitBranch,
    title: "Field Mapping",
    description: "Intuitive interface to map CSV columns to template variables with instant preview.",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Zap,
    title: "Bulk Generation",
    description: "Generate hundreds of pages in a single campaign with real-time progress tracking and error logging.",
    color: "from-emerald-500 to-green-500",
  },
  {
    icon: Globe,
    title: "WordPress & Shopify",
    description: "Publish directly to WordPress via REST API or Shopify via Admin API. Connect unlimited websites.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: BarChart3,
    title: "Campaign Monitoring",
    description: "Track every campaign: progress bars, success rates, live URLs, and detailed error logs per row.",
    color: "from-indigo-500 to-blue-500",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-28 relative">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-3">Features</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Everything you need to{" "}
            <span className="text-gradient-primary">generate pages at scale</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base">
            From CSV upload to live published pages — a complete pipeline in one platform.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map((f) => (
            <StaggerItem key={f.title}>
              <div className="group relative rounded-xl border border-border/50 bg-background p-6 md:p-7 hover:border-primary/30 hover:shadow-card-hover transition-all duration-300 h-full">
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
