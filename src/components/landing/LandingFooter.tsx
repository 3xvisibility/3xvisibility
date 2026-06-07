import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import logo3x from "@/assets/logo-3x.png";

const socials = [
  {
    label: "Facebook",
    href: "#",
    path: "M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22c4.78-.79 8.43-4.94 8.43-9.94Z",
  },
  {
    label: "Instagram",
    href: "#",
    path: "M12 2c2.72 0 3.06.01 4.12.06 1.07.05 1.8.22 2.43.47.66.25 1.22.6 1.77 1.15.55.55.9 1.11 1.15 1.77.25.63.42 1.36.47 2.43.05 1.07.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.07-.22 1.8-.47 2.43a4.9 4.9 0 0 1-1.15 1.77c-.55.55-1.11.9-1.77 1.15-.63.25-1.36.42-2.43.47-1.07.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.07-.05-1.8-.22-2.43-.47a4.9 4.9 0 0 1-1.77-1.15 4.9 4.9 0 0 1-1.15-1.77c-.25-.63-.42-1.36-.47-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.07.22-1.8.47-2.43.25-.66.6-1.22 1.15-1.77.55-.55 1.11-.9 1.77-1.15.63-.25 1.36-.42 2.43-.47C8.94 2.01 9.28 2 12 2Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.25a3.25 3.25 0 1 1 0-6.5 3.25 3.25 0 0 1 0 6.5ZM17.5 5.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z",
  },
  {
    label: "X",
    href: "#",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z",
  },
  {
    label: "LinkedIn",
    href: "#",
    path: "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z",
  },
  {
    label: "TikTok",
    href: "#",
    path: "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .59.05.86.13V9.4a6.33 6.33 0 0 0-5.94 10.36 6.33 6.33 0 0 0 10.95-4.32V8.7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.53-.13Z",
  },
  {
    label: "YouTube",
    href: "#",
    path: "M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8ZM9.6 15.57V8.43L15.82 12 9.6 15.57Z",
  },
];

interface FooterLink {
  label: string;
  href: string;
  isHash: boolean;
  badge?: string;
  comingSoon?: boolean;
}

function SmoothScrollLink({ href, children }: { href: string; children: React.ReactNode }) {
  const location = useLocation();
  const isSamePageHash = href.startsWith("/#") && location.pathname === "/";

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isSamePageHash) {
      e.preventDefault();
      const targetId = href.replace("/#", "");
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", href);
      }
    }
  };

  return (
    <a href={href} onClick={handleClick} className="text-xs text-[hsl(250,15%,50%)] hover:text-foreground transition-colors duration-200">
      {children}
    </a>
  );
}

export function LandingFooter() {
  const { t } = useLanguage();

  const handleComingSoon = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.info(t("footer.comingSoonTitle") || "Coming Soon", {
      description: t("footer.comingSoonDesc") || "PrestaShop integration is under development. Stay tuned!",
    });
  };

  const footerLinks: Record<string, FooterLink[]> = {
    [t("footer.product")]: [
      { label: t("footer.features"), href: "/#features", isHash: true },
      { label: t("footer.pricing"), href: "/#pricing", isHash: true },
      { label: t("footer.faq"), href: "/#faq", isHash: true },
      { label: t("footer.apiDocs"), href: "/docs", isHash: false },
    ],
    [t("footer.integrations")]: [
      { label: t("footer.wordpress"), href: "/#integrations", isHash: true },
      { label: t("footer.shopify"), href: "/#integrations", isHash: true },
      { label: t("footer.prestaShop"), href: "#", isHash: true, badge: t("footer.comingSoon"), comingSoon: true },
    ],
    [t("footer.company")]: [
      { label: t("footer.about"), href: "/about", isHash: false },
      { label: t("footer.contact"), href: "/contact", isHash: false },
      { label: t("footer.blog"), href: "/blog", isHash: false },
      { label: t("footer.changelog"), href: "/changelog", isHash: false },
    ],
    [t("footer.legal")]: [
      { label: t("footer.privacy"), href: "/privacy", isHash: false },
      { label: t("footer.terms"), href: "/terms", isHash: false },
    ],
  };

  return (
    <footer className="border-t border-[hsl(96,90%,45%,0.08)] py-14 md:py-16">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo3x} alt="3X Visibility logo" width={28} height={28} loading="lazy" className="h-7 w-7 rounded-lg" />
              <span className="flex flex-col leading-none">
                <span className="text-sm font-bold tracking-tight">
                  <span className="text-primary">3X</span>visibility
                </span>
                <span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[hsl(250,15%,45%)] mt-0.5">Build Smarter, Ranking Faster</span>
              </span>
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
                  <li key={link.label} className="flex items-center gap-1.5 flex-wrap">
                    {link.comingSoon ? (
                      <button
                        onClick={handleComingSoon}
                        className="text-xs text-[hsl(250,15%,35%)] cursor-default transition-colors duration-200 flex items-center gap-1"
                      >
                        {link.label}
                      </button>
                    ) : link.isHash ? (
                      <SmoothScrollLink href={link.href}>{link.label}</SmoothScrollLink>
                    ) : (
                      <Link to={link.href} className="text-xs text-[hsl(250,15%,50%)] hover:text-foreground transition-colors duration-200">
                        {link.label}
                      </Link>
                    )}
                    {link.badge && (
                      <span className="inline-flex items-center rounded-full bg-[hsl(96,90%,45%,0.12)] px-1.5 py-0.5 text-[9px] font-medium text-[hsl(96,90%,55%)] uppercase tracking-wide">
                        {link.badge}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-[hsl(96,90%,45%,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-[hsl(250,15%,35%)]">
            &copy; {new Date().getFullYear()} 3XVISIBILITY. {t("footer.rights")}
          </p>
          <div className="flex items-center gap-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="text-[hsl(250,15%,45%)] hover:text-foreground transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
