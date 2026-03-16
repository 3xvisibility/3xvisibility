import { Upload, GitBranch, Globe, Zap, LayoutTemplate, BarChart3, Brain, Shield, Rocket } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";
import { motion } from "framer-motion";

const features = [
  {
    icon: Upload,
    title: "CSV Upload & Parsing",
    description: "Upload CSV files with your data — keywords, cities, titles — and the system auto-detects columns for mapping.",
    color: "from-blue-500/20 to-blue-600/5",
    iconColor: "text-blue-500",
  },
  {
    icon: LayoutTemplate,
    title: "Dynamic Templates",
    description: "Build reusable templates with {variable} placeholders. Map any CSV column to any template variable.",
    color: "from-violet-500/20 to-violet-600/5",
    iconColor: "text-violet-500",
  },
  {
    icon: GitBranch,
    title: "Field Mapping",
    description: "Intuitive interface to map CSV columns to template variables with instant preview.",
    color: "from-emerald-500/20 to-emerald-600/5",
    iconColor: "text-emerald-500",
  },
  {
    icon: Zap,
    title: "Bulk Generation",
    description: "Generate hundreds of pages in a single campaign with real-time progress tracking and error logging.",
    color: "from-amber-500/20 to-amber-600/5",
    iconColor: "text-amber-500",
  },
  {
    icon: Globe,
    title: "WordPress & Shopify",
    description: "Publish directly to WordPress via REST API or Shopify via Admin API. Connect unlimited websites.",
    color: "from-cyan-500/20 to-cyan-600/5",
    iconColor: "text-cyan-500",
  },
  {
    icon: BarChart3,
    title: "Campaign Monitoring",
    description: "Track every campaign: progress bars, success rates, live URLs, and detailed error logs per row.",
    color: "from-rose-500/20 to-rose-600/5",
    iconColor: "text-rose-500",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-28 md:py-36 relative">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      {/* Decorative orbs */}
      <div className="absolute top-1/4 -left-[200px] w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-[200px] w-[400px] h-[400px] rounded-full bg-[hsl(var(--primary-glow)/.03)] blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-5 bg-primary/[0.06] rounded-full px-4 py-1.5">
            <Zap className="h-3 w-3" />
            Features
          </span>
          <h2 className="text-3xl md:text-[2.75rem] lg:text-5xl font-extrabold tracking-tight leading-[1.1]">
            Everything you need to{" "}
            <span className="text-gradient-primary">generate pages at scale</span>
          </h2>
          <p className="mt-6 text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto">
            From CSV upload to live published pages — a complete pipeline in one powerful platform.
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {features.map((f) => (
            <StaggerItem key={f.title}>
              <div className="group relative rounded-2xl border border-border/40 bg-background p-8 hover:border-primary/30 hover:shadow-card-hover transition-all duration-500 h-full overflow-hidden">
                {/* Gradient hover effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/10 to-[hsl(var(--primary-glow)/.05)] border border-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg transition-all duration-500">
                    <f.icon className={`h-5.5 w-5.5 ${f.iconColor}`} />
                  </div>
                  <h3 className="font-bold text-base mb-3">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
