import { ScrollReveal } from "./ScrollReveal";
import { Globe, FileText, Rocket, Settings2 } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  { icon: Globe, title: "Connect your website", description: "Add your WordPress or Shopify credentials. API connection validated instantly." },
  { icon: FileText, title: "Create a template", description: "Define your page layout with dynamic {variables} — any data point." },
  { icon: Settings2, title: "Upload CSV & map", description: "Upload data. Map column headers to template variable slots." },
  { icon: Rocket, title: "Execute & publish", description: "Hit execute. Watch pages generate in real-time with live logging." },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 md:py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="mb-12">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary mb-3 block">Process</span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.04em] leading-[1.05]">
            Four steps to
            <br />
            <span className="text-muted-foreground">published pages.</span>
          </h2>
        </ScrollReveal>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              className="group relative rounded-2xl border border-border/30 bg-card/50 p-5 hover:border-primary/25 transition-all duration-500"
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
            >
              <span className="text-[4rem] font-extrabold text-foreground/[0.03] leading-none absolute top-2 right-3 select-none">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="relative z-10">
                <div className="h-9 w-9 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-500">
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-bold text-sm mb-1.5">{s.title}</h3>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
