import { ScrollReveal } from "./ScrollReveal";
import { Globe, FileText, Rocket, Settings2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

export function HowItWorksSection() {
  const { t } = useLanguage();

  const steps = [
    { icon: Globe, titleKey: "howItWorks.step1Title", descKey: "howItWorks.step1Desc" },
    { icon: FileText, titleKey: "howItWorks.step2Title", descKey: "howItWorks.step2Desc" },
    { icon: Settings2, titleKey: "howItWorks.step3Title", descKey: "howItWorks.step3Desc" },
    { icon: Rocket, titleKey: "howItWorks.step4Title", descKey: "howItWorks.step4Desc" },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_30%_at_50%_100%,hsl(262,83%,58%,0.06),transparent)] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-14">
          <span className="section-badge mb-6">
            {t("howItWorks.badge")}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">
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
              className="relative rounded-2xl border border-[hsl(262,83%,58%,0.1)] bg-[hsl(252,25%,10%)] p-6 text-center hover:border-[hsl(262,83%,58%,0.25)] transition-all duration-500 group"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
              whileHover={{ y: -4 }}
            >
              {/* Step number watermark */}
              <div className="text-5xl font-black text-[hsl(262,83%,58%,0.05)] absolute top-3 right-4 select-none">
                {i + 1}
              </div>
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[hsl(262,83%,58%,0.15)] to-[hsl(280,80%,65%,0.1)] border border-[hsl(262,83%,58%,0.2)] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <s.icon className="h-5 w-5 text-[hsl(262,83%,68%)]" />
              </div>
              <h3 className="font-bold text-sm mb-2">{t(s.titleKey)}</h3>
              <p className="text-[12px] text-[hsl(250,15%,50%)] leading-relaxed">{t(s.descKey)}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
