import { ScrollReveal } from "./ScrollReveal";
import { motion } from "framer-motion";
import { FileSpreadsheet, ArrowRight, Layers, Rocket, CheckCircle2 } from "lucide-react";

const showcases = [
  {
    tag: "Import",
    icon: FileSpreadsheet,
    title: "Smart CSV Processing",
    description: "Upload any CSV and our AI auto-detects columns, data types, and suggests optimal mappings. Handle thousands of rows with intelligent validation.",
    highlights: ["Auto-column detection", "Data validation", "Error highlighting", "Batch processing"],
    visual: (
      <div className="rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-4 space-y-2.5">
        {["keyword", "city", "title", "description"].map((col, i) => (
          <motion.div
            key={col}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-center gap-2.5"
          >
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-mono text-primary">{i + 1}</div>
            <div className="flex-1 h-7 rounded-lg bg-muted/60 flex items-center px-2.5 text-[11px] text-muted-foreground font-mono">{col}</div>
            <ArrowRight className="h-3 w-3 text-primary/50" />
            <div className="flex-1 h-7 rounded-lg bg-primary/[0.06] border border-primary/10 flex items-center px-2.5 text-[11px] text-primary font-mono">{`{${col}}`}</div>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    tag: "Build",
    icon: Layers,
    title: "Visual Template Builder",
    description: "Create page templates with a visual editor. Insert dynamic variables anywhere — titles, descriptions, meta tags, body content.",
    highlights: ["Visual editor", "Live preview", "Variable insertion", "SEO meta tags"],
    visual: (
      <div className="rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="h-8 bg-muted/50 flex items-center gap-2 px-3 border-b border-border/30">
          <div className="flex gap-1.5">
            <div className="h-2 w-2 rounded-full bg-destructive/50" />
            <div className="h-2 w-2 rounded-full bg-amber-400/50" />
            <div className="h-2 w-2 rounded-full bg-success/50" />
          </div>
          <span className="text-[9px] text-muted-foreground/50 ml-2">template-editor.html</span>
        </div>
        <div className="p-4 space-y-2 font-mono text-[11px]">
          <div className="text-muted-foreground">&lt;h1&gt;<span className="text-primary font-semibold">{"{title}"}</span>&lt;/h1&gt;</div>
          <div className="text-muted-foreground">&lt;p class="location"&gt;<span className="text-primary font-semibold">{"{city}"}</span>, <span className="text-primary font-semibold">{"{state}"}</span>&lt;/p&gt;</div>
          <div className="text-muted-foreground">&lt;div class="content"&gt;</div>
          <div className="text-muted-foreground pl-4">&lt;p&gt;<span className="text-primary font-semibold">{"{description}"}</span>&lt;/p&gt;</div>
          <div className="text-muted-foreground">&lt;/div&gt;</div>
        </div>
      </div>
    ),
  },
  {
    tag: "Deploy",
    icon: Rocket,
    title: "One-Click Publishing",
    description: "Execute campaigns and watch pages deploy in real-time. Track every page with live progress and instant error feedback.",
    highlights: ["Real-time progress", "Error logging", "Direct page links", "Bulk publish"],
    visual: (
      <div className="rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm p-4 space-y-2.5">
        {[
          { title: "plumber-new-york.html", status: "done" },
          { title: "plumber-los-angeles.html", status: "done" },
          { title: "plumber-chicago.html", status: "done" },
          { title: "plumber-houston.html", status: "progress" },
        ].map((page, i) => (
          <motion.div
            key={page.title}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.15 }}
            className="flex items-center gap-2.5"
          >
            <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${page.status === "done" ? "text-success" : "text-primary animate-pulse"}`} />
            <span className="text-[11px] font-mono text-muted-foreground flex-1">{page.title}</span>
            <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${page.status === "done" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
              {page.status === "done" ? "Published" : "Deploying..."}
            </span>
          </motion.div>
        ))}
      </div>
    ),
  },
];

export function FeatureShowcaseSection() {
  return (
    <section className="py-20 md:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-4 bg-primary/[0.06] rounded-full px-3.5 py-1">
            <Layers className="h-3 w-3" />
            How it works in detail
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-[1.1]">
            Built for{" "}
            <span className="text-gradient-primary">serious SEO teams</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base leading-relaxed max-w-lg mx-auto">
            A powerful pipeline from raw data to published pages in three steps.
          </p>
        </ScrollReveal>

        <div className="space-y-16 md:space-y-24 max-w-4xl mx-auto">
          {showcases.map((item, idx) => (
            <ScrollReveal key={item.tag} direction={idx % 2 === 0 ? "left" : "right"}>
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center ${idx % 2 === 1 ? "lg:[direction:rtl] lg:*:[direction:ltr]" : ""}`}>
                <div>
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary mb-3 bg-primary/[0.06] rounded-full px-3 py-1">
                    <item.icon className="h-3 w-3" />
                    {item.tag}
                  </div>
                  <h3 className="text-xl md:text-2xl font-extrabold tracking-tight mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{item.description}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {item.highlights.map((h) => (
                      <div key={h} className="flex items-center gap-2 text-[13px] text-foreground/80">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -inset-3 bg-gradient-to-br from-primary/8 to-[hsl(var(--primary-glow)/.04)] rounded-2xl blur-2xl opacity-50" />
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
