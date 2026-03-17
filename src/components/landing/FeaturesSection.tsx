import { Upload, GitBranch, Globe, Zap, LayoutTemplate, BarChart3, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

const features: { icon: LucideIcon; title: string; description: string; gradient: string }[] = [
  {
    icon: Upload,
    title: "CSV Upload",
    description: "Drop your CSV — columns auto-detected, validated, and ready to map in seconds.",
    gradient: "from-blue-500/10 to-cyan-500/10",
  },
  {
    icon: LayoutTemplate,
    title: "Dynamic Templates",
    description: "Build reusable templates with {variable} placeholders mapped to any CSV column.",
    gradient: "from-violet-500/10 to-purple-500/10",
  },
  {
    icon: GitBranch,
    title: "Smart Mapping",
    description: "Drag-and-drop field mapping with instant live preview of generated output.",
    gradient: "from-emerald-500/10 to-teal-500/10",
  },
  {
    icon: Zap,
    title: "Bulk Generation",
    description: "Generate hundreds of pages in one campaign with real-time progress tracking.",
    gradient: "from-amber-500/10 to-orange-500/10",
  },
  {
    icon: Globe,
    title: "Multi-Platform Publish",
    description: "Publish to WordPress & Shopify via API. Connect unlimited websites.",
    gradient: "from-pink-500/10 to-rose-500/10",
  },
  {
    icon: BarChart3,
    title: "Campaign Analytics",
    description: "Track progress, success rates, live URLs, and detailed error logs per campaign.",
    gradient: "from-indigo-500/10 to-blue-500/10",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-28 relative">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-4 bg-primary/5 border border-primary/10 rounded-full px-4 py-1">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] leading-tight">
              Everything you need to
              <br />
              <span className="text-muted-foreground">generate at scale</span>
            </h2>
          </motion.div>
        </div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              className="group relative rounded-2xl border border-border/30 bg-card/60 p-6 hover:border-border/60 hover:shadow-lg hover:shadow-primary/5 transition-all duration-500"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
            >
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-sm mb-2">{f.title}</h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
