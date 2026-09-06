import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import logo3x from "@/assets/logo-3x.png";

const socials = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61593932319163",
    path: "M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22c4.78-.79 8.43-4.94 8.43-9.94Z",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/146284032",
    path: "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z",
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
    <a href={href} onClick={handleClick} className="text-xs text-[hsl(250,10%,25%)] hover:text-foreground transition-colors duration-200">
      {children}
    </a>
  );
}

export function LandingFooter() {
  const { t } = useLanguage();

  const handleComingSoon = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.info(t("footer.comingSoonTitle"), {
      description: t("footer.comingSoonDesc"),
    });
  };

  const footerLinks: Record<string, FooterLink[]> = {
    [t("footer.product")]: [
      { label: t("footer.features"), href: "/#features", isHash: true },
      { label: t("footer.pricing"), href: "/pricing", isHash: false },
      { label: "Customer portal", href: "/portal", isHash: false },

      { label: t("footer.faq"), href: "/#faq", isHash: true },
      { label: t("footer.apiDocs"), href: "/docs", isHash: false },
    ],
    [t("footer.integrations")]: [
      { label: t("footer.wordpress"), href: "/guides/wordpress", isHash: false },
      { label: t("footer.shopify"), href: "/guides/shopify", isHash: false },
      { label: t("footer.prestaShop"), href: "#", isHash: true, badge: t("footer.comingSoon"), comingSoon: true },
    ],
    [t("footer.company")]: [
      { label: t("footer.about"), href: "/about", isHash: false },
      { label: t("footer.contact"), href: "/contact", isHash: false },
      { label: t("footer.blog"), href: "/blog", isHash: false },
      { label: t("footer.changelog"), href: "/changelog", isHash: false },
    ],
    [t("footer.legal")]: [
      { label: t("footer.cgv"), href: "/cgv", isHash: false },
      { label: t("footer.privacyPolicy"), href: "/confidentialite", isHash: false },
      { label: t("footer.legalNotice"), href: "/mentions-legales", isHash: false },
    ],
  };

  return (
    <footer className="border-t border-[hsl(96,67%,48%,0.08)] py-14 md:py-16">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center">
              <span className="relative inline-flex items-center rounded-full bg-[linear-gradient(135deg,hsl(240,18%,13%),hsl(245,22%,8%))] px-4 py-2 ring-1 ring-inset ring-white/10 shadow-[0_6px_20px_-8px_hsl(96,67%,30%,0.5)]">
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(120%_120%_at_0%_0%,hsl(96,67%,55%,0.2),transparent_60%)]" />
                <img src={logo3x} alt="3X Visibility logo" width={1107} height={261} loading="lazy" className="relative h-6 w-auto object-contain" />
              </span>
            </Link>
            <p className="mt-3 text-xs text-[hsl(250,10%,25%)] leading-relaxed max-w-[200px]">
              {t("footer.description")}
            </p>
          </div>

          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h4 className="font-semibold text-[11px] uppercase tracking-[0.15em] text-[hsl(250,10%,25%)] mb-4">{group}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label} className="flex items-center gap-1.5 flex-wrap">
                    {link.comingSoon ? (
                      <button
                        onClick={handleComingSoon}
                        className="text-xs text-[hsl(250,10%,25%)] cursor-default transition-colors duration-200 flex items-center gap-1"
                      >
                        {link.label}
                      </button>
                    ) : link.isHash ? (
                      <SmoothScrollLink href={link.href}>{link.label}</SmoothScrollLink>
                    ) : (
                      <Link to={link.href} className="text-xs text-[hsl(250,10%,25%)] hover:text-foreground transition-colors duration-200">
                        {link.label}
                      </Link>
                    )}
                    {link.badge && (
                      <span className="inline-flex items-center rounded-full bg-[hsl(96,67%,48%,0.12)] px-1.5 py-0.5 text-[9px] font-medium text-[hsl(96,67%,35%)] uppercase tracking-wide">
                        {link.badge}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-[hsl(96,67%,48%,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-[hsl(250,10%,25%)]">
            &copy; {new Date().getFullYear()} 3XVISIBILITY. {t("footer.rights")}
          </p>
          <div className="flex items-center gap-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="text-[hsl(250,10%,25%)] hover:text-foreground transition-colors"
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
