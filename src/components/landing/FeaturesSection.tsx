import { Upload, GitBranch, Globe, Zap, LayoutTemplate, BarChart3, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

interface FeatureConfig {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}

const featureConfigs: FeatureConfig[] = [
  { icon: Upload, titleKey: "features.csvUpload", descKey: "features.csvUploadDesc" },
  { icon: LayoutTemplate, titleKey: "features.dynamicTemplates", descKey: "features.dynamicTemplatesDesc" },
  { icon: GitBranch, titleKey: "features.smartMapping", descKey: "features.smartMappingDesc" },
  { icon: Zap, titleKey: "features.bulkGeneration", descKey: "features.bulkGenerationDesc" },
  { icon: Globe, titleKey: "features.multiPlatform", descKey: "features.multiPlatformDesc" },
  { icon: BarChart3, titleKey: "features.campaignAnalytics", descKey: "features.campaignAnalyticsDesc" },
];

export function FeaturesSection() {
  const { t } = useLanguage();

  return (
    <section id="features" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_0%,hsl(96,67%,48%,0.06),transparent)] pointer-events-none" />
      {/* Soft diagonal accent stripe — unique to this section */}
      <div
        className="absolute inset-y-0 right-0 w-1/3 opacity-[0.03] pointer-events-none"
        style={{
          background: "linear-gradient(135deg, hsl(96,67%,48%) 0%, transparent 60%)",
        }}
      />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Header — matches other sections' light style */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span className="section-badge mb-6">{t("features.badge")}</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-tight">
              {t("features.title1")}<br />
              <span className="text-gradient-primary">{t("features.title2")}</span>
            </h2>
          </motion.div>
        </div>

        {/* Two-column feature grid with connecting accent line */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        >
          {featureConfigs.map((f, idx) => (
            <motion.div
              key={f.titleKey}
              className="group relative"
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
              }}
            >
              {/* Numbered index badge — unique element for this section */}
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-11 w-11 rounded-xl bg-[hsl(96,67%,48%,0.1)] border border-[hsl(96,67%,48%,0.15)] flex items-center justify-center group-hover:scale-110 group-hover:bg-[hsl(96,67%,48%,0.15)] transition-all duration-300">
                    <f.icon className="h-5 w-5 text-[hsl(96,67%,35%)]" />
                  </div>
                  <span className="text-2xl font-extrabold tracking-tight text-[hsl(96,67%,48%,0.15)] group-hover:text-[hsl(96,67%,48%,0.3)] transition-colors duration-300 select-none">
                    0{idx + 1}
                  </span>
                </div>

                {/* Card body with subtle border and hover accent */}
                <div className="rounded-2xl border border-[hsl(96,67%,48%,0.1)] bg-[hsl(250,30%,98%)] p-5 transition-all duration-500 group-hover:border-[hsl(96,67%,48%,0.3)] group-hover:shadow-[0_8px_30px_-8px_hsl(96,67%,48%,0.15)] group-hover:-translate-y-1">
                  <h3 className="font-bold text-sm mb-2 text-foreground">{t(f.titleKey)}</h3>
                  <p className="text-[13px] text-[hsl(220,12%,42%)] leading-relaxed">{t(f.descKey)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
