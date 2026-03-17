import { Upload, GitBranch, Globe, Zap, LayoutTemplate, BarChart3, type LucideIcon } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { motion } from "framer-motion";

const features: { icon: LucideIcon; title: string; description: string; span?: string }[] = [
  {
    icon: Upload,
    title: "CSV Upload",
    description: "Upload CSV files with your data — keywords, cities, titles — auto-detected and validated instantly.",
    span: "md:col-span-2",
  },
  {
    icon: LayoutTemplate,
    title: "Dynamic Templates",
    description: "Build reusable templates with {variable} placeholders mapped to any CSV column.",
  },
  {
    icon: GitBranch,
    title: "Field Mapping",
    description: "Intuitive drag-and-drop interface to map CSV columns to template variables with instant preview.",
  },
  {
    icon: Zap,
    title: "Bulk Generation",
    description: "Generate hundreds of pages in a single campaign with real-time progress and error logging.",
  },
  {
    icon: Globe,
    title: "WordPress & Shopify",
    description: "Publish directly via REST API or Admin API. Connect unlimited websites.",
    span: "md:col-span-2",
  },
  {
    icon: BarChart3,
    title: "Campaign Monitoring",
    description: "Track every campaign: progress, success rates, live URLs, and detailed error logs.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 md:py-20 relative">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary mb-3 block">Features</span>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.04em] leading-[1.05]">
                Everything you need
                <br />
                <span className="text-muted-foreground">to generate at scale.</span>
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              From CSV upload to live published pages — a complete pipeline in one platform.
            </p>
          </div>
        </ScrollReveal>

        {/* Bento Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              className={`group relative rounded-2xl border border-border/30 bg-card/50 p-6 hover:border-primary/25 hover:bg-card/80 transition-all duration-500 ${f.span || ""}`}
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
            >
              <div className="h-10 w-10 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/12 group-hover:scale-105 transition-all duration-500">
                <f.icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <h3 className="font-bold text-sm mb-1.5">{f.title}</h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
