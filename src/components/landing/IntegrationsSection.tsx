import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { ScrollReveal } from "./ScrollReveal";
import { Globe, ShoppingCart, Store, Search, FileText, BarChart3 } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

const integrations = [
  { name: "WordPress", icon: Globe, pos: "left-top" },
  { name: "Shopify", icon: ShoppingCart, pos: "left-mid" },
  { name: "WooCommerce", icon: Store, pos: "left-bot" },
  { name: "PrestaShop", icon: FileText, pos: "right-top" },
  { name: "Google Index", icon: Search, pos: "right-mid" },
  { name: "Analytics", icon: BarChart3, pos: "right-bot" },
];

function ConnectorLine({ side, index }: { side: "left" | "right"; index: number }) {
  const yOffsets = ["-40px", "0px", "40px"];
  const y = yOffsets[index];

  return (
    <motion.div
      initial={{ scaleX: 0, opacity: 0 }}
      whileInView={{ scaleX: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.4 + index * 0.1, duration: 0.6, ease }}
      className={`absolute top-1/2 h-px w-[calc(50%-80px)] ${
        side === "left"
          ? "right-1/2 mr-[80px] origin-right"
          : "left-1/2 ml-[80px] origin-left"
      }`}
      style={{ transform: `translateY(${y}) scaleX(1)` }}
    >
      <div className="h-full bg-gradient-to-r from-[hsl(262,83%,58%,0.05)] via-[hsl(262,83%,58%,0.2)] to-[hsl(262,83%,58%,0.05)]" />
      {/* Traveling light */}
      <motion.div
        animate={{ x: side === "left" ? ["100%", "-20%"] : ["-20%", "100%"] }}
        transition={{ delay: 1.5 + index * 0.3, duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
        className="absolute inset-0 w-1/4 bg-gradient-to-r from-transparent via-[hsl(262,83%,58%,0.5)] to-transparent"
      />
    </motion.div>
  );
}

export function IntegrationsSection() {
  const { t } = useLanguage();

  const leftItems = integrations.filter((_, i) => i < 3);
  const rightItems = integrations.filter((_, i) => i >= 3);

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,hsl(262,83%,58%,0.06),transparent)] pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16">
            <div className="section-badge mx-auto mb-5">
              <span>✦</span>
              <span>Integrations</span>
              <span>✦</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.04em]">
              Integrates with Your{" "}
              <span className="text-gradient-primary">Favourite Tools</span>
            </h2>
            <p className="mt-4 text-sm md:text-base text-[hsl(250,15%,50%)] max-w-lg mx-auto leading-relaxed">
              Seamlessly connects with popular CMS platforms, enabling you to deploy pages and boost SEO without disrupting your workflow.
            </p>
          </div>
        </ScrollReveal>

        {/* Integration hub layout */}
        <div className="relative max-w-4xl mx-auto h-[320px] md:h-[360px] hidden md:block">
          {/* Connection lines */}
          {[0, 1, 2].map((i) => (
            <div key={`lines-${i}`}>
              <ConnectorLine side="left" index={i} />
              <ConnectorLine side="right" index={i} />
            </div>
          ))}

          {/* Center hub */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2, ease }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
          >
            {/* Outer glow ring */}
            <div className="absolute -inset-8 bg-[radial-gradient(circle,hsl(262,83%,58%,0.15),transparent_70%)] rounded-full blur-xl" />
            {/* Pulse rings */}
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -inset-4 rounded-3xl border border-[hsl(262,83%,58%,0.2)]"
            />
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -inset-2 rounded-3xl border border-[hsl(262,83%,58%,0.15)]"
            />
            {/* Hub card */}
            <div className="relative h-28 w-28 rounded-2xl bg-gradient-to-br from-[hsl(262,83%,50%)] to-[hsl(280,80%,55%)] flex items-center justify-center shadow-[0_0_60px_hsl(262,83%,58%,0.3)]">
              {/* Sparkle particles on edges */}
              <div className="absolute -top-0.5 left-1/4 h-1 w-1 rounded-full bg-white/80 animate-pulse" />
              <div className="absolute -bottom-0.5 right-1/4 h-1 w-1 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: "0.5s" }} />
              <div className="absolute top-1/4 -left-0.5 h-1 w-1 rounded-full bg-white/70 animate-pulse" style={{ animationDelay: "1s" }} />
              <div className="absolute top-1/4 -right-0.5 h-1 w-1 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: "1.5s" }} />
              {/* Icon */}
              <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="6" width="12" height="12" rx="2" transform="rotate(45 12 12)" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </div>
          </motion.div>

          {/* Left integration icons */}
          {leftItems.map((item, i) => {
            const topPercent = 20 + i * 30;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.5, ease }}
                className="absolute left-4 lg:left-8"
                style={{ top: `${topPercent}%`, transform: "translateY(-50%)" }}
              >
                <div className="group flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-[hsl(252,25%,12%)] border border-[hsl(262,83%,58%,0.12)] flex items-center justify-center transition-all duration-300 group-hover:border-[hsl(262,83%,58%,0.3)] group-hover:shadow-[0_0_20px_hsl(262,83%,58%,0.1)]">
                    <item.icon className="h-5 w-5 text-[hsl(250,15%,55%)] group-hover:text-[hsl(262,83%,68%)] transition-colors" />
                  </div>
                  <span className="text-xs font-medium text-[hsl(250,15%,50%)] group-hover:text-[hsl(250,15%,70%)] transition-colors hidden lg:block">{item.name}</span>
                </div>
              </motion.div>
            );
          })}

          {/* Right integration icons */}
          {rightItems.map((item, i) => {
            const topPercent = 20 + i * 30;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.5, ease }}
                className="absolute right-4 lg:right-8"
                style={{ top: `${topPercent}%`, transform: "translateY(-50%)" }}
              >
                <div className="group flex items-center gap-3 flex-row-reverse">
                  <div className="h-12 w-12 rounded-xl bg-[hsl(252,25%,12%)] border border-[hsl(262,83%,58%,0.12)] flex items-center justify-center transition-all duration-300 group-hover:border-[hsl(262,83%,58%,0.3)] group-hover:shadow-[0_0_20px_hsl(262,83%,58%,0.1)]">
                    <item.icon className="h-5 w-5 text-[hsl(250,15%,55%)] group-hover:text-[hsl(262,83%,68%)] transition-colors" />
                  </div>
                  <span className="text-xs font-medium text-[hsl(250,15%,50%)] group-hover:text-[hsl(250,15%,70%)] transition-colors hidden lg:block">{item.name}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile layout - simple grid */}
        <div className="md:hidden grid grid-cols-3 gap-4 max-w-sm mx-auto">
          {integrations.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4, ease }}
              className="flex flex-col items-center gap-2"
            >
              <div className="h-12 w-12 rounded-xl bg-[hsl(252,25%,12%)] border border-[hsl(262,83%,58%,0.12)] flex items-center justify-center">
                <item.icon className="h-5 w-5 text-[hsl(262,83%,68%)]" />
              </div>
              <span className="text-[10px] font-medium text-[hsl(250,15%,50%)]">{item.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
