import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

export function LandingFooter() {
  const { t } = useLanguage();

  const footerLinks = {
    [t("footer.product")]: [
      { label: t("footer.features"), href: "#features" },
      { label: t("footer.pricing"), href: "#pricing" },
      { label: t("footer.faq"), href: "#faq" },
      { label: "Documentation", href: "/docs" },
      { label: t("footer.changelog"), href: "#" },
    ],
    [t("footer.integrations")]: [
      { label: t("footer.wordpress"), href: "#" },
      { label: t("footer.shopify"), href: "#" },
      { label: t("footer.apiDocs"), href: "/docs" },
    ],
    [t("footer.company")]: [
      { label: t("footer.about"), href: "#" },
      { label: t("footer.blog"), href: "#" },
      { label: t("footer.contact"), href: "#" },
    ],
    [t("footer.legal")]: [
      { label: t("footer.privacy"), href: "#" },
      { label: t("footer.terms"), href: "#" },
    ],
  };

  return (
    <footer className="border-t border-[hsl(262,83%,58%,0.08)] py-14 md:py-16">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-[hsl(280,80%,65%)] flex items-center justify-center">
                <span className="text-[10px] font-black text-primary-foreground">P</span>
              </div>
              <span className="text-sm font-bold tracking-tight">PageGen</span>
            </Link>
            <p className="mt-3 text-xs text-[hsl(250,15%,40%)] leading-relaxed max-w-[200px]">
              {t("footer.description")}
            </p>
          </div>

          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h4 className="font-semibold text-[11px] uppercase tracking-[0.15em] text-[hsl(250,15%,40%)] mb-4">{group}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-xs text-[hsl(250,15%,50%)] hover:text-foreground transition-colors duration-200">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-[hsl(262,83%,58%,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-[hsl(250,15%,35%)]">
            © {new Date().getFullYear()} PageGen. {t("footer.rights")}
          </p>
          <div className="flex items-center gap-5 text-[11px] text-[hsl(250,15%,35%)]">
            <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="#" className="hover:text-foreground transition-colors">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
