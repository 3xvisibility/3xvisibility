import programmaticSeo from "@/assets/blog/programmatic-seo.jpg";
import shopifyPublishing from "@/assets/blog/shopify-publishing.jpg";
import aiTemplates from "@/assets/blog/ai-templates.jpg";
import seoAeoGeo from "@/assets/blog/seo-aeo-geo.jpg.asset.json";

export interface BlogSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  image: string;
  readTime: string;
  intro: string[];
  sections: BlogSection[];
}

export const posts: BlogPost[] = [
  {
    slug: "seo-vs-aeo-vs-geo",
    title: "SEO vs AEO vs GEO: the three engines of search in 2026",
    date: "June 2026",
    category: "AI Search",
    excerpt:
      "Search is no longer one game. Learn how Search, Answer and Generative engine optimisation work — and how to win all three at once.",
    image: seoAeoGeo.url,
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
  },
];

export function getPostBySlug(slug: string) {
  return posts.find((p) => p.slug === slug);
}
