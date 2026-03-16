import { Upload, GitBranch, Globe, Zap, LayoutTemplate, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
    description: "Drag-and-drop interface to map CSV columns to template variables with instant preview.",
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
    <section id="features" className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Everything you need to generate pages at scale
          </h2>
          <p className="mt-3 text-muted-foreground">
            From CSV upload to live published pages — a complete pipeline in one platform.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map((f) => (
            <Card key={f.title} className="shadow-surface hover:shadow-surface-hover transition-shadow duration-150 bg-background">
              <CardContent className="p-5 md:p-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
