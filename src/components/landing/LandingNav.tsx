import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`rounded-2xl border transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-2xl border-border/40 shadow-lg shadow-background/10"
            : "bg-background/50 backdrop-blur-xl border-border/20"
        }`}
      >
        <div className="flex items-center justify-between h-12 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--primary-glow))] flex items-center justify-center">
              <span className="text-[10px] font-black text-primary-foreground">P</span>
            </div>
            <span className="text-sm font-bold tracking-tight">PageGen</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-muted/50 rounded-xl px-1 py-0.5">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-background/80 transition-all duration-200 font-medium"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
              onClick={toggleDarkMode}
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-3 rounded-lg font-medium" asChild>
              <Link to="/auth">Log in</Link>
            </Button>
            <Button
              size="sm"
              className="bg-foreground text-background hover:bg-foreground/90 text-xs h-7 px-4 rounded-lg font-semibold"
              asChild
            >
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-7 w-7"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-border/20 overflow-hidden"
            >
              <div className="px-3 py-3 space-y-0.5">
                {navLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className="block text-sm text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg hover:bg-accent/50 transition-all"
                    onClick={() => setMobileOpen(false)}
                  >
                    {l.label}
                  </a>
                ))}
                <div className="pt-2 flex flex-col gap-1.5 border-t border-border/20 mt-2">
                  <Button variant="outline" size="sm" onClick={toggleDarkMode} className="justify-start gap-2 rounded-lg h-9 border-border/30">
                    {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                    {isDark ? "Light mode" : "Dark mode"}
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-lg h-9" asChild>
                    <Link to="/auth">Log in</Link>
                  </Button>
                  <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90 rounded-lg h-9 font-semibold" asChild>
                    <Link to="/auth">Get Started</Link>
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
