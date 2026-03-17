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
    <section id="features" className="py-20 md:py-28 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_0%,hsl(217,91%,60%,0.06),transparent)] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span className="section-badge mb-6">
              <Sparkles className="h-3 w-3" />
              {t("features.badge")}
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-tight">
              {t("features.title1")}<br />
              <span className="text-gradient-primary">{t("features.title2")}</span>
            </h2>
          </motion.div>
        </div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        >
          {featureConfigs.map((f) => (
            <motion.div
              key={f.titleKey}
              className="group relative rounded-2xl border border-[hsl(217,91%,60%,0.1)] bg-[hsl(220,40%,8%)] p-6 hover:border-[hsl(217,91%,60%,0.25)] transition-all duration-500 hover:bg-[hsl(220,40%,9%)]"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
              whileHover={{ y: -4 }}
            >
              <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_center,hsl(217,91%,60%,0.04),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative z-10">
                <div className="h-11 w-11 rounded-xl bg-[hsl(217,91%,60%,0.1)] border border-[hsl(217,91%,60%,0.15)] flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[hsl(217,91%,60%,0.15)] transition-all duration-300">
                  <f.icon className="h-5 w-5 text-[hsl(217,91%,68%)]" />
                </div>
                <h3 className="font-bold text-sm mb-2 text-foreground">{t(f.titleKey)}</h3>
                <p className="text-[13px] text-[hsl(220,15%,50%)] leading-relaxed">{t(f.descKey)}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Sparkles({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
    </svg>
  );
}
