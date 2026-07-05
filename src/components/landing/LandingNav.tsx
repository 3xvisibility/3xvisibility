import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import logo3x from "@/assets/logo-3x.png";

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState<string>("");
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { label: t("nav.features"), href: "#features" },
    { label: t("nav.useCases"), href: "#use-cases" },
    { label: t("nav.howItWorks"), href: "#how-it-works" },
    { label: t("nav.pricing"), href: "#pricing" },
    { label: t("nav.affiliate"), href: "#affiliate" },
    { label: t("nav.faq"), href: "#faq" },
  ];

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Keep the hash in the URL so a reload restores the same section.
    if (window.history.replaceState) {
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    const id = href.replace("#", "");
    if (location.pathname === "/") {
      scrollToId(id);
    } else {
      // Navigate home first, then scroll once the sections have mounted.
      navigate("/");
      setTimeout(() => scrollToId(id), 300);
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // On load: if the URL has a hash, smooth-scroll to that section once it mounts.
  useEffect(() => {
    if (location.pathname !== "/" || !location.hash) return;
    const id = location.hash.replace("#", "");
    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveId(id);
      } else if (attempts < 20) {
        attempts += 1;
        setTimeout(tryScroll, 100);
      }
    };
    // Defer so sections have a chance to render after reload.
    setTimeout(tryScroll, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll-spy: highlight the nav link for the section currently in view.
  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveId("");
      return;
    }
    const ids = navLinks.map((l) => l.href.replace("#", ""));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`transition-all duration-500 ${scrolled ? "bg-[hsl(220,60%,4%)]/80 backdrop-blur-2xl border-b border-[hsl(96,90%,45%,0.08)]" : "bg-transparent"}`}
      >
        <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
          <Link to="/" className="flex items-center">
            <img src={logo3x} alt="3X Visibility logo" width={1107} height={261} className="h-9 sm:h-10 w-auto object-contain" />
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((l) => {
              const isActive = activeId === l.href.replace("#", "");
              return (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={(e) => handleNavClick(e, l.href)}
                  aria-current={isActive ? "true" : undefined}
                  className={`text-sm px-4 py-2 rounded-lg transition-colors duration-200 font-medium ${
                    isActive
                      ? "text-primary bg-[hsl(96,90%,45%,0.1)]"
                      : "text-[hsl(220,10%,78%)] hover:text-foreground"
                  }`}
                >
                  {l.label}
                </a>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <LanguageSwitcher variant="ghost" size="icon" className="h-9 w-auto px-2 text-[hsl(220,10%,74%)] hover:text-foreground rounded-lg" />
            <Button variant="ghost" size="sm" className="text-sm h-9 px-4 rounded-lg font-medium text-[hsl(220,10%,78%)] hover:text-foreground hover:bg-[hsl(96,90%,45%,0.08)]" asChild>
              <Link to="/auth">{t("nav.login")}</Link>
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm h-9 px-5 rounded-lg font-semibold shadow-lg shadow-primary/20" asChild>
              <Link to="/auth">{t("nav.getStarted")}</Link>
            </Button>
          </div>

          <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="lg:hidden border-t border-[hsl(96,90%,45%,0.1)] overflow-hidden bg-[hsl(220,60%,4%)]/95 backdrop-blur-2xl">
              <div className="px-4 py-4 space-y-1">
                {navLinks.map((l) => {
                  const isActive = activeId === l.href.replace("#", "");
                  return (
                    <a
                      key={l.href}
                      href={l.href}
                      aria-current={isActive ? "true" : undefined}
                      className={`block text-sm py-2.5 px-3 rounded-lg transition-all ${
                        isActive
                          ? "text-primary bg-[hsl(96,90%,45%,0.1)]"
                          : "text-[hsl(220,10%,78%)] hover:text-foreground hover:bg-[hsl(96,90%,45%,0.08)]"
                      }`}
                      onClick={(e) => handleNavClick(e, l.href)}
                    >
                      {l.label}
                    </a>
                  );
                })}
                <div className="pt-3 flex flex-col gap-2 border-t border-[hsl(96,90%,45%,0.1)] mt-3">
                  <LanguageSwitcher variant="outline" size="sm" className="justify-start gap-2 rounded-lg h-10 border-[hsl(96,90%,45%,0.15)]" />
                  <Button variant="outline" size="sm" className="rounded-lg h-10 border-[hsl(96,90%,45%,0.15)] text-foreground" asChild>
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
