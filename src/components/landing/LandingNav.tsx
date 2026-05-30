import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useLanguage();

  const navLinks = [
    { label: t("nav.features"), href: "#features" },
    { label: t("nav.useCases"), href: "#use-cases" },
    { label: t("nav.howItWorks"), href: "#how-it-works" },
    { label: t("nav.pricing"), href: "#pricing" },
    { label: t("nav.affiliate"), href: "#affiliate" },
    { label: t("nav.faq"), href: "#faq" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`transition-all duration-500 ${scrolled ? "bg-[hsl(220,60%,4%)]/80 backdrop-blur-2xl border-b border-[hsl(217,91%,60%,0.08)]" : "bg-transparent"}`}
      >
        <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-[hsl(210,100%,70%)] flex items-center justify-center">
              <span className="text-xs font-black text-primary-foreground">P</span>
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">3XVISIBILITY</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-[hsl(220,15%,60%)] hover:text-foreground px-4 py-2 rounded-lg transition-colors duration-200 font-medium">{l.label}</a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher variant="ghost" size="icon" className="h-9 w-9 text-[hsl(220,15%,55%)] hover:text-foreground rounded-lg" />
            <Button variant="ghost" size="sm" className="text-sm h-9 px-4 rounded-lg font-medium text-[hsl(220,15%,60%)] hover:text-foreground hover:bg-[hsl(217,91%,60%,0.08)]" asChild>
              <Link to="/auth">{t("nav.login")}</Link>
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-9 px-5 rounded-lg font-semibold shadow-lg shadow-primary/20" asChild>
              <Link to="/auth">{t("nav.getStarted")}</Link>
            </Button>
          </div>

          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="md:hidden border-t border-[hsl(217,91%,60%,0.1)] overflow-hidden bg-[hsl(220,60%,4%)]/95 backdrop-blur-2xl">
              <div className="px-4 py-4 space-y-1">
                {navLinks.map((l) => (
                  <a key={l.href} href={l.href} className="block text-sm text-[hsl(220,15%,60%)] hover:text-foreground py-2.5 px-3 rounded-lg hover:bg-[hsl(217,91%,60%,0.08)] transition-all" onClick={() => setMobileOpen(false)}>{l.label}</a>
                ))}
                <div className="pt-3 flex flex-col gap-2 border-t border-[hsl(217,91%,60%,0.1)] mt-3">
                  <LanguageSwitcher variant="outline" size="sm" className="justify-start gap-2 rounded-lg h-10 border-[hsl(217,91%,60%,0.15)]" />
                  <Button variant="outline" size="sm" className="rounded-lg h-10 border-[hsl(217,91%,60%,0.15)] text-foreground" asChild>
                    <Link to="/auth">{t("nav.login")}</Link>
                  </Button>
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg h-10 font-semibold" asChild>
                    <Link to="/auth">{t("nav.getStarted")}</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </header>
  );
}
