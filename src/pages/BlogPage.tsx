import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getLocalizedPosts } from "@/data/blog";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Language } from "@/i18n/translations";

const UI: Partial<Record<Language, { title: string; subtitle: string; readMore: string; more: string }>> = {
  en: {
    title: "Blog",
    subtitle: "Product updates, SEO playbooks and engineering notes from the 3XVISIBILITY team.",
    readMore: "Read more",
    more: "More posts coming soon — follow us for updates.",
  },
  fr: {
    title: "Blog",
    subtitle: "Nouveautés produit, guides SEO et notes d'ingénierie de l'équipe 3XVISIBILITY.",
    readMore: "Lire la suite",
    more: "D'autres articles arrivent bientôt — suivez-nous pour les mises à jour.",
  },
  de: {
    title: "Blog",
    subtitle: "Produkt-Updates, SEO-Playbooks und Engineering-Notizen vom 3XVISIBILITY-Team.",
    readMore: "Weiterlesen",
    more: "Weitere Beiträge folgen bald — folgen Sie uns für Updates.",
  },
  es: {
    title: "Blog",
    subtitle: "Novedades de producto, guías de SEO y notas de ingeniería del equipo de 3XVISIBILITY.",
    readMore: "Leer más",
    more: "Pronto más artículos — síguenos para novedades.",
  },
};

export default function BlogPage() {
  const { language } = useLanguage();
  const posts = getLocalizedPosts(language);
  const ui = UI[language] ?? UI.en;

  return (
    <>
      <Seo
        title={ui.title}
        description={ui.subtitle}
        path="/blog"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "3XVISIBILITY Blog",
          url: "https://3xvisibility.com/blog",
          blogPost: posts.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            description: p.excerpt,
            url: `https://3xvisibility.com/blog/${p.slug}`,
          })),
        }}
      />
      <StaticPageLayout title={ui.title} subtitle={ui.subtitle}>
        <div className="not-prose grid gap-6 sm:grid-cols-2">
          {posts.map((p, i) => (
            <Link
              to={`/blog/${p.slug}`}
              key={p.slug}
              className={`group flex flex-col overflow-hidden rounded-2xl border border-[hsl(96,90%,45%,0.12)] bg-[hsl(250,30%,8%,0.4)] hover:border-[hsl(96,90%,45%,0.35)] transition-all duration-300 ${
                i === 0 ? "sm:col-span-2" : ""
              }`}
            >
              <div className={`relative overflow-hidden ${i === 0 ? "aspect-[2.4/1]" : "aspect-[16/9]"}`}>
                <img
                  src={p.image}
                  alt={p.title}
                  loading="lazy"
                  width={768}
                  height={512}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(250,30%,6%,0.7)] to-transparent" />
                <span className="absolute top-3 left-3 rounded-full border border-[hsl(96,90%,45%,0.25)] bg-[hsl(250,30%,6%,0.6)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary backdrop-blur-sm">
                  {p.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-xs uppercase tracking-widest text-[hsl(250,15%,45%)]">{p.date} · {p.readTime}</p>
                <h3 className="mt-2 text-xl font-semibold leading-snug group-hover:text-primary transition-colors">{p.title}</h3>
                <p className="mt-2 text-sm text-[hsl(250,15%,65%)]">{p.excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                  {ui.readMore} <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-10 text-sm">{ui.more}</p>
      </StaticPageLayout>
    </>
  );
}
