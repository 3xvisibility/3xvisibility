import { ScrollReveal } from "./ScrollReveal";
import { Globe, FileText, Rocket, Settings2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

export function HowItWorksSection() {
  const { t } = useLanguage();

  const steps = [
    { icon: Globe, titleKey: "howItWorks.step1Title", descKey: "howItWorks.step1Desc", color: "from-blue-500 to-cyan-500" },
    { icon: FileText, titleKey: "howItWorks.step2Title", descKey: "howItWorks.step2Desc", color: "from-violet-500 to-purple-500" },
    { icon: Settings2, titleKey: "howItWorks.step3Title", descKey: "howItWorks.step3Desc", color: "from-amber-500 to-orange-500" },
    { icon: Rocket, titleKey: "howItWorks.step4Title", descKey: "howItWorks.step4Desc", color: "from-emerald-500 to-teal-500" },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-4 bg-primary/5 border border-primary/10 rounded-full px-4 py-1">
            {t("howItWorks.badge")}
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em]">
            {t("howItWorks.title")}
          </h2>
        </ScrollReveal>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {steps.map((s, i) => (
            <motion.div
              key={s.titleKey}
              className="relative rounded-2xl border border-border/30 bg-card/50 p-6 text-center hover:border-border/60 hover:shadow-lg hover:shadow-primary/5 transition-all duration-500 group"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
            >
              <div className="text-5xl font-black text-foreground/[0.04] absolute top-3 right-4 select-none">
                {i + 1}
              </div>
              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 opacity-80`}>
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-bold text-sm mb-2">{t(s.titleKey)}</h3>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{t(s.descKey)}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
