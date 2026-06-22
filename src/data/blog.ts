import programmaticSeo from "@/assets/blog/programmatic-seo.jpg";
import shopifyPublishing from "@/assets/blog/shopify-publishing.jpg";
import aiTemplates from "@/assets/blog/ai-templates.jpg";
import seoAeoGeo from "@/assets/blog/seo-aeo-geo-ai.jpg";
import type { Language } from "@/i18n/translations";

export interface BlogSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

/** Fields that get translated per language. */
export interface BlogPostContent {
  title: string;
  date: string;
  category: string;
  excerpt: string;
  readTime: string;
  intro: string[];
  sections: BlogSection[];
}

export interface BlogPost extends BlogPostContent {
  slug: string;
  image: string;
  /** Per-language overrides. English lives on the post itself. */
  l10n?: Partial<Record<Exclude<Language, "en">, BlogPostContent>>;
}

export const posts: BlogPost[] = [
  {
    slug: "seo-vs-aeo-vs-geo",
    title: "SEO vs AEO vs GEO: the three engines of search in 2026",
    date: "June 2026",
    category: "AI Search",
    excerpt:
      "Search is no longer one game. Learn how Search, Answer and Generative engine optimisation work — and how to win all three at once.",
    image: seoAeoGeo,
    readTime: "8 min read",
    intro: [
      "For two decades \"being found online\" meant one thing: ranking on Google. That era is over. Today a single buying decision can travel through three very different discovery layers — a classic search result, an AI answer box, and a generative chat recommendation. Each one rewards a different kind of content.",
      "We call these three layers SEO, AEO and GEO. Most teams obsess over the first and ignore the other two. The brands pulling ahead in 2026 are the ones treating all three as a single, connected strategy. Here is what each engine actually wants from you.",
    ],
    sections: [
      {
        heading: "SEO — Search Engine Optimisation",
        paragraphs: [
          "SEO is the original game: getting your website to appear in the classic list of blue links. When someone types \"best management consulting firm UK\" into Google, SEO is what decides whether your page shows up — and how high.",
          "It is still the largest source of intent-driven traffic on the planet, and it is still where trust is earned. But it is slow to build and increasingly squeezed by AI features pushing organic results further down the page.",
        ],
        bullets: [
          "What it gets you: your business's website appearing directly in search results.",
          "Pros: a proven, steady traffic driver that builds long-term authority.",
          "Cons: slow to show results and vulnerable to algorithm updates.",
          "How to rank higher: focus on high-intent keyword clusters specific to your service, and run regular technical audits while refreshing content quarterly.",
        ],
      },
      {
        heading: "AEO — Answer Engine Optimisation",
        paragraphs: [
          "AEO is about being the answer, not just a result. When Google's AI Overview or a voice assistant responds to \"what's the best consulting firm in London?\", AEO determines whether your expertise gets extracted into that answer box.",
          "This is where structured, concise, genuinely useful content wins. The catch: users often get what they need without ever clicking through — so brand visibility inside the answer matters as much as the click.",
        ],
        bullets: [
          "What it gets you: your expertise extracted into answer boxes and AI Overviews.",
          "Pros: instant authority and brand visibility, strong for voice and mobile queries.",
          "Cons: some users get the answer without clicking through, and snippet positions change frequently.",
          "How to rank higher: answer questions in 40–60 words under clear headings, and add structured FAQ and How-To schema.",
        ],
      },
      {
        heading: "GEO — Generative Engine Optimisation",
        paragraphs: [
          "GEO is the newest frontier: getting cited by name inside generative AI recommendations. When someone asks ChatGPT \"which London consulting firm should I work with?\", GEO is what gets your brand listed among the elite few it names.",
          "This is reputation at the model level. AI tools pull from credible, well-structured thought leadership across the web — not just your own site. Early movers here are building a moat competitors will struggle to cross.",
        ],
        bullets: [
          "What it gets you: getting cited by name in detailed AI-generated recommendations.",
          "Pros: early-mover advantage in AI search that positions your firm as a trusted authority.",
          "Cons: hard to measure direct impact and requires a multi-platform presence beyond your website.",
          "How to rank higher: create factual, entity-rich content following E-E-A-T principles, and contribute to the sources AI frequently references — industry reports, forums and publications.",
        ],
      },
      {
        heading: "Why you need all three",
        paragraphs: [
          "SEO gets your business found. AEO gets your expertise quoted. GEO gets your name recommended. Ignore any one of them and you hand that layer of discovery to a competitor.",
          "The good news: the same foundational work — clear, authoritative, well-structured content mapped to real questions your customers ask — feeds all three engines at once. That's exactly what 3XVISIBILITY is built to help you produce at scale.",
        ],
      },
    ],
    l10n: {
      fr: {
        title: "SEO vs AEO vs GEO : les trois moteurs de la recherche en 2026",
        date: "Juin 2026",
        category: "Recherche IA",
        excerpt:
          "La recherche n'est plus un seul jeu. Découvrez comment fonctionnent l'optimisation pour les moteurs de recherche, de réponse et génératifs — et comment gagner sur les trois à la fois.",
        readTime: "8 min de lecture",
        intro: [
          "Pendant deux décennies, « être trouvé en ligne » ne voulait dire qu'une chose : se classer sur Google. Cette époque est révolue. Aujourd'hui, une seule décision d'achat peut passer par trois couches de découverte très différentes — un résultat de recherche classique, une boîte de réponse IA et une recommandation issue d'un chat génératif. Chacune récompense un type de contenu différent.",
          "Nous appelons ces trois couches SEO, AEO et GEO. La plupart des équipes se concentrent sur la première et ignorent les deux autres. Les marques qui prennent de l'avance en 2026 traitent les trois comme une stratégie unique et connectée. Voici ce que chaque moteur attend réellement de vous.",
        ],
        sections: [
          {
            heading: "SEO — Optimisation pour les moteurs de recherche",
            paragraphs: [
              "Le SEO est le jeu d'origine : faire apparaître votre site web dans la liste classique de liens bleus. Lorsqu'une personne tape « meilleur cabinet de conseil en gestion » dans Google, c'est le SEO qui décide si votre page apparaît — et à quelle hauteur.",
              "Il reste la plus grande source de trafic intentionnel de la planète, et c'est encore là que la confiance se gagne. Mais il est lent à construire et de plus en plus comprimé par les fonctionnalités IA qui repoussent les résultats organiques vers le bas.",
            ],
            bullets: [
              "Ce que cela vous apporte : votre site web apparaît directement dans les résultats de recherche.",
              "Avantages : un moteur de trafic éprouvé et régulier qui bâtit une autorité à long terme.",
              "Inconvénients : lent à donner des résultats et vulnérable aux mises à jour d'algorithme.",
              "Comment mieux se classer : ciblez des grappes de mots-clés à forte intention propres à votre service, et menez des audits techniques réguliers en rafraîchissant le contenu chaque trimestre.",
            ],
          },
          {
            heading: "AEO — Optimisation pour les moteurs de réponse",
            paragraphs: [
              "L'AEO consiste à être la réponse, pas seulement un résultat. Lorsque l'AI Overview de Google ou un assistant vocal répond à « quel est le meilleur cabinet de conseil à Londres ? », l'AEO détermine si votre expertise est extraite dans cette boîte de réponse.",
              "C'est là que le contenu structuré, concis et réellement utile l'emporte. Le piège : les utilisateurs obtiennent souvent ce dont ils ont besoin sans jamais cliquer — la visibilité de la marque au sein de la réponse compte donc autant que le clic.",
            ],
            bullets: [
              "Ce que cela vous apporte : votre expertise extraite dans les boîtes de réponse et les AI Overviews.",
              "Avantages : autorité et visibilité de marque instantanées, idéal pour les requêtes vocales et mobiles.",
              "Inconvénients : certains utilisateurs obtiennent la réponse sans cliquer, et les positions des extraits changent souvent.",
              "Comment mieux se classer : répondez aux questions en 40 à 60 mots sous des titres clairs, et ajoutez des données structurées FAQ et How-To.",
            ],
          },
          {
            heading: "GEO — Optimisation pour les moteurs génératifs",
            paragraphs: [
              "Le GEO est la frontière la plus récente : être cité par son nom au sein des recommandations d'IA générative. Lorsqu'une personne demande à ChatGPT « avec quel cabinet de conseil londonien devrais-je travailler ? », c'est le GEO qui fait figurer votre marque parmi les rares élus qu'il nomme.",
              "C'est la réputation au niveau du modèle. Les outils d'IA s'appuient sur un leadership d'opinion crédible et bien structuré sur tout le web — pas seulement sur votre site. Les pionniers construisent ici un fossé que les concurrents auront du mal à franchir.",
            ],
            bullets: [
              "Ce que cela vous apporte : être cité par son nom dans des recommandations détaillées générées par l'IA.",
              "Avantages : avantage de pionnier dans la recherche IA qui positionne votre cabinet comme une autorité de confiance.",
              "Inconvénients : impact direct difficile à mesurer et nécessite une présence multiplateforme au-delà de votre site.",
              "Comment mieux se classer : créez un contenu factuel et riche en entités selon les principes E-E-A-T, et contribuez aux sources que l'IA référence souvent — rapports sectoriels, forums et publications.",
            ],
          },
          {
            heading: "Pourquoi vous avez besoin des trois",
            paragraphs: [
              "Le SEO fait trouver votre entreprise. L'AEO fait citer votre expertise. Le GEO fait recommander votre nom. Ignorez l'un d'eux et vous offrez cette couche de découverte à un concurrent.",
              "La bonne nouvelle : le même travail de fond — un contenu clair, faisant autorité et bien structuré, aligné sur les vraies questions de vos clients — alimente les trois moteurs à la fois. C'est exactement ce que 3XVISIBILITY est conçu pour vous aider à produire à grande échelle.",
            ],
          },
        ],
      },
      de: {
        title: "SEO vs. AEO vs. GEO: die drei Suchmaschinen-Engines im Jahr 2026",
        date: "Juni 2026",
        category: "KI-Suche",
        excerpt:
          "Suche ist nicht mehr nur ein Spiel. Erfahren Sie, wie Search-, Answer- und Generative-Engine-Optimierung funktionieren — und wie Sie alle drei zugleich gewinnen.",
        readTime: "8 Min. Lesezeit",
        intro: [
          "Zwei Jahrzehnte lang bedeutete „online gefunden werden\" nur eines: bei Google ranken. Diese Ära ist vorbei. Heute kann eine einzige Kaufentscheidung drei sehr unterschiedliche Entdeckungsebenen durchlaufen — ein klassisches Suchergebnis, eine KI-Antwortbox und eine generative Chat-Empfehlung. Jede belohnt eine andere Art von Inhalt.",
          "Wir nennen diese drei Ebenen SEO, AEO und GEO. Die meisten Teams konzentrieren sich auf die erste und ignorieren die anderen beiden. Die Marken, die 2026 vorne liegen, behandeln alle drei als eine einzige, vernetzte Strategie. Hier ist, was jede Engine wirklich von Ihnen will.",
        ],
        sections: [
          {
            heading: "SEO — Suchmaschinenoptimierung",
            paragraphs: [
              "SEO ist das ursprüngliche Spiel: Ihre Website in der klassischen Liste blauer Links erscheinen zu lassen. Wenn jemand „beste Unternehmensberatung\" bei Google eingibt, entscheidet SEO, ob Ihre Seite erscheint — und wie weit oben.",
              "Es ist nach wie vor die größte Quelle für absichtsgetriebenen Traffic der Welt und immer noch der Ort, an dem Vertrauen verdient wird. Aber es ist langsam aufzubauen und wird zunehmend durch KI-Funktionen verdrängt, die organische Ergebnisse weiter nach unten schieben.",
            ],
            bullets: [
              "Was es Ihnen bringt: Ihre Website erscheint direkt in den Suchergebnissen.",
              "Vorteile: ein bewährter, stetiger Traffic-Treiber, der langfristige Autorität aufbaut.",
              "Nachteile: liefert langsam Ergebnisse und ist anfällig für Algorithmus-Updates.",
              "Wie Sie besser ranken: Konzentrieren Sie sich auf hochintentionale Keyword-Cluster speziell für Ihren Service und führen Sie regelmäßige technische Audits durch, während Sie Inhalte vierteljährlich aktualisieren.",
            ],
          },
          {
            heading: "AEO — Answer-Engine-Optimierung",
            paragraphs: [
              "Bei AEO geht es darum, die Antwort zu sein, nicht nur ein Ergebnis. Wenn Googles AI Overview oder ein Sprachassistent auf „Was ist die beste Beratung in London?\" antwortet, bestimmt AEO, ob Ihre Expertise in diese Antwortbox aufgenommen wird.",
              "Hier gewinnen strukturierte, prägnante und wirklich nützliche Inhalte. Der Haken: Nutzer bekommen oft, was sie brauchen, ohne je zu klicken — die Markensichtbarkeit innerhalb der Antwort zählt also genauso wie der Klick.",
            ],
            bullets: [
              "Was es Ihnen bringt: Ihre Expertise wird in Antwortboxen und AI Overviews extrahiert.",
              "Vorteile: sofortige Autorität und Markensichtbarkeit, stark für Sprach- und mobile Suchanfragen.",
              "Nachteile: Manche Nutzer erhalten die Antwort ohne Klick, und Snippet-Positionen ändern sich häufig.",
              "Wie Sie besser ranken: Beantworten Sie Fragen in 40–60 Wörtern unter klaren Überschriften und fügen Sie strukturierte FAQ- und How-To-Daten hinzu.",
            ],
          },
          {
            heading: "GEO — Generative-Engine-Optimierung",
            paragraphs: [
              "GEO ist die neueste Grenze: namentlich in generativen KI-Empfehlungen zitiert zu werden. Wenn jemand ChatGPT fragt „mit welcher Londoner Beratung sollte ich arbeiten?\", sorgt GEO dafür, dass Ihre Marke unter den wenigen Auserwählten genannt wird.",
              "Das ist Reputation auf Modellebene. KI-Tools schöpfen aus glaubwürdiger, gut strukturierter Vordenkerschaft im gesamten Web — nicht nur von Ihrer eigenen Seite. Vorreiter bauen hier einen Graben, den Wettbewerber nur schwer überwinden können.",
            ],
            bullets: [
              "Was es Ihnen bringt: namentlich in detaillierten KI-generierten Empfehlungen zitiert zu werden.",
              "Vorteile: Vorreitervorteil in der KI-Suche, der Ihr Unternehmen als vertrauenswürdige Autorität positioniert.",
              "Nachteile: direkte Wirkung schwer messbar und erfordert eine plattformübergreifende Präsenz über Ihre Website hinaus.",
              "Wie Sie besser ranken: Erstellen Sie faktenbasierte, entitätenreiche Inhalte nach E-E-A-T-Prinzipien und tragen Sie zu den Quellen bei, die KI häufig referenziert — Branchenberichte, Foren und Publikationen.",
            ],
          },
          {
            heading: "Warum Sie alle drei brauchen",
            paragraphs: [
              "SEO macht Ihr Unternehmen auffindbar. AEO lässt Ihre Expertise zitieren. GEO lässt Ihren Namen empfehlen. Ignorieren Sie eines davon, überlassen Sie diese Entdeckungsebene einem Wettbewerber.",
              "Die gute Nachricht: Dieselbe Grundlagenarbeit — klare, autoritative, gut strukturierte Inhalte, die auf echte Kundenfragen abgestimmt sind — speist alle drei Engines zugleich. Genau dabei hilft Ihnen 3XVISIBILITY, das im großen Maßstab zu produzieren.",
            ],
          },
        ],
      },
      es: {
        title: "SEO vs AEO vs GEO: los tres motores de la búsqueda en 2026",
        date: "Junio 2026",
        category: "Búsqueda con IA",
        excerpt:
          "La búsqueda ya no es un solo juego. Descubre cómo funcionan la optimización para motores de búsqueda, de respuesta y generativos — y cómo ganar en los tres a la vez.",
        readTime: "8 min de lectura",
        intro: [
          "Durante dos décadas, «ser encontrado en línea» significaba una sola cosa: posicionarse en Google. Esa era terminó. Hoy una sola decisión de compra puede pasar por tres capas de descubrimiento muy diferentes — un resultado de búsqueda clásico, una caja de respuesta de IA y una recomendación de chat generativo. Cada una premia un tipo de contenido distinto.",
          "Llamamos a estas tres capas SEO, AEO y GEO. La mayoría de los equipos se obsesionan con la primera e ignoran las otras dos. Las marcas que se adelantan en 2026 tratan las tres como una única estrategia conectada. Esto es lo que cada motor realmente quiere de ti.",
        ],
        sections: [
          {
            heading: "SEO — Optimización para motores de búsqueda",
            paragraphs: [
              "El SEO es el juego original: lograr que tu sitio web aparezca en la lista clásica de enlaces azules. Cuando alguien escribe «mejor consultora de gestión» en Google, el SEO decide si tu página aparece — y a qué altura.",
              "Sigue siendo la mayor fuente de tráfico con intención del planeta, y aún es donde se gana la confianza. Pero es lento de construir y cada vez más comprimido por las funciones de IA que empujan los resultados orgánicos hacia abajo.",
            ],
            bullets: [
              "Qué te aporta: tu sitio web aparece directamente en los resultados de búsqueda.",
              "Ventajas: un motor de tráfico probado y constante que construye autoridad a largo plazo.",
              "Desventajas: tarda en dar resultados y es vulnerable a las actualizaciones de algoritmo.",
              "Cómo posicionar mejor: enfócate en grupos de palabras clave de alta intención específicos de tu servicio, y realiza auditorías técnicas periódicas actualizando el contenido cada trimestre.",
            ],
          },
          {
            heading: "AEO — Optimización para motores de respuesta",
            paragraphs: [
              "El AEO consiste en ser la respuesta, no solo un resultado. Cuando el AI Overview de Google o un asistente de voz responde a «¿cuál es la mejor consultora en Londres?», el AEO determina si tu experiencia se extrae en esa caja de respuesta.",
              "Aquí gana el contenido estructurado, conciso y realmente útil. El truco: los usuarios suelen obtener lo que necesitan sin hacer clic — así que la visibilidad de marca dentro de la respuesta importa tanto como el clic.",
            ],
            bullets: [
              "Qué te aporta: tu experiencia extraída en cajas de respuesta y AI Overviews.",
              "Ventajas: autoridad y visibilidad de marca instantáneas, ideal para consultas de voz y móviles.",
              "Desventajas: algunos usuarios obtienen la respuesta sin hacer clic, y las posiciones de los fragmentos cambian con frecuencia.",
              "Cómo posicionar mejor: responde preguntas en 40–60 palabras bajo títulos claros, y añade datos estructurados de FAQ y How-To.",
            ],
          },
          {
            heading: "GEO — Optimización para motores generativos",
            paragraphs: [
              "El GEO es la frontera más nueva: ser citado por tu nombre dentro de las recomendaciones de IA generativa. Cuando alguien le pregunta a ChatGPT «¿con qué consultora de Londres debería trabajar?», el GEO hace que tu marca figure entre las pocas elegidas que menciona.",
              "Es reputación a nivel del modelo. Las herramientas de IA se nutren de un liderazgo de opinión creíble y bien estructurado en toda la web — no solo de tu sitio. Los pioneros aquí construyen un foso que a los competidores les costará cruzar.",
            ],
            bullets: [
              "Qué te aporta: ser citado por tu nombre en recomendaciones detalladas generadas por IA.",
              "Ventajas: ventaja de pionero en la búsqueda con IA que posiciona a tu firma como una autoridad de confianza.",
              "Desventajas: impacto directo difícil de medir y requiere presencia multiplataforma más allá de tu sitio.",
              "Cómo posicionar mejor: crea contenido factual y rico en entidades siguiendo los principios E-E-A-T, y contribuye a las fuentes que la IA referencia con frecuencia — informes del sector, foros y publicaciones.",
            ],
          },
          {
            heading: "Por qué necesitas los tres",
            paragraphs: [
              "El SEO hace que encuentren tu negocio. El AEO hace que citen tu experiencia. El GEO hace que recomienden tu nombre. Ignora cualquiera de ellos y entregarás esa capa de descubrimiento a un competidor.",
              "La buena noticia: el mismo trabajo de base — contenido claro, con autoridad y bien estructurado, alineado con las preguntas reales de tus clientes — alimenta los tres motores a la vez. Eso es exactamente lo que 3XVISIBILITY está diseñado para ayudarte a producir a escala.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: "programmatic-seo-2026",
    title: "Programmatic SEO in 2026: what actually works",
    date: "May 2026",
    category: "SEO Strategy",
    excerpt:
      "A field guide to building thousands of pages that rank — without getting flagged.",
    image: programmaticSeo,
    readTime: "6 min read",
    intro: [
      "Programmatic SEO has a reputation problem. For every site that quietly built thousands of high-ranking pages, there's another that got buried for publishing thin, near-duplicate junk. The difference isn't volume — it's quality at scale.",
      "Here's the modern playbook for generating large page sets that genuinely help users and survive every algorithm update.",
    ],
    sections: [
      {
        heading: "Start with a real data advantage",
        paragraphs: [
          "Programmatic pages only work when each one answers a distinct, searched-for question. That requires a dataset rich enough to make every page meaningfully different — locations, products, comparisons, or use cases with their own facts.",
        ],
      },
      {
        heading: "Make every page genuinely unique",
        paragraphs: [
          "Spintax and variable substitution are tools, not strategies. The winning pages combine structured data with original analysis, real imagery and intent-matched copy so they read like they were written by a human who cares.",
        ],
      },
      {
        heading: "Publish responsibly",
        paragraphs: [
          "Roll out in batches, monitor indexation, and prune pages that don't earn impressions. Search engines reward restraint and consistency far more than a single massive dump.",
        ],
      },
    ],
    l10n: {
      fr: {
        title: "SEO programmatique en 2026 : ce qui fonctionne vraiment",
        date: "Mai 2026",
        category: "Stratégie SEO",
        excerpt:
          "Un guide de terrain pour créer des milliers de pages qui se classent — sans être pénalisé.",
        readTime: "6 min de lecture",
        intro: [
          "Le SEO programmatique souffre d'un problème de réputation. Pour chaque site qui a discrètement créé des milliers de pages bien classées, un autre a été enterré pour avoir publié du contenu mince et quasi dupliqué. La différence n'est pas le volume — c'est la qualité à grande échelle.",
          "Voici le manuel moderne pour générer de grands ensembles de pages qui aident réellement les utilisateurs et survivent à chaque mise à jour d'algorithme.",
        ],
        sections: [
          {
            heading: "Commencez par un véritable avantage de données",
            paragraphs: [
              "Les pages programmatiques ne fonctionnent que lorsque chacune répond à une question distincte et recherchée. Cela exige un jeu de données assez riche pour rendre chaque page réellement différente — lieux, produits, comparaisons ou cas d'usage avec leurs propres faits.",
            ],
          },
          {
            heading: "Rendez chaque page réellement unique",
            paragraphs: [
              "Le spintax et la substitution de variables sont des outils, pas des stratégies. Les pages gagnantes combinent données structurées, analyse originale, vraies images et texte aligné sur l'intention, pour donner l'impression d'avoir été écrites par un humain attentionné.",
            ],
          },
          {
            heading: "Publiez de façon responsable",
            paragraphs: [
              "Déployez par lots, surveillez l'indexation et élaguez les pages qui ne génèrent pas d'impressions. Les moteurs de recherche récompensent la retenue et la régularité bien plus qu'un déversement massif unique.",
            ],
          },
        ],
      },
      de: {
        title: "Programmatisches SEO 2026: was wirklich funktioniert",
        date: "Mai 2026",
        category: "SEO-Strategie",
        excerpt:
          "Ein Praxisleitfaden zum Aufbau tausender Seiten, die ranken — ohne abgestraft zu werden.",
        readTime: "6 Min. Lesezeit",
        intro: [
          "Programmatisches SEO hat ein Image-Problem. Für jede Website, die still tausende gut rankende Seiten aufgebaut hat, gibt es eine andere, die für dünnen, fast doppelten Müll abgestraft wurde. Der Unterschied ist nicht die Menge — es ist Qualität im großen Maßstab.",
          "Hier ist das moderne Playbook, um große Seitenmengen zu erzeugen, die Nutzern wirklich helfen und jedes Algorithmus-Update überstehen.",
        ],
        sections: [
          {
            heading: "Beginnen Sie mit einem echten Datenvorteil",
            paragraphs: [
              "Programmatische Seiten funktionieren nur, wenn jede eine eigene, gesuchte Frage beantwortet. Das erfordert einen Datensatz, der reich genug ist, um jede Seite bedeutsam zu unterscheiden — Orte, Produkte, Vergleiche oder Anwendungsfälle mit eigenen Fakten.",
            ],
          },
          {
            heading: "Machen Sie jede Seite wirklich einzigartig",
            paragraphs: [
              "Spintax und Variablenersetzung sind Werkzeuge, keine Strategien. Die erfolgreichen Seiten verbinden strukturierte Daten mit origineller Analyse, echten Bildern und absichtsgerechtem Text, sodass sie wie von einem engagierten Menschen geschrieben wirken.",
            ],
          },
          {
            heading: "Veröffentlichen Sie verantwortungsvoll",
            paragraphs: [
              "Rollen Sie in Chargen aus, überwachen Sie die Indexierung und entfernen Sie Seiten, die keine Impressionen erzielen. Suchmaschinen belohnen Zurückhaltung und Konstanz weit mehr als einen einzigen massiven Dump.",
            ],
          },
        ],
      },
      es: {
        title: "SEO programático en 2026: lo que realmente funciona",
        date: "Mayo 2026",
        category: "Estrategia SEO",
        excerpt:
          "Una guía práctica para crear miles de páginas que posicionan — sin ser penalizado.",
        readTime: "6 min de lectura",
        intro: [
          "El SEO programático tiene un problema de reputación. Por cada sitio que creó en silencio miles de páginas bien posicionadas, hay otro que quedó enterrado por publicar contenido pobre y casi duplicado. La diferencia no es el volumen — es la calidad a escala.",
          "Aquí está el manual moderno para generar grandes conjuntos de páginas que ayudan de verdad a los usuarios y sobreviven a cada actualización de algoritmo.",
        ],
        sections: [
          {
            heading: "Empieza con una ventaja de datos real",
            paragraphs: [
              "Las páginas programáticas solo funcionan cuando cada una responde a una pregunta distinta y buscada. Eso requiere un conjunto de datos lo bastante rico para hacer cada página significativamente diferente — ubicaciones, productos, comparativas o casos de uso con sus propios datos.",
            ],
          },
          {
            heading: "Haz cada página realmente única",
            paragraphs: [
              "El spintax y la sustitución de variables son herramientas, no estrategias. Las páginas ganadoras combinan datos estructurados con análisis original, imágenes reales y texto alineado con la intención, para que se lean como escritas por un humano que se preocupa.",
            ],
          },
          {
            heading: "Publica de forma responsable",
            paragraphs: [
              "Despliega por lotes, monitoriza la indexación y poda las páginas que no generan impresiones. Los motores de búsqueda premian la mesura y la constancia mucho más que un único volcado masivo.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: "shopify-publishing",
    title: "Publishing to Shopify without breaking your theme",
    date: "April 2026",
    category: "Publishing",
    excerpt:
      "How 3XVISIBILITY's theme adapter keeps generated pages pixel-perfect inside any Shopify theme.",
    image: shopifyPublishing,
    readTime: "5 min read",
    intro: [
      "The fastest way to ruin a beautiful Shopify storefront is to inject generated pages that ignore the theme. Mismatched fonts, broken spacing and orphaned styles make even great content look untrustworthy.",
      "Our theme adapter solves this by normalising generated HTML to match your store's native classes and structure.",
    ],
    sections: [
      {
        heading: "Adapt, don't override",
        paragraphs: [
          "Instead of shipping its own CSS, the adapter maps your content onto the theme's existing layout primitives — so pages inherit your colours, type scale and spacing automatically.",
        ],
      },
      {
        heading: "Preview before you publish",
        paragraphs: [
          "Every page renders in a live preview using your real theme assets, so you catch any visual drift before it goes live to customers.",
        ],
      },
    ],
    l10n: {
      fr: {
        title: "Publier sur Shopify sans casser votre thème",
        date: "Avril 2026",
        category: "Publication",
        excerpt:
          "Comment l'adaptateur de thème de 3XVISIBILITY garde les pages générées au pixel près dans n'importe quel thème Shopify.",
        readTime: "5 min de lecture",
        intro: [
          "Le moyen le plus rapide de ruiner une belle boutique Shopify est d'y injecter des pages générées qui ignorent le thème. Polices incohérentes, espacements cassés et styles orphelins font paraître même un excellent contenu peu fiable.",
          "Notre adaptateur de thème résout cela en normalisant le HTML généré pour correspondre aux classes et à la structure natives de votre boutique.",
        ],
        sections: [
          {
            heading: "Adapter, ne pas écraser",
            paragraphs: [
              "Au lieu de livrer son propre CSS, l'adaptateur mappe votre contenu sur les primitives de mise en page existantes du thème — les pages héritent donc automatiquement de vos couleurs, de votre échelle typographique et de vos espacements.",
            ],
          },
          {
            heading: "Prévisualisez avant de publier",
            paragraphs: [
              "Chaque page s'affiche dans un aperçu en direct utilisant les vrais éléments de votre thème, pour repérer toute dérive visuelle avant la mise en ligne pour les clients.",
            ],
          },
        ],
      },
      de: {
        title: "Auf Shopify veröffentlichen, ohne Ihr Theme zu zerstören",
        date: "April 2026",
        category: "Veröffentlichung",
        excerpt:
          "Wie der Theme-Adapter von 3XVISIBILITY generierte Seiten in jedem Shopify-Theme pixelgenau hält.",
        readTime: "5 Min. Lesezeit",
        intro: [
          "Der schnellste Weg, einen schönen Shopify-Shop zu ruinieren, ist das Einfügen generierter Seiten, die das Theme ignorieren. Unpassende Schriften, kaputte Abstände und verwaiste Stile lassen selbst großartige Inhalte unseriös wirken.",
          "Unser Theme-Adapter löst das, indem er generiertes HTML normalisiert, sodass es zu den nativen Klassen und der Struktur Ihres Shops passt.",
        ],
        sections: [
          {
            heading: "Anpassen, nicht überschreiben",
            paragraphs: [
              "Statt eigenes CSS auszuliefern, bildet der Adapter Ihre Inhalte auf die vorhandenen Layout-Primitive des Themes ab — so erben Seiten automatisch Ihre Farben, Ihre Schriftskala und Ihre Abstände.",
            ],
          },
          {
            heading: "Vorschau vor der Veröffentlichung",
            paragraphs: [
              "Jede Seite wird in einer Live-Vorschau mit Ihren echten Theme-Assets gerendert, damit Sie visuelle Abweichungen erkennen, bevor sie für Kunden online geht.",
            ],
          },
        ],
      },
      es: {
        title: "Publicar en Shopify sin romper tu tema",
        date: "Abril 2026",
        category: "Publicación",
        excerpt:
          "Cómo el adaptador de temas de 3XVISIBILITY mantiene las páginas generadas perfectas al píxel dentro de cualquier tema de Shopify.",
        readTime: "5 min de lectura",
        intro: [
          "La forma más rápida de arruinar una bonita tienda Shopify es inyectar páginas generadas que ignoran el tema. Fuentes discordantes, espaciados rotos y estilos huérfanos hacen que incluso un gran contenido parezca poco fiable.",
          "Nuestro adaptador de temas resuelve esto normalizando el HTML generado para que coincida con las clases y la estructura nativas de tu tienda.",
        ],
        sections: [
          {
            heading: "Adaptar, no sobrescribir",
            paragraphs: [
              "En lugar de incluir su propio CSS, el adaptador mapea tu contenido sobre las primitivas de diseño existentes del tema — así las páginas heredan automáticamente tus colores, tu escala tipográfica y tus espaciados.",
            ],
          },
          {
            heading: "Previsualiza antes de publicar",
            paragraphs: [
              "Cada página se renderiza en una vista previa en vivo usando los recursos reales de tu tema, para que detectes cualquier desviación visual antes de que llegue a los clientes.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: "ai-templates",
    title: "AI templates: from CSV to live page in 60 seconds",
    date: "March 2026",
    category: "Product",
    excerpt: "Walkthrough of the AI Template Builder and the spintax engine behind it.",
    image: aiTemplates,
    readTime: "5 min read",
    intro: [
      "The gap between \"I have a spreadsheet\" and \"I have hundreds of published pages\" used to be measured in weeks. With the AI Template Builder it's measured in seconds.",
      "Here's how a single CSV becomes a fleet of unique, on-brand pages.",
    ],
    sections: [
      {
        heading: "Upload and map",
        paragraphs: [
          "Drop in your CSV and the builder detects your columns, turning each one into a variable you can place anywhere in your template.",
        ],
      },
      {
        heading: "Spin and generate",
        paragraphs: [
          "The spintax engine creates natural variation across every page so no two read the same, while keeping your core message and structure intact.",
        ],
      },
      {
        heading: "Publish anywhere",
        paragraphs: [
          "One click pushes your pages to WordPress, Shopify, WooCommerce or PrestaShop with theme-aware formatting baked in.",
        ],
      },
    ],
    l10n: {
      fr: {
        title: "Modèles IA : du CSV à la page en ligne en 60 secondes",
        date: "Mars 2026",
        category: "Produit",
        excerpt: "Présentation du générateur de modèles IA et du moteur spintax qui l'anime.",
        readTime: "5 min de lecture",
        intro: [
          "L'écart entre « j'ai un tableur » et « j'ai des centaines de pages publiées » se mesurait autrefois en semaines. Avec le générateur de modèles IA, il se mesure en secondes.",
          "Voici comment un simple CSV devient une flotte de pages uniques et fidèles à votre marque.",
        ],
        sections: [
          {
            heading: "Importer et mapper",
            paragraphs: [
              "Déposez votre CSV et le générateur détecte vos colonnes, transformant chacune en une variable que vous pouvez placer où vous voulez dans votre modèle.",
            ],
          },
          {
            heading: "Spinner et générer",
            paragraphs: [
              "Le moteur spintax crée une variation naturelle sur chaque page afin qu'aucune ne se lise de la même façon, tout en gardant votre message et votre structure intacts.",
            ],
          },
          {
            heading: "Publier partout",
            paragraphs: [
              "Un clic envoie vos pages vers WordPress, Shopify, WooCommerce ou PrestaShop avec une mise en forme adaptée au thème intégrée.",
            ],
          },
        ],
      },
      de: {
        title: "KI-Vorlagen: von der CSV zur Live-Seite in 60 Sekunden",
        date: "März 2026",
        category: "Produkt",
        excerpt: "Ein Rundgang durch den KI-Vorlagen-Builder und die dahinterstehende Spintax-Engine.",
        readTime: "5 Min. Lesezeit",
        intro: [
          "Die Lücke zwischen „Ich habe eine Tabelle\" und „Ich habe hunderte veröffentlichte Seiten\" wurde früher in Wochen gemessen. Mit dem KI-Vorlagen-Builder misst man sie in Sekunden.",
          "So wird aus einer einzigen CSV eine Flotte einzigartiger, markengerechter Seiten.",
        ],
        sections: [
          {
            heading: "Hochladen und zuordnen",
            paragraphs: [
              "Laden Sie Ihre CSV hoch und der Builder erkennt Ihre Spalten und verwandelt jede in eine Variable, die Sie überall in Ihrer Vorlage platzieren können.",
            ],
          },
          {
            heading: "Spinnen und generieren",
            paragraphs: [
              "Die Spintax-Engine erzeugt natürliche Variationen auf jeder Seite, sodass keine zwei gleich lesen, während Ihre Kernbotschaft und Struktur erhalten bleiben.",
            ],
          },
          {
            heading: "Überall veröffentlichen",
            paragraphs: [
              "Ein Klick schiebt Ihre Seiten zu WordPress, Shopify, WooCommerce oder PrestaShop — mit eingebauter, themenbewusster Formatierung.",
            ],
          },
        ],
      },
      es: {
        title: "Plantillas con IA: del CSV a la página en vivo en 60 segundos",
        date: "Marzo 2026",
        category: "Producto",
        excerpt: "Un recorrido por el generador de plantillas con IA y el motor de spintax detrás de él.",
        readTime: "5 min de lectura",
        intro: [
          "La distancia entre «tengo una hoja de cálculo» y «tengo cientos de páginas publicadas» antes se medía en semanas. Con el generador de plantillas con IA se mide en segundos.",
          "Así es como un solo CSV se convierte en una flota de páginas únicas y fieles a tu marca.",
        ],
        sections: [
          {
            heading: "Sube y mapea",
            paragraphs: [
              "Suelta tu CSV y el generador detecta tus columnas, convirtiendo cada una en una variable que puedes colocar en cualquier lugar de tu plantilla.",
            ],
          },
          {
            heading: "Gira y genera",
            paragraphs: [
              "El motor de spintax crea variación natural en cada página para que no haya dos iguales, manteniendo intactos tu mensaje y tu estructura.",
            ],
          },
          {
            heading: "Publica en cualquier lugar",
            paragraphs: [
              "Un clic envía tus páginas a WordPress, Shopify, WooCommerce o PrestaShop con formato adaptado al tema incorporado.",
            ],
          },
        ],
      },
    },
  },
];

/** Returns a post with its fields localized to the given language. */
export function localizePost(post: BlogPost, lang: Language): BlogPost {
  if (lang === "en") return post;
  const tr = post.l10n?.[lang as Exclude<Language, "en">];
  if (!tr) return post;
  return { ...post, ...tr };
}

/** All posts localized to the given language. */
export function getLocalizedPosts(lang: Language): BlogPost[] {
  return posts.map((p) => localizePost(p, lang));
}

export function getPostBySlug(slug: string, lang: Language = "en") {
  const post = posts.find((p) => p.slug === slug);
  return post ? localizePost(post, lang) : undefined;
}
