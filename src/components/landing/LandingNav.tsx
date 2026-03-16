import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Zap } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Reviews", href: "#reviews" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">PageGen</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth">Log in</Link>
          </Button>
          <Button size="sm" className="bg-gradient-primary border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 transition-all duration-200 active:scale-[0.97]" asChild>
            <Link to="/auth">Get Started Free</Link>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur-xl px-4 py-4 space-y-3">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block text-sm text-muted-foreground hover:text-foreground py-1.5"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/auth">Log in</Link>
            </Button>
            <Button size="sm" className="bg-gradient-primary border-0" asChild>
              <Link to="/auth">Get Started Free</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
