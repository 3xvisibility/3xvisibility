import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Zap, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Reviews", href: "#reviews" },
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
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/70 backdrop-blur-2xl border-b border-border/20"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-14 px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_16px_hsl(var(--primary)/.25)]">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-base font-bold tracking-tight">PageGen</span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-accent/50 transition-all duration-200"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
            onClick={toggleDarkMode}
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground text-[13px] h-8 px-3 rounded-lg"
            asChild
          >
            <Link to="/auth">Log in</Link>
          </Button>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_16px_hsl(var(--primary)/.2)] text-[13px] h-8 px-4 rounded-lg font-medium"
            asChild
          >
            <Link to="/auth">Get Started</Link>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8"
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
            className="md:hidden border-t border-border/20 bg-background/90 backdrop-blur-2xl overflow-hidden"
          >
            <div className="px-4 py-3 space-y-0.5">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleDarkMode}
                  className="justify-start gap-2 rounded-lg h-9 border-border/30"
                >
                  {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  {isDark ? "Light mode" : "Dark mode"}
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg h-9 border-border/30" asChild>
                  <Link to="/auth">Log in</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg h-9 shadow-[0_0_16px_hsl(var(--primary)/.2)]"
                  asChild
                >
                  <Link to="/auth">Get Started</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
