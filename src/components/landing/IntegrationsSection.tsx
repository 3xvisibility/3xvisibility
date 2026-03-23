import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { ScrollReveal } from "./ScrollReveal";
import { Globe, ShoppingCart, Store, Search, FileText, BarChart3 } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const leftItems = [
  { name: "WordPress", icon: Globe },
  { name: "Shopify", icon: ShoppingCart },
  { name: "WooCommerce", icon: Store },
];

export function IntegrationsSection() {
  const { t } = useLanguage();

  const rightItems = [
    { name: "PrestaShop", icon: FileText },
    { name: t("integrations.googleIndex"), icon: Search },
    { name: t("integrations.analytics"), icon: BarChart3 },
  ];

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(217,91%,60%) 1px, transparent 1px), linear-gradient(90deg, hsl(217,91%,60%) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_50%_55%,hsl(217,91%,60%,0.08),transparent)] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16 md:mb-20">
            <div className="section-badge mx-auto mb-5">
              <span>✦</span><span>{t("integrations.badge")}</span><span>✦</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.04em]">
              {t("integrations.title1")}{" "}<span className="text-gradient-primary">{t("integrations.title2")}</span>
            </h2>
            <p className="mt-4 text-sm md:text-base text-[hsl(220,15%,50%)] max-w-lg mx-auto leading-relaxed">
              {t("integrations.description")}
            </p>
          </div>
        </ScrollReveal>

        <div className="relative max-w-5xl mx-auto hidden md:block" style={{ height: 420 }}>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 420" fill="none" preserveAspectRatio="xMidYMid meet">
            {[
              { d: "M160,100 C280,100 320,210 420,210", delay: 0.5 },
              { d: "M120,210 C280,210 320,210 420,210", delay: 0.6 },
              { d: "M200,320 C320,320 360,210 420,210", delay: 0.7 },
              { d: "M840,100 C720,100 680,210 580,210", delay: 0.5 },
              { d: "M880,210 C720,210 680,210 580,210", delay: 0.6 },
              { d: "M800,320 C680,320 640,210 580,210", delay: 0.7 },
            ].map((p, i) => (
              <motion.path key={i} d={p.d} stroke="hsl(217,91%,60%,0.15)" strokeWidth="1.5" fill="none" initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: p.delay, duration: 0.8, ease }} />
            ))}
          </svg>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="absolute -inset-16 bg-[radial-gradient(circle,hsl(217,91%,60%,0.12),transparent_70%)] rounded-full blur-2xl" />
            <motion.div initial={{ opacity: 0, scaleX: 0 }} whileInView={{ opacity: 1, scaleX: 1 }} viewport={{ once: true }} transition={{ delay: 0.8, duration: 0.6, ease }} className="absolute top-1/2 -translate-y-1/2 right-full mr-0 w-[200px] h-[2px] origin-right">
              <div className="h-full bg-gradient-to-l from-[hsl(217,91%,60%,0.6)] via-[hsl(217,91%,60%,0.15)] to-transparent" />
              <div className="absolute inset-y-0 right-0 w-8 h-[6px] -translate-y-[2px] bg-[hsl(217,91%,60%,0.4)] blur-sm" />
            </motion.div>
            <motion.div initial={{ opacity: 0, scaleX: 0 }} whileInView={{ opacity: 1, scaleX: 1 }} viewport={{ once: true }} transition={{ delay: 0.8, duration: 0.6, ease }} className="absolute top-1/2 -translate-y-1/2 left-full ml-0 w-[200px] h-[2px] origin-left">
              <div className="h-full bg-gradient-to-r from-[hsl(217,91%,60%,0.6)] via-[hsl(217,91%,60%,0.15)] to-transparent" />
              <div className="absolute inset-y-0 left-0 w-8 h-[6px] -translate-y-[2px] bg-[hsl(217,91%,60%,0.4)] blur-sm" />
            </motion.div>
            <motion.div animate={{ scale: [1, 1.35, 1], opacity: [0.25, 0, 0.25] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute -inset-5 rounded-[22px] border border-[hsl(217,91%,60%,0.2)]" />
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0, 0.15] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.6 }} className="absolute -inset-3 rounded-[20px] border border-[hsl(217,91%,60%,0.15)]" />
            <motion.div initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.3, ease }} className="relative h-[130px] w-[130px] rounded-2xl bg-gradient-to-b from-[hsl(217,91%,50%)] to-[hsl(220,70%,30%)] flex items-center justify-center shadow-[0_0_80px_hsl(217,91%,60%,0.35),0_0_30px_hsl(217,91%,60%,0.2)] border border-[hsl(217,91%,70%,0.2)]">
              <div className="absolute -top-[3px] left-1/3 h-1.5 w-1.5 rounded-full bg-white/80 blur-[1px]" />
              <div className="absolute -bottom-[3px] right-1/3 h-1.5 w-1.5 rounded-full bg-white/60 blur-[1px]" />
              <div className="absolute top-1/3 -left-[3px] h-1.5 w-1.5 rounded-full bg-white/70 blur-[1px]" />
              <div className="absolute top-1/3 -right-[3px] h-1.5 w-1.5 rounded-full bg-white/60 blur-[1px]" />
              <div className="absolute -bottom-[3px] left-1/3 h-1.5 w-1.5 rounded-full bg-white/50 blur-[1px]" />
              <div className="absolute -top-[3px] right-1/3 h-1.5 w-1.5 rounded-full bg-white/50 blur-[1px]" />
              <svg className="h-11 w-11 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="6" width="12" height="12" rx="2" transform="rotate(45 12 12)" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-[hsl(217,91%,60%,0.3)] blur-lg rounded-full" />
            </motion.div>
          </div>

          {leftItems.map((item, i) => {
            const positions = [{ top: "16%", left: "10%" }, { top: "42%", left: "4%" }, { top: "68%", left: "14%" }];
            return (
              <motion.div key={item.name} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 + i * 0.1, duration: 0.5, ease }} className="absolute" style={{ top: positions[i].top, left: positions[i].left }}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-[52px] w-[52px] rounded-xl bg-[hsl(220,40%,9%)] border border-[hsl(220,25%,16%)] flex items-center justify-center shadow-lg hover:border-[hsl(217,91%,60%,0.3)] hover:shadow-[0_0_20px_hsl(217,91%,60%,0.1)] transition-all duration-300 cursor-pointer group">
                    <item.icon className="h-5 w-5 text-[hsl(220,15%,50%)] group-hover:text-[hsl(217,91%,68%)] transition-colors" />
                  </div>
                  <span className="text-[10px] font-medium text-[hsl(220,15%,50%)]">{item.name}</span>
                </div>
              </motion.div>
            );
          })}

          {rightItems.map((item, i) => {
            const positions = [{ top: "16%", right: "10%" }, { top: "42%", right: "4%" }, { top: "68%", right: "14%" }];
            return (
              <motion.div key={item.name} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 + i * 0.1, duration: 0.5, ease }} className="absolute" style={{ top: positions[i].top, right: positions[i].right }}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-[52px] w-[52px] rounded-xl bg-[hsl(220,40%,9%)] border border-[hsl(220,25%,16%)] flex items-center justify-center shadow-lg hover:border-[hsl(217,91%,60%,0.3)] hover:shadow-[0_0_20px_hsl(217,91%,60%,0.1)] transition-all duration-300 cursor-pointer group">
                    <item.icon className="h-5 w-5 text-[hsl(220,15%,50%)] group-hover:text-[hsl(217,91%,68%)] transition-colors" />
                  </div>
                  <span className="text-[10px] font-medium text-[hsl(220,15%,50%)]">{item.name}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="md:hidden grid grid-cols-3 gap-4 max-w-sm mx-auto">
          {[...leftItems, ...rightItems].map((item, i) => (
            <motion.div key={item.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.08, duration: 0.4, ease }} className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-xl bg-[hsl(220,40%,9%)] border border-[hsl(220,25%,16%)] flex items-center justify-center">
                <item.icon className="h-5 w-5 text-[hsl(217,91%,68%)]" />
              </div>
              <span className="text-[10px] font-medium text-[hsl(220,15%,50%)]">{item.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
