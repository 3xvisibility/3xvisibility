import { Quote, Eye, PenLine, LifeBuoy } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "./ScrollReveal";
import { useLanguage } from "@/i18n/LanguageContext";
import founderPhoto from "@/assets/team/founder.jpg";

const pillars = [
  { icon: Eye, titleKey: "human.pillar1.title", textKey: "human.pillar1.text" },
  { icon: PenLine, titleKey: "human.pillar2.title", textKey: "human.pillar2.text" },
  { icon: LifeBuoy, titleKey: "human.pillar3.title", textKey: "human.pillar3.text" },
];

export function HumanTouchSection() {
  const { t } = useLanguage();

  return (
    <section id="human" className="py-20 md:py-28 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-12">
          <span className="section-badge mb-6">{t("human.badge")}</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">
            {t("human.title")}
          </h2>
          <p className="mt-3 text-sm text-[hsl(220,10%,70%)]">{t("human.description")}</p>
        </ScrollReveal>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8 lg:gap-12 items-center">
          {/* Founder note */}
          <ScrollReveal>
            <figure className="relative rounded-3xl border border-[hsl(96,90%,45%,0.12)] bg-[hsl(220,40%,8%)] p-6 md:p-8">
              <Quote className="absolute top-6 right-6 h-8 w-8 text-[hsl(96,90%,45%,0.18)]" aria-hidden="true" />
              <div className="flex items-center gap-4">
                <img
                  src={founderPhoto}
                  alt={t("human.founder.alt")}
                  loading="lazy"
                  width={768}
                  height={960}
                  className="h-16 w-16 rounded-2xl object-cover object-top border border-[hsl(96,90%,45%,0.2)]"
                />
                <figcaption>
                  <p className="text-sm font-semibold text-foreground">{t("human.founder.name")}</p>
                  <p className="text-xs text-[hsl(220,10%,64%)]">{t("human.founder.role")}</p>
                </figcaption>
              </div>
              <blockquote className="mt-5 text-sm md:text-[15px] leading-relaxed text-[hsl(220,10%,82%)]">
                {t("human.founder.quote")}
              </blockquote>
              <p className="mt-5 text-xs text-[hsl(220,10%,58%)]">{t("human.founder.signature")}</p>
            </figure>
          </ScrollReveal>

          {/* Human-in-the-loop pillars */}
          <StaggerContainer className="space-y-4">
            {pillars.map(({ icon: Icon, titleKey, textKey }) => (
              <StaggerItem key={titleKey}>
                <div className="flex gap-4 rounded-2xl border border-[hsl(96,90%,45%,0.1)] bg-[hsl(220,42%,7%)] p-5 hover:border-[hsl(96,90%,45%,0.22)] transition-colors">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-[hsl(96,90%,45%,0.12)] flex items-center justify-center">
                    <Icon className="h-5 w-5 text-[hsl(96,80%,52%)]" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t(titleKey)}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-[hsl(220,10%,70%)]">{t(textKey)}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}
