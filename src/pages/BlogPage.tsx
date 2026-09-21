import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getLocalizedPosts } from "@/data/blog";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Language } from "@/i18n/translations";

const UI: Partial<
  Record<
    Language,
    {
      title: string;
      subtitle: string;
      readMore: string;
      more: string;
      listHeading: string;
      intro: string;
      glossaryTitle: string;
      glossaryIntro: string;
      glossary: { name: string; definition: string }[];
    }
  >
> = {
  en: {
    title: "Blog",
    subtitle: "Product updates, SEO playbooks and engineering notes from the 3x Visibility team.",
    readMore: "Read more",
    more: "More posts coming soon — follow us for updates.",
    listHeading: "Latest articles",
    intro:
      "We write about what we ship and what we learn while scaling pages: how to structure data for programmatic SEO, how to keep generated pages useful for readers and search engines, and how to make content answer-engine friendly. New articles are published regularly.",
    glossaryTitle: "The three engines of search, in one paragraph each",
    glossaryIntro:
      "Our articles use three terms that often get blurred together. Here is the short version before you dive in:",
    glossary: [
      { name: "SEO", definition: "Search Engine Optimisation — earning a place in the classic list of search results." },
      { name: "AEO", definition: "Answer Engine Optimisation — earning a place inside an answer box or AI Overview, where the user never clicks." },
      { name: "GEO", definition: "Generative Engine Optimisation — earning a named citation inside a generative AI recommendation." },
      { name: "Programmatic SEO", definition: "Building large sets of pages automatically from structured data, where each page targets a specific searched intent." },
    ],
  },
  fr: {
    title: "Blog",
    subtitle: "Nouveautés produit, guides SEO et notes d'ingénierie de l'équipe 3x Visibility.",
    readMore: "Lire la suite",
    more: "D'autres articles arrivent bientôt — suivez-nous pour les mises à jour.",
    listHeading: "Derniers articles",
    intro:
      "Nous écrivons sur ce que nous livrons et sur ce que nous apprenons en mettant des pages à l'échelle : comment structurer les données pour le SEO programmatique, comment garder les pages générées utiles pour les lecteurs et les moteurs de recherche, et comment rendre le contenu adapté aux moteurs de réponses.",
    glossaryTitle: "Les trois moteurs de la recherche, en un paragraphe chacun",
    glossaryIntro: "Nos articles utilisent trois termes souvent confondus. Voici la version courte :",
    glossary: [
      { name: "SEO", definition: "Search Engine Optimization — obtenir une place dans la liste classique des résultats de recherche." },
      { name: "AEO", definition: "Answer Engine Optimization — obtenir une place dans une boîte de réponse ou un AI Overview." },
      { name: "GEO", definition: "Generative Engine Optimization — obtenir une citation nommée dans une recommandation d'IA générative." },
      { name: "SEO programmatique", definition: "Créer automatiquement de grands ensembles de pages à partir de données structurées." },
    ],
  },
  de: {
    title: "Blog",
    subtitle: "Produkt-Updates, SEO-Playbooks und Engineering-Notizen vom 3x Visibility-Team.",
    readMore: "Weiterlesen",
    more: "Weitere Beiträge folgen bald — folgen Sie uns für Updates.",
    listHeading: "Neueste Artikel",
    intro:
      "Wir schreiben über das, was wir veröffentlichen, und was wir beim Skalieren von Seiten lernen: wie man Daten für programmatisches SEO strukturiert, wie generierte Seiten für Leser und Suchmaschinen nützlich bleiben und wie man Inhalte antwortmaschinenfreundlich macht.",
    glossaryTitle: "Die drei Suchmaschinen-Engines in je einem Absatz",
    glossaryIntro: "Unsere Artikel verwenden drei Begriffe, die oft vermischt werden. Hier die Kurzfassung:",
    glossary: [
      { name: "SEO", definition: "Search Engine Optimization — einen Platz in der klassischen Ergebnisliste erhalten." },
      { name: "AEO", definition: "Answer Engine Optimization — einen Platz in einer Antwortbox oder AI Overview erhalten." },
      { name: "GEO", definition: "Generative Engine Optimization — namentlich in einer KI-Empfehlung zitiert werden." },
      { name: "Programmatisches SEO", definition: "Automatisches Erstellen großer Seitenmengen aus strukturierten Daten." },
    ],
  },
  es: {
    title: "Blog",
    subtitle: "Novedades de producto, guías de SEO y notas de ingeniería del equipo de 3x Visibility.",
    readMore: "Leer más",
    more: "Pronto más artículos — síguenos para novedades.",
    listHeading: "Últimos artículos",
    intro:
      "Escribimos sobre lo que publicamos y lo que aprendimos al escalar páginas: cómo estructurar datos para SEO programático, cómo mantener las páginas generadas útiles para lectores y motores de búsqueda, y cómo hacer el contenido amigable para motores de respuestas.",
    glossaryTitle: "Los tres motores de búsqueda, en un párrafo cada uno",
    glossaryIntro: "Nuestros artículos usan tres términos que suelen confundirse. Aquí está la versión corta:",
    glossary: [
      { name: "SEO", definition: "Search Engine Optimization — obtener un lugar en la lista clásica de resultados." },
      { name: "AEO", definition: "Answer Engine Optimization — obtener un lugar en una caja de respuesta o AI Overview." },
      { name: "GEO", definition: "Generative Engine Optimization — obtener una cita con nombre en una recomendación de IA generativa." },
      { name: "SEO programático", definition: "Crear grandes conjuntos de páginas automáticamente a partir de datos estructurados." },
    ],
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
        titleFull="3xVisibility blog — SEO, GEO & AEO playbooks"
        description={ui.subtitle}
        path="/blog"
        image="https://www.3xvisibility.com/og-image.png"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "3x Visibility Blog",
          url: "https://www.3xvisibility.com/blog",
          blogPost: posts.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            description: p.excerpt,
            url: `https://www.3xvisibility.com/blog/${p.slug}`,
          })),
        }}
      />
      <StaticPageLayout title={ui.title} subtitle={ui.subtitle}>
        <h2>{ui.listHeading}</h2>
        <div className="not-prose grid gap-6 sm:grid-cols-2">
          {posts.map((p, i) => (
            <Link
              to={`/blog/${p.slug}`}
              key={p.slug}
              className={`group flex flex-col overflow-hidden rounded-2xl border border-[hsl(96,67%,48%,0.12)] bg-[hsl(250,30%,98%)] hover:border-[hsl(96,67%,48%,0.35)] transition-all duration-300 ${
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
                <span className="absolute top-3 left-3 rounded-full border border-[hsl(96,67%,48%,0.25)] bg-[hsl(250,30%,6%,0.6)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary backdrop-blur-sm">
                  {p.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="mt-2 text-xl font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">{p.title}</h3>
                <p className="mt-2 text-sm text-[hsl(220,12%,45%)]">{p.excerpt}</p>
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
