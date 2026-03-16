import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
    { label: "Changelog", href: "#" },
  ],
  Integrations: [
    { label: "WordPress", href: "#" },
    { label: "Shopify", href: "#" },
    { label: "API Docs", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
  ],
};

export function LandingFooter() {
  return (
    <footer className="border-t border-border/40 py-16 md:py-20">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-7 w-7 rounded-lg bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/15">
                <Zap className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-base font-bold tracking-tight">PageGen</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-[200px]">
              Deploy data-driven content at scale.
            </p>
          </div>

          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h4 className="font-semibold text-xs uppercase tracking-[0.15em] text-foreground/70 mb-4">{group}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} PageGen. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-xs text-muted-foreground/60">
            <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="#" className="hover:text-foreground transition-colors">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
