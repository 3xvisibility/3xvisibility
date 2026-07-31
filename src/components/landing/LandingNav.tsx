import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import logo3x from "@/assets/logo-3x.png";

// Height of the fixed navbar (h-16 = 64px) plus a little breathing room,
// used to offset section scrolls so they don't sit under the header.
const NAV_OFFSET = 80;

/** Smooth-scroll so the element's top sits just below the fixed navbar. */
function scrollToElement(el: HTMLElement | null) {
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
  window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
}



export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Default active section when there's no URL hash on the home page.
  const DEFAULT_ACTIVE_ID = "features";
  const [activeId, setActiveId] = useState<string>(() => {
    if (typeof window === "undefined" || window.location.pathname !== "/") return "";
    return window.location.hash.replace("#", "") || DEFAULT_ACTIVE_ID;
  });
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
    scrollToElement(document.getElementById(id));
    // Sync the active state immediately so the nav highlight matches the click.
    setActiveId(id);
    // Keep the hash in the URL so a reload restores the same section.
    if (window.history.replaceState) {
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    const id = href.replace("#", "");
    // Close the mobile menu only after the smooth scroll has finished.
    const closeMenuAfterScroll = () => {
      let idleTimer: ReturnType<typeof setTimeout>;
      const finish = () => {
        window.removeEventListener("scroll", onScroll);
        setMobileOpen(false);
      };
      const onScroll = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(finish, 120);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      // Fallback in case no scroll fires (already at target).
      idleTimer = setTimeout(finish, 700);
    };
    if (location.pathname === "/") {
      scrollToId(id);
      closeMenuAfterScroll();
    } else {
      // Navigate home first, then scroll once the sections have mounted.
      navigate("/");
      setTimeout(() => {
        scrollToId(id);
        closeMenuAfterScroll();
      }, 300);
    }
  };

  useEffect(() => {
    let ticking = false;
    // Throttle scroll handling to one update per animation frame.
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 10);
        ticking = false;
      });
    };
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
        scrollToElement(el);
        setActiveId(id);
      } else if (attempts < 20) {
        attempts += 1;
        setTimeout(tryScroll, 100);
      } else {
        // Fallback: hash points to a section that doesn't exist —
        // clear the hash and scroll back to the top.
        window.history.replaceState(null, "", window.location.pathname);
        window.scrollTo({ top: 0, behavior: "smooth" });
        setActiveId(DEFAULT_ACTIVE_ID);
      }
    };
    // Defer so sections have a chance to render after reload.
    setTimeout(tryScroll, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser back/forward: scroll to the section for the current URL hash.
  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname !== "/") return;
      const hash = window.location.hash.replace("#", "");
      if (!hash) {
        // No hash (e.g. navigated back to the base URL) — return to top.
        window.scrollTo({ top: 0, behavior: "smooth" });
        setActiveId(DEFAULT_ACTIVE_ID);
        return;
      }
      const el = document.getElementById(hash);
      if (el) {
        scrollToElement(el);
        setActiveId(hash);
      } else {
        // Fallback: unknown section — clear the hash and scroll to top.
        window.history.replaceState(null, "", window.location.pathname);
        window.scrollTo({ top: 0, behavior: "smooth" });
        setActiveId(DEFAULT_ACTIVE_ID);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
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
        // Prefer intersecting sections; among them pick the one closest to the
        // top activation band so short sections still register reliably.
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length > 0) {
          const top = intersecting.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
          setActiveId(top.target.id);
        }
      },
      {
        // Activation band sits just below the fixed navbar and spans the
        // upper-middle of the viewport for stable, early section detection.
        rootMargin: `-${NAV_OFFSET}px 0px -60% 0px`,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
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
        className={`transition-all duration-500 ${scrolled ? "bg-[hsl(250,30%,100%)]/80 backdrop-blur-2xl border-b border-[hsl(258,88%,58%,0.08)]" : "bg-transparent"}`}
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
                      ? "text-primary bg-[hsl(258,88%,58%,0.1)]"
                      : "text-[hsl(220,12%,48%)] hover:text-foreground"
                  }`}
                >
                  {l.label}
                </a>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            <LanguageSwitcher variant="ghost" size="icon" className="h-9 w-auto px-2 text-[hsl(220,12%,45%)] hover:text-foreground rounded-lg" />
            <Button variant="ghost" size="sm" className="text-sm h-9 px-4 rounded-lg font-medium text-[hsl(220,12%,48%)] hover:text-foreground hover:bg-[hsl(258,88%,58%,0.08)]" asChild>
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
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="lg:hidden border-t border-[hsl(258,88%,58%,0.1)] overflow-hidden bg-[hsl(250,30%,100%)]/95 backdrop-blur-2xl">
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
                          ? "text-primary bg-[hsl(258,88%,58%,0.1)]"
                          : "text-[hsl(220,12%,48%)] hover:text-foreground hover:bg-[hsl(258,88%,58%,0.08)]"
                      }`}
                      onClick={(e) => handleNavClick(e, l.href)}
                    >
                      {l.label}
                    </a>
                  );
                })}
                <div className="pt-3 flex flex-col gap-2 border-t border-[hsl(258,88%,58%,0.1)] mt-3">
                  <LanguageSwitcher variant="outline" size="sm" className="justify-start gap-2 rounded-lg h-10 border-[hsl(258,88%,58%,0.15)]" />
                  <Button variant="outline" size="sm" className="rounded-lg h-10 border-[hsl(258,88%,58%,0.15)] text-foreground" asChild>
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
