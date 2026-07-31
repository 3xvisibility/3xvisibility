import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getPostBySlug, getLocalizedPosts } from "@/data/blog";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Language } from "@/i18n/translations";
import NotFound from "@/pages/NotFound";

const UI: Partial<Record<Language, { back: string; keepReading: string }>> = {
  en: { back: "Back to blog", keepReading: "Keep reading" },
  fr: { back: "Retour au blog", keepReading: "Continuer la lecture" },
  de: { back: "Zurück zum Blog", keepReading: "Weiterlesen" },
  es: { back: "Volver al blog", keepReading: "Seguir leyendo" },
};

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const post = slug ? getPostBySlug(slug, language) : undefined;

  if (!post) return <NotFound />;

  const ui = UI[language] ?? UI.en;
  const related = getLocalizedPosts(language)
    .filter((p) => p.slug !== post.slug)
    .slice(0, 2);

  return (
    <>
      <Seo
        title={post.title}
        description={post.excerpt}
        path={`/blog/${post.slug}`}
        image={post.image}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          image: post.image,
          datePublished: post.date,
          url: `https://3xvisibility.com/blog/${post.slug}`,
          author: { "@type": "Organization", name: "3XVISIBILITY" },
        }}
      />
      <StaticPageLayout title={post.title} subtitle={post.excerpt}>
        <div className="not-prose mb-2">
          <Link to="/blog" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> {ui.back}
          </Link>
        </div>

        <p className="not-prose text-xs uppercase tracking-widest text-[hsl(250,15%,45%)]">
          {post.category} · {post.date}
        </p>

        <figure className="not-prose my-6 overflow-hidden rounded-2xl border border-[hsl(96,67%,48%,0.12)]">
          <img
            src={post.image}
            alt={post.title}
            width={1024}
            height={576}
            className="w-full object-cover"
          />
        </figure>

        {post.intro.map((p, i) => (
          <p key={i}>{p}</p>
        ))}

        {post.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs?.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {section.bullets && (
              <ul>
                {section.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {related.length > 0 && (
          <div className="not-prose mt-12 border-t border-[hsl(96,67%,48%,0.08)] pt-8">
            <h2 className="text-lg font-semibold tracking-tight">{ui.keepReading}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {related.map((p) => (
                <Link
                  to={`/blog/${p.slug}`}
                  key={p.slug}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[hsl(96,67%,48%,0.12)] bg-[hsl(250,30%,8%,0.4)] hover:border-[hsl(96,67%,48%,0.35)] transition-all"
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img src={p.image} alt={p.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-semibold leading-snug group-hover:text-primary transition-colors">{p.title}</h3>
                    <p className="mt-1 text-sm text-[hsl(250,15%,65%)]">{p.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </StaticPageLayout>
    </>
  );
}
