import { ScrollReveal } from "./ScrollReveal";
import { Play } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";

// Bump this when the rendered video changes to bust browser/CDN caches.
const VIDEO_VERSION = "3xvisibility-2";
const DEFAULT_VIDEO = `/pagegen-demo.mp4?v=${VIDEO_VERSION}`;

export function VideoSection() {
  const [playing, setPlaying] = useState(false);
  const { t, language } = useLanguage();

  // Try /pagegen-demo-{lang}.mp4; fall back to default if not present.
  const candidate = useMemo(
    () => (language && language !== "en" ? `/pagegen-demo-${language}.mp4?v=${VIDEO_VERSION}` : DEFAULT_VIDEO),
    [language]
  );
  const [videoSrc, setVideoSrc] = useState<string>(DEFAULT_VIDEO);

  useEffect(() => {
    let cancelled = false;
    setPlaying(false);
    if (candidate === DEFAULT_VIDEO) {
      setVideoSrc(DEFAULT_VIDEO);
      return;
    }
    fetch(candidate, { method: "HEAD" })
      .then((r) => {
        if (cancelled) return;
        setVideoSrc(r.ok ? candidate : DEFAULT_VIDEO);
      })
      .catch(() => !cancelled && setVideoSrc(DEFAULT_VIDEO));
    return () => {
      cancelled = true;
    };
  }, [candidate]);

  return (
    <section id="demo-video" className="py-20 md:py-28 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-12">
          <span className="section-badge mb-6">{t("video.badge")}</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em]">{t("video.title")}</h2>
          <p className="mt-3 text-sm text-[hsl(220,10%,70%)]">{t("video.description")}</p>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-[hsl(96,90%,45%,0.15)] shadow-2xl glow-purple-sm">
            <div className="relative aspect-video bg-[hsl(220,40%,8%)]">
              {playing ? (
                <video key={`play-${videoSrc}`} className="absolute inset-0 w-full h-full object-cover" src={videoSrc} autoPlay controls playsInline />
              ) : (
                <>
                  <video key={`preview-${videoSrc}`} className="absolute inset-0 w-full h-full object-cover" src={videoSrc} muted loop autoPlay playsInline preload="metadata" />
                  <div className="absolute inset-0 cursor-pointer group bg-gradient-to-br from-[hsl(220,40%,5%,0.55)] to-[hsl(220,40%,5%,0.25)] flex flex-col items-center justify-center gap-4" onClick={() => setPlaying(true)}>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl shadow-primary/30 group-hover:shadow-primary/40">
                      <Play className="h-6 w-6 ml-1 fill-current" />
                    </motion.div>
                    <p className="text-sm font-medium text-[hsl(220,10%,92%)]">{t("video.watchDemo")}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: "2.4M+", labelKey: "video.pagesGenerated" },
              { value: "340%", labelKey: "video.avgTrafficBoost" },
              { value: "< 2min", labelKey: "video.setupTime" },
              { value: "99.9%", labelKey: "video.uptimeSLA" },
            ].map((stat) => (
              <div key={stat.labelKey} className="text-center py-5 rounded-2xl border border-[hsl(96,90%,45%,0.1)] bg-[hsl(220,40%,8%)]">
                <p className="text-2xl md:text-3xl font-extrabold tracking-tight text-gradient-primary">{stat.value}</p>
                <p className="text-[11px] text-[hsl(220,10%,64%)] mt-1 uppercase tracking-wider font-medium">{t(stat.labelKey)}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
