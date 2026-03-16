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
          ? "bg-background/60 backdrop-blur-2xl border-b border-border/30 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-14 px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-lg bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow duration-300">
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

        <div className="hidden md:flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
            onClick={toggleDarkMode}
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground text-[13px] h-8 px-3 rounded-full"
            asChild
          >
            <Link to="/auth">Log in</Link>
          </Button>
          <Button
            size="sm"
            className="bg-primary/80 backdrop-blur-xl border border-primary/40 shadow-[0_4px_16px_hsl(var(--primary)/.25),inset_0_1px_0_rgba(255,255,255,.15)] hover:bg-primary/90 hover:shadow-[0_6px_24px_hsl(var(--primary)/.35)] transition-all duration-300 active:scale-[0.97] text-[13px] h-8 px-4 rounded-full text-primary-foreground font-medium"
            asChild
          >
            <Link to="/auth">Get Started Free</Link>
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
            className="md:hidden border-t border-border/30 bg-background/80 backdrop-blur-2xl overflow-hidden"
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
              <div className="pt-2 flex flex-col gap-1.5 border-t border-border/30 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleDarkMode}
                  className="justify-start gap-2 rounded-full h-9 bg-background/50 backdrop-blur-xl border-border/40"
                >
                  {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  {isDark ? "Light mode" : "Dark mode"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full h-9 bg-background/50 backdrop-blur-xl border-border/40"
                  asChild
                >
                  <Link to="/auth">Log in</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-primary/80 backdrop-blur-xl border border-primary/40 shadow-[0_4px_16px_hsl(var(--primary)/.25),inset_0_1px_0_rgba(255,255,255,.15)] rounded-full h-9 text-primary-foreground"
                  asChild
                >
                  <Link to="/auth">Get Started Free</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
