import { ScrollReveal } from "./ScrollReveal";
import { motion } from "framer-motion";
import { FileSpreadsheet, ArrowRight, Layers, Rocket, CheckCircle2 } from "lucide-react";

const showcases = [
  {
    tag: "01 — Import",
    icon: FileSpreadsheet,
    title: "Smart CSV Processing",
    description: "Upload any CSV and our system auto-detects columns, data types, and suggests optimal mappings. Handle thousands of rows with validation.",
    highlights: ["Auto-column detection", "Data validation", "Error highlighting", "Batch processing"],
    visual: (
      <div className="rounded-xl border border-border/30 bg-card/60 p-4 space-y-2">
        {["keyword", "city", "title", "description"].map((col, i) => (
          <motion.div
            key={col}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.08 }}
            className="flex items-center gap-2"
          >
            <div className="h-6 w-6 rounded-md bg-primary/8 flex items-center justify-center text-[9px] font-mono text-primary font-bold">{i + 1}</div>
            <div className="flex-1 h-6 rounded-md bg-muted/40 flex items-center px-2 text-[10px] text-muted-foreground font-mono">{col}</div>
            <ArrowRight className="h-2.5 w-2.5 text-primary/40" />
            <div className="flex-1 h-6 rounded-md bg-primary/5 border border-primary/10 flex items-center px-2 text-[10px] text-primary font-mono">{`{${col}}`}</div>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    tag: "02 — Build",
    icon: Layers,
    title: "Visual Template Builder",
    description: "Create page templates with a visual editor. Insert dynamic variables anywhere — titles, meta tags, body content.",
    highlights: ["Visual editor", "Live preview", "Variable insertion", "SEO meta tags"],
    visual: (
      <div className="rounded-xl border border-border/30 bg-card/60 overflow-hidden">
        <div className="h-7 bg-muted/30 flex items-center gap-2 px-3 border-b border-border/20">
          <div className="flex gap-1">
            <div className="h-2 w-2 rounded-full bg-destructive/40" />
            <div className="h-2 w-2 rounded-full bg-amber-400/40" />
            <div className="h-2 w-2 rounded-full bg-success/40" />
          </div>
          <span className="text-[8px] text-muted-foreground/40 ml-2 font-mono">template.html</span>
        </div>
        <div className="p-3 space-y-1.5 font-mono text-[10px]">
          <div className="text-muted-foreground/60">&lt;h1&gt;<span className="text-primary font-semibold">{"{title}"}</span>&lt;/h1&gt;</div>
          <div className="text-muted-foreground/60">&lt;p&gt;<span className="text-primary font-semibold">{"{city}"}</span>, <span className="text-primary font-semibold">{"{state}"}</span>&lt;/p&gt;</div>
          <div className="text-muted-foreground/60">&lt;div&gt;<span className="text-primary font-semibold">{"{description}"}</span>&lt;/div&gt;</div>
        </div>
      </div>
    ),
  },
  {
    tag: "03 — Deploy",
    icon: Rocket,
    title: "One-Click Publishing",
    description: "Execute campaigns and watch pages deploy in real-time. Track every page with live progress and instant error feedback.",
    highlights: ["Real-time progress", "Error logging", "Direct links", "Bulk publish"],
    visual: (
      <div className="rounded-xl border border-border/30 bg-card/60 p-4 space-y-2">
        {[
          { title: "plumber-new-york", status: "done" },
          { title: "plumber-los-angeles", status: "done" },
          { title: "plumber-chicago", status: "done" },
          { title: "plumber-houston", status: "progress" },
        ].map((page, i) => (
          <motion.div
            key={page.title}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="flex items-center gap-2"
          >
            <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${page.status === "done" ? "text-success" : "text-primary animate-pulse"}`} />
            <span className="text-[10px] font-mono text-muted-foreground flex-1 truncate">{page.title}</span>
            <span className={`text-[8px] font-semibold px-2 py-0.5 rounded-full ${page.status === "done" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
              {page.status === "done" ? "Live" : "Deploying"}
            </span>
          </motion.div>
        ))}
      </div>
    ),
  },
];

export function FeatureShowcaseSection() {
  return (
    <section className="py-16 md:py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="space-y-12 md:space-y-16 max-w-4xl mx-auto">
          {showcases.map((item, idx) => (
            <ScrollReveal key={item.tag} direction={idx % 2 === 0 ? "left" : "right"}>
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-center ${idx % 2 === 1 ? "lg:[direction:rtl] lg:*:[direction:ltr]" : ""}`}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70 mb-3 block">{item.tag}</span>
                  <h3 className="text-xl md:text-2xl font-extrabold tracking-[-0.03em] mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{item.description}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {item.highlights.map((h) => (
                      <div key={h} className="flex items-center gap-2 text-[12px] text-foreground/70">
                        <div className="h-1 w-1 rounded-full bg-primary" />
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-br from-primary/6 to-transparent rounded-2xl blur-2xl" />
                  <div className="relative">{item.visual}</div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
