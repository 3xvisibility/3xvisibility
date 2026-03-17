import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Home, BarChart3, Globe, FileText, Settings, Info, Search, Bell, Mail, MoreHorizontal, Users, Eye, Heart, TrendingUp, CheckCircle2 } from "lucide-react";
import { motion, animate } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { BrandLogos } from "./BrandLogos";
import { useEffect, useRef, useState, useCallback } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

function AnimatedNumber({ value, suffix = "", delay = 0 }: { value: number; suffix?: string; delay?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(false);

  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const timeout = setTimeout(() => {
      const mv = { v: 0 };
      const controls = animate(mv, { v: value }, {
        duration: 1.5,
        ease: "easeOut",
        onUpdate: () => setDisplay(Math.round(mv.v * 10) / 10),
      });
      return () => controls.stop();
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  const formatted = display >= 1000
    ? (display / 1000).toFixed(1) + "K"
    : suffix === "%" && display % 1 !== 0
    ? display.toFixed(1)
    : Math.round(display).toString();

  return <span>{formatted}{suffix}</span>;
}

// Mini bar chart component
function MiniBarChart() {
  const bars = [40, 55, 35, 65, 50, 75, 60, 80, 45, 70, 55, 85, 65, 90, 50, 70, 60, 75, 80, 55, 65, 85, 70, 95];
  return (
    <div className="flex items-end gap-[3px] h-[100px] w-full">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{ delay: 1.8 + i * 0.03, duration: 0.5, ease }}
          className="flex-1 rounded-sm bg-[hsl(262,83%,58%,0.4)] hover:bg-[hsl(262,83%,58%,0.7)] transition-colors cursor-pointer min-w-[4px]"
        />
      ))}
    </div>
  );
}

