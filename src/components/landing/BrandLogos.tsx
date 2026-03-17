import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

const brands = [
  {
    name: "Shopify",
    svg: (
      <svg viewBox="0 0 109 124" className="h-6 w-auto">
        <path fill="hsl(250,15%,35%)" d="M95.8 28.2c-.1-.6-.6-1-1.1-1-.5 0-10.2-1.5-10.2-1.5s-6.8-6.7-7.5-7.5c-.7-.7-2.1-.5-2.6-.3-.1 0-1.4.4-3.6 1.1-2.1-6.2-5.9-11.8-12.5-11.8h-.6C55.9 4.6 53.7 3 51.9 3c-16.3 0-24.1 20.4-26.6 30.8-6.4 2-10.9 3.4-11.4 3.5-3.6 1.1-3.7 1.2-4.1 4.6C9.4 44.4 0 118.3 0 118.3l75.6 13.1 40.4-10.1S96 28.8 95.8 28.2z"/>
      </svg>
    ),
  },
  {
    name: "WordPress",
    svg: (
      <svg viewBox="0 0 122 122" className="h-6 w-auto">
        <path fill="hsl(250,15%,35%)" d="M8.7 61c0 22.3 13 41.6 31.8 50.8L13.1 37.4C10.3 44.7 8.7 52.6 8.7 61zM96.3 58.6c0-7-2.5-11.8-4.6-15.6-2.9-4.6-5.6-8.5-5.6-13.1 0-5.1 3.9-9.9 9.4-9.9h.7C86.5 11.4 74.4 5.8 61 5.8c-17.8 0-33.5 9.1-42.6 22.9 1.2 0 2.3.1 3.3.1 5.3 0 13.6-.6 13.6-.6 2.8-.2 3.1 3.9.3 4.2 0 0-2.8.3-5.8.5l18.4 54.6 11-33.1-7.9-21.5c-2.8-.2-5.4-.5-5.4-.5-2.7-.2-2.4-4.3.3-4.2 0 0 8.4.6 13.4.6 5.3 0 13.6-.6 13.6-.6 2.8-.2 3.1 3.9.3 4.2 0 0-2.8.3-5.8.5L86 87.3l5.1-17C93.6 63.5 96.3 60.8 96.3 58.6z"/>
      </svg>
    ),
  },
  {
    name: "WooCommerce",
    svg: (
      <svg viewBox="0 0 52 60" className="h-6 w-auto">
        <path fill="hsl(250,15%,35%)" d="M22.8 1.8C10.4 1.8.2 12 .2 24.4v21.3c0 6.4 5.2 11.6 11.7 11.6h6.2l7.5 7.5V57.3h3.9c12.4 0 22.6-10.2 22.6-22.6V24.4C52 12 41.8 1.8 29.4 1.8h-6.6z"/>
      </svg>
    ),
  },
  {
    name: "PrestaShop",
    svg: (
      <svg viewBox="0 0 40 44" className="h-6 w-auto">
        <path fill="hsl(250,15%,35%)" d="M35.2 14.5c-1-1.5-2.5-2.6-4.2-3.1-.5-2.6-1.8-4.8-3.8-6.3C25.2 3.5 22.8 2.6 20.2 2.6c-2.9 0-5.5 1.1-7.5 3.1S9.5 10.5 9.5 13.4v.3c-2 .5-3.7 1.6-4.9 3.2-1.3 1.7-2 3.8-2 6v.7c0 3.2 1.5 6 3.9 7.8v7.8c0 1.4 1.2 2.6 2.6 2.6h21.8c1.4 0 2.6-1.2 2.6-2.6v-7.8c2.4-1.9 3.9-4.7 3.9-7.8v-.7c0-2.3-.8-4.4-2.2-6.1v-2.3z"/>
      </svg>
    ),
  },
  {
    name: "HubSpot",
    svg: (
      <svg viewBox="0 0 100 100" className="h-6 w-auto">
        <path fill="hsl(250,15%,35%)" d="M71.5 37.2V25.7c3.5-1.8 5.9-5.4 5.9-9.6 0-6-4.8-10.8-10.8-10.8-6 0-10.8 4.8-10.8 10.8 0 4.2 2.4 7.8 5.9 9.6v11.5c-5.3 1.3-10 4.3-13.5 8.5L24.8 28.4c.5-1.3.8-2.7.8-4.2 0-6.5-5.3-11.8-11.8-11.8S2 17.7 2 24.2s5.3 11.8 11.8 11.8c2.2 0 4.2-.6 6-1.7l23 17c-3.1 4.7-4.9 10.3-4.9 16.3 0 16.5 13.4 29.9 29.9 29.9s29.9-13.4 29.9-29.9c-.1-14.5-10.4-26.6-24.2-29.4z"/>
      </svg>
    ),
  },
  {
    name: "Webflow",
    svg: (
      <svg viewBox="0 0 60 40" className="h-5 w-auto">
        <path fill="hsl(250,15%,35%)" d="M44.5 5.5c-3 8.5-11.5 28-11.5 28S29.6 16 28.5 12.3c-5.4 0-10.3 3.9-12 9.2 0 0-4.8 14.2-5.1 15-.2-2.1-3.6-30.9-3.6-30.9C2.2 5.5-2 9.3-2 9.3l7.3 31.9h11.6c1.2-3.4 5.4-15.3 5.4-15.3 1.3 3.9 5.1 15.3 5.1 15.3H39L53.3 5.5h-8.8z" transform="translate(4 0)"/>
      </svg>
    ),
  },
  {
    name: "Ahrefs",
    svg: (
      <svg viewBox="0 0 60 60" className="h-6 w-auto">
        <circle cx="30" cy="30" r="28" fill="hsl(250,15%,35%)"/>
        <path fill="hsl(250,30%,6%)" d="M22.5 40.5h-5.7L27.5 15h5.1l10.7 25.5h-5.7L30.1 21.8h-.2L22.5 40.5zm-1.2-10h17.4v4.3H21.3v-4.3z"/>
      </svg>
    ),
  },
];

export function BrandLogos() {
  const { t } = useLanguage();

  const marqueeItems = [...brands, ...brands];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.8 }}
      className="mt-16 md:mt-20 text-center"
    >
      <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(250,15%,40%)] font-medium mb-8">
        {t("hero.trustedBy")}
      </p>
      <div className="relative overflow-hidden max-w-4xl mx-auto">
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-r from-[hsl(250,30%,6%)] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-l from-[hsl(250,30%,6%)] to-transparent z-10 pointer-events-none" />

        <motion.div
          className="flex items-center gap-12 md:gap-16 w-max"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            x: {
              duration: 30,
              repeat: Infinity,
              ease: "linear",
            },
          }}
        >
          {marqueeItems.map((brand, i) => (
            <div
              key={`${brand.name}-${i}`}
              className="flex-shrink-0 opacity-50 hover:opacity-80 transition-opacity duration-300"
              title={brand.name}
            >
              {brand.svg}
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
