import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { Globe, ShoppingCart, Search, Store, BarChart3, FileText, Layers } from "lucide-react";

const logos = [
  { name: "WordPress", icon: Globe },
  { name: "Shopify", icon: ShoppingCart },
  { name: "Google", icon: Search },
  { name: "WooCommerce", icon: Store },
  { name: "Semrush", icon: BarChart3 },
  { name: "Ahrefs", icon: Layers },
  { name: "PrestaShop", icon: FileText },
];

export function BrandLogos() {
  const { t } = useLanguage();

  const marqueeItems = [...logos, ...logos];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.8 }}
      className="mt-16 md:mt-20 text-center"
    >
      <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(220,15%,40%)] font-medium mb-8">
        {t("hero.trustedBy")}
      </p>
      <div className="relative overflow-hidden max-w-5xl mx-auto">
        <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-[hsl(220,60%,4%)] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-[hsl(220,60%,4%)] to-transparent z-10 pointer-events-none" />

        <motion.div
          className="flex items-center gap-16 md:gap-24 w-max"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            x: {
              duration: 35,
              repeat: Infinity,
              ease: "linear",
            },
          }}
        >
          {marqueeItems.map((logo, i) => (
            <div
              key={`${logo.name}-${i}`}
              className="flex-shrink-0 flex items-center gap-2.5 opacity-40 hover:opacity-70 transition-opacity duration-300"
            >
              <logo.icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
              <span className="text-sm md:text-base font-semibold text-white tracking-tight whitespace-nowrap">
                {logo.name}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
