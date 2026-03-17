import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

const logos = [
  { name: "IPSUM", render: () => <span className="text-xl md:text-2xl font-black tracking-wider">IP<span className="text-[hsl(262,83%,58%)]">S</span>UM<sup className="text-[6px] ml-0.5">•</sup></span> },
  { name: "Logoipsum", render: () => (
    <svg viewBox="0 0 40 40" className="h-8 md:h-10 w-auto">
      <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  )},
  { name: "Logoipsum", render: () => (
    <div className="flex items-center gap-1.5">
      <svg viewBox="0 0 30 30" className="h-7 md:h-9 w-auto">
        <path d="M15 3 L27 27 L3 27 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="15" cy="19" r="3" fill="currentColor" />
      </svg>
      <span className="text-[10px] md:text-xs font-medium tracking-wide opacity-60">logoipsum</span>
    </div>
  )},
  { name: "Logo Ipsum", render: () => (
    <div className="flex items-center gap-2">
      <span className="text-base md:text-lg font-semibold">logo</span>
      <svg viewBox="0 0 24 24" className="h-5 md:h-6 w-auto">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 2 C12 2 8 8 8 12 C8 16 12 22 12 22 C12 22 16 16 16 12 C16 8 12 2 12 2 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="text-base md:text-lg font-semibold">ipsum</span>
    </div>
  )},
  { name: "COO", render: () => (
    <svg viewBox="0 0 60 24" className="h-6 md:h-8 w-auto">
      <ellipse cx="12" cy="12" rx="10" ry="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <ellipse cx="30" cy="12" rx="10" ry="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <ellipse cx="48" cy="12" rx="10" ry="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  )},
  { name: "Logoipsum", render: () => (
    <div className="flex items-center gap-1.5">
      <svg viewBox="0 0 24 24" className="h-6 md:h-7 w-auto">
        <path d="M12 2L14 8H20L15 12L17 18L12 14L7 18L9 12L4 8H10L12 2Z" fill="currentColor" opacity="0.8" />
      </svg>
      <span className="text-base md:text-lg font-bold tracking-tight">Logoipsum</span>
    </div>
  )},
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
      <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(250,15%,40%)] font-medium mb-8">
        {t("hero.trustedBy")}
      </p>
      <div className="relative overflow-hidden max-w-5xl mx-auto">
        {/* Edge fades */}
        <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-r from-[hsl(250,30%,6%)] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 bg-gradient-to-l from-[hsl(250,30%,6%)] to-transparent z-10 pointer-events-none" />

        <motion.div
          className="flex items-center gap-14 md:gap-20 w-max text-[hsl(250,15%,38%)]"
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
              className="flex-shrink-0 hover:text-[hsl(250,15%,55%)] transition-colors duration-300"
              title={logo.name}
            >
              {logo.render()}
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
