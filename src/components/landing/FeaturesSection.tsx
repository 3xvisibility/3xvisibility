import { Upload, GitBranch, Globe, Zap, LayoutTemplate, BarChart3, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

interface FeatureConfig {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  accent: string;
}

const featureConfigs: FeatureConfig[] = [
  { icon: Upload, titleKey: "features.csvUpload", descKey: "features.csvUploadDesc", accent: "hsl(96,67%,48%)" },
  { icon: LayoutTemplate, titleKey: "features.dynamicTemplates", descKey: "features.dynamicTemplatesDesc", accent: "hsl(160,70%,42%)" },
  { icon: GitBranch, titleKey: "features.smartMapping", descKey: "features.smartMappingDesc", accent: "hsl(210,80%,55%)" },
  { icon: Zap, titleKey: "features.bulkGeneration", descKey: "features.bulkGenerationDesc", accent: "hsl(280,75%,60%)" },
  { icon: Globe, titleKey: "features.multiPlatform", descKey: "features.multiPlatformDesc", accent: "hsl(35,90%,50%)" },
  { icon: BarChart3, titleKey: "features.campaignAnalytics", descKey: "features.campaignAnalyticsDesc", accent: "hsl(340,75%,55%)" },
];

export function FeaturesSection() {
  const { t } = useLanguage();

  return (
    <section id="features" className="py-20 md:py-28 relative overflow-hidden">
      {/* Dark band background — unique among landing sections */}
      <div className="absolute inset-0 bg-[hsl(250,35%,7%)]" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(96,67%,48%,1) 1px, transparent 1px), linear-gradient(90deg, hsl(96,67%,48%,1) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,hsl(96,67%,48%,0.12),transparent)]" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        {/* Header — light text on dark band */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[hsl(96,67%,65%)] bg-[hsl(96,67%,48%,0.14)] border border-[hsl(96,67%,48%,0.3)] rounded-full px-4 py-1.5 mb-6">
              {t("features.badge")}
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] leading-tight text-white">
              {t("features.title1")}<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(96,67%,55%)] via-[hsl(96,80%,65%)] to-[hsl(96,67%,50%)]">{t("features.title2")}</span>
            </h2>
          </motion.div>
        </div>

        {/* Bento grid: first card spans 2 cols — asymmetric layout unique to this section */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
        >
          {featureConfigs.map((f, idx) => (
            <motion.div
              key={f.titleKey}
              className={`group relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 overflow-hidden transition-all duration-500 hover:border-[hsl(96,67%,48%,0.4)] hover:bg-white/[0.07] ${idx === 0 ? "sm:col-span-2" : ""}`}
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
              }}
              whileHover={{ y: -6 }}
            >
              {/* Per-card accent glow on hover */}
              <div
                className="absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-0 group-hover:opacity-25 transition-opacity duration-700 pointer-events-none"
                style={{ background: f.accent }}
              />
              {/* Left accent rail — appears on hover */}
              <div
                className="absolute left-0 top-6 bottom-6 w-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `linear-gradient(to bottom, ${f.accent}, transparent)` }}
              />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-5">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                    style={{ background: `${f.accent}1f`, border: `1px solid ${f.accent}40` }}
                  >
                    <f.icon className="h-5 w-5" style={{ color: f.accent }} />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-white/20 group-hover:text-white/35 transition-colors">
                    0{idx + 1}
                  </span>
                </div>
                <h3 className="font-bold text-[15px] mb-2 text-white">{t(f.titleKey)}</h3>
                <p className={`text-[13px] text-white/55 leading-relaxed ${idx === 0 ? "max-w-sm" : ""}`}>{t(f.descKey)}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