export function HeroSection() {
  const { t } = useLanguage();

  const sidebarIcons = [Home, BarChart3, Globe, FileText, Settings, Info];

  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(262,83%,58%,0.15),transparent_70%)]" />
        <div className="absolute top-[100px] left-[5%] w-[400px] h-[400px] rounded-full bg-[hsl(280,80%,65%,0.06)] blur-[100px]" />
        <div className="absolute top-[200px] right-[5%] w-[350px] h-[350px] rounded-full bg-[hsl(262,83%,58%,0.05)] blur-[80px]" />
        <div className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(262,83%,58%) 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge pill */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-[hsl(262,83%,58%,0.2)] bg-[hsl(262,83%,58%,0.08)] px-4 py-1.5 text-xs font-medium text-[hsl(262,83%,68%)] mb-8"
          >
            <Sparkles className="h-3 w-3" />
            <span>{t("hero.badge")}</span>
            <ArrowRight className="h-3 w-3" />
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-extrabold tracking-[-0.04em] leading-[1.05]"
          >
            {t("hero.title1")}
            <br />
            <span className="text-gradient-primary">{t("hero.title2")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease }}
            className="mt-6 text-base md:text-lg text-[hsl(250,15%,55%)] leading-relaxed max-w-xl mx-auto"
          >
            {t("hero.description")}
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 active:scale-[0.97] text-sm px-8 h-12 rounded-xl font-semibold shadow-xl shadow-primary/25"
              asChild
            >
              <Link to="/auth">
                {t("hero.cta")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-[hsl(262,83%,58%,0.2)] bg-transparent text-[hsl(250,15%,70%)] hover:text-foreground h-12 text-sm px-8 rounded-xl font-medium hover:bg-[hsl(262,83%,58%,0.08)] hover:border-[hsl(262,83%,58%,0.3)]"
              asChild
            >
              <a href="#demo-video">{t("hero.watchDemo")}</a>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-5 flex items-center justify-center gap-6 text-xs text-[hsl(250,15%,45%)]"
          >
            <span>{t("hero.freeStart")}</span>
            <span>{t("hero.noCreditCard")}</span>
            <span>{t("hero.pagesPerMonth")}</span>
          </motion.div>
        </div>

        {/* ===== DASHBOARD MOCKUP ===== */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.5, ease }}
          className="mt-14 md:mt-20 max-w-5xl mx-auto relative [perspective:1200px]"
        >
          {/* Glow behind card */}
          <div className="absolute -inset-6 bg-[radial-gradient(ellipse_at_center,hsl(262,83%,58%,0.15),transparent_70%)] rounded-3xl blur-2xl pointer-events-none" />

          <TiltCard>
            <div className="flex">
              {/* Sidebar */}
              <div className="hidden md:flex flex-col items-center w-14 py-4 gap-5 border-r border-[hsl(262,83%,58%,0.08)] bg-[hsl(252,30%,8%)]">
                {sidebarIcons.map((Icon, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.06, duration: 0.4, ease }}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                      i === 0
                        ? "bg-[hsl(262,83%,58%,0.15)] text-[hsl(262,83%,68%)]"
                        : "text-[hsl(250,15%,40%)] hover:text-[hsl(250,15%,60%)] hover:bg-[hsl(250,25%,14%)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </motion.div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                {/* Top bar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(262,83%,58%,0.08)]">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                  >
                    <h2 className="text-sm font-bold text-foreground">Welcome back, John</h2>
                    <p className="text-[10px] text-[hsl(250,15%,45%)]">Statistics overview</p>
                  </motion.div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 h-7 px-3 rounded-lg bg-[hsl(250,25%,14%)] border border-[hsl(262,83%,58%,0.08)]">
                      <Search className="h-3 w-3 text-[hsl(250,15%,40%)]" />
                      <span className="text-[10px] text-[hsl(250,15%,40%)]">Search...</span>
                    </div>
                    <Bell className="h-4 w-4 text-[hsl(250,15%,40%)]" />
                    <Mail className="h-4 w-4 text-[hsl(250,15%,40%)]" />
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[hsl(262,83%,58%)] to-[hsl(280,80%,65%)]" />
                  </div>
                </div>

                {/* Dashboard body */}
                <div className="p-4 md:p-5">
                  {/* Time filter + last updated */}
                  <div className="flex items-center justify-between mb-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1, duration: 0.4 }}
                      className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-[hsl(250,25%,14%)] border border-[hsl(262,83%,58%,0.1)] text-[10px] font-medium text-[hsl(250,15%,55%)] cursor-pointer"
                    >
                      This week <ArrowRight className="h-2.5 w-2.5 rotate-90" />
                    </motion.div>
                    <span className="text-[9px] text-[hsl(250,15%,35%)]">Last updated at 10:22 AM</span>
                  </div>

                  <div className="flex gap-4">
                    {/* Left: Stats + Chart */}
                    <div className="flex-1 min-w-0">
                      {/* Stat cards */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: "Pages Generated", value: 1324, icon: FileText, change: "+10%", changeColor: "text-[hsl(142,76%,50%)]", iconBg: "bg-[hsl(262,83%,58%,0.1)]" },
                          { label: "Total Views", value: 12100, icon: Eye, change: "+5%", changeColor: "text-[hsl(142,76%,50%)]", iconBg: "bg-[hsl(280,80%,65%,0.1)]" },
                          { label: "Indexing Rate", value: 56, icon: TrendingUp, change: "+12%", changeColor: "text-[hsl(142,76%,50%)]", iconBg: "bg-[hsl(38,92%,50%,0.1)]", suffix: "%" },
                        ].map((stat, i) => (
                          <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.1 + i * 0.1, duration: 0.5, ease }}
                            className="rounded-xl bg-[hsl(250,25%,12%)] border border-[hsl(262,83%,58%,0.08)] p-3"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] text-[hsl(250,15%,45%)] font-medium">{stat.label}</span>
                              <span className={`text-[9px] font-semibold ${stat.changeColor} flex items-center gap-0.5`}>
                                {stat.change} <TrendingUp className="h-2.5 w-2.5" />
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-bold text-foreground">
                                <AnimatedNumber value={stat.value} suffix={stat.suffix || ""} delay={1.3 + i * 0.15} />
                              </span>
                              <div className={`h-5 w-5 rounded-md ${stat.iconBg} flex items-center justify-center`}>
                                <stat.icon className="h-2.5 w-2.5 text-[hsl(262,83%,68%)]" />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Chart area */}
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.5, duration: 0.5, ease }}
                        className="rounded-xl bg-[hsl(250,25%,12%)] border border-[hsl(262,83%,58%,0.08)] p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-semibold text-foreground">Daily visitors</span>
                          <MoreHorizontal className="h-3.5 w-3.5 text-[hsl(250,15%,40%)]" />
                        </div>
                        <MiniBarChart />
                        <div className="flex justify-between mt-2 text-[8px] text-[hsl(250,15%,35%)]">
                          <span>January</span>
                          <span>February</span>
                          <span>March</span>
                        </div>
                      </motion.div>
                    </div>

                    {/* Right: Integrations panel */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.3, duration: 0.6, ease }}
                      className="hidden lg:block w-52 shrink-0"
                    >
                      <div className="rounded-xl bg-[hsl(250,25%,12%)] border border-[hsl(262,83%,58%,0.08)] p-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-semibold text-foreground">Integrations</span>
                          <MoreHorizontal className="h-3.5 w-3.5 text-[hsl(250,15%,40%)]" />
                        </div>

                        {[
                          { name: "WordPress", connected: true },
                          { name: "Shopify", connected: true },
                          { name: "WooCommerce", connected: false },
                          { name: "PrestaShop", connected: false },
                          { name: "Google Index", connected: true },
                        ].map((item, i) => (
                          <motion.div
                            key={item.name}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1.5 + i * 0.08, duration: 0.3, ease }}
                            className="flex items-center justify-between py-1.5"
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-[hsl(250,25%,18%)] flex items-center justify-center">
                                <Globe className="h-3 w-3 text-[hsl(250,15%,50%)]" />
                              </div>
                              <span className="text-[10px] text-[hsl(250,15%,60%)]">{item.name}</span>
                            </div>
                            {item.connected ? (
                              <span className="text-[8px] px-2 py-0.5 rounded-full bg-[hsl(142,76%,36%,0.15)] text-[hsl(142,76%,50%)] font-medium">Connected</span>
                            ) : (
                              <span className="text-[8px] px-2 py-0.5 rounded-full bg-[hsl(262,83%,58%,0.1)] text-[hsl(262,83%,58%)] font-medium cursor-pointer hover:bg-[hsl(262,83%,58%,0.2)] transition-colors">Connect</span>
                            )}
                          </motion.div>
                        ))}
                      </div>

                      {/* Recent Activity mini card */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.8, duration: 0.5, ease }}
                        className="mt-3 rounded-xl bg-[hsl(250,25%,12%)] border border-[hsl(262,83%,58%,0.08)] p-3"
                      >
                        <span className="text-[11px] font-semibold text-foreground block mb-2">Recent Activity</span>
                        {[
                          { text: "Generated 50 pages", status: "Completed" },
                          { text: "Sitemap updated", status: "Completed" },
                          { text: "Indexing 12 URLs", status: "In Progress" },
                        ].map((activity, i) => (
                          <div key={i} className="flex items-center gap-2 py-1">
                            <CheckCircle2 className={`h-3 w-3 shrink-0 ${activity.status === "Completed" ? "text-[hsl(142,76%,50%)]" : "text-[hsl(38,92%,50%)]"}`} />
                            <span className="text-[9px] text-[hsl(250,15%,55%)] truncate">{activity.text}</span>
                          </div>
                        ))}
                      </motion.div>
                    </motion.div>
                  </div>
                </div>

                {/* Floating scheduled post card */}
                <motion.div
                  initial={{ opacity: 0, y: 20, x: -20 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  transition={{ delay: 2.2, duration: 0.6, ease }}
                  className="absolute bottom-4 left-4 md:left-20 hidden sm:block"
                >
                  <div className="rounded-lg bg-[hsl(252,30%,12%)] border border-[hsl(262,83%,58%,0.15)] p-2.5 shadow-xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 rounded-full bg-[hsl(142,76%,50%)]" />
                      <span className="text-[8px] text-[hsl(250,15%,45%)]">Published on 5 Mar at 19:00</span>
                    </div>
                    <span className="text-[10px] font-semibold text-foreground">50 SEO Pages Deployed</span>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[8px] text-[hsl(250,15%,40%)]"><Heart className="h-2.5 w-2.5" /> —</span>
                      <span className="flex items-center gap-1 text-[8px] text-[hsl(250,15%,40%)]"><Eye className="h-2.5 w-2.5" /> —</span>
                      <span className="flex items-center gap-1 text-[8px] text-[hsl(250,15%,40%)]"><Users className="h-2.5 w-2.5" /> —</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </TiltCard>
        </motion.div>

        <BrandLogos />
      </div>
    </section>
  );
}
