/**
 * Classify template variables into UX-friendly sections (Hero, About, Gallery,
 * FAQ, Other) by inspecting both the variable name and the surrounding HTML
 * context where the variable appears in the template.
 *
 * This is purely heuristic — no AI calls — so it's free and instant.
 */

export type SectionKey = "hero" | "about" | "gallery" | "faq" | "seo" | "other";

export interface SectionInfo {
  key: SectionKey;
  label: string;
  description: string;
  /** Tailwind background utility for the section badge */
  badgeClass: string;
}

export const SECTIONS: Record<SectionKey, SectionInfo> = {
  hero: {
    key: "hero",
    label: "Hero",
    description: "Headline, subheading and primary CTA shown above the fold.",
    badgeClass: "bg-primary/10 text-primary border-primary/30",
  },
  about: {
    key: "about",
    label: "About",
    description: "Body copy describing the service, story or value proposition.",
    badgeClass: "bg-secondary/10 text-secondary-foreground border-secondary/30",
  },
  gallery: {
    key: "gallery",
    label: "Gallery captions",
    description: "Image alt text, captions and visual showcase labels.",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  },
  faq: {
    key: "faq",
    label: "FAQ",
    description: "Question / answer blocks rendered in the FAQ schema.",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  seo: {
    key: "seo",
    label: "SEO meta",
    description: "Meta title, description, canonical and social tags.",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  },
  other: {
    key: "other",
    label: "Other",
    description: "Variables that don't match a known section pattern.",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
};

const NAME_PATTERNS: Array<[RegExp, SectionKey]> = [
  [/^(hero|headline|tagline|subheadline|sub_?title|cta|call_?to_?action)/i, "hero"],
  [/^(about|story|intro|overview|bio|description|mission|why_?us)/i, "about"],
  [/^(gallery|image|photo|caption|alt_?text|figure|portfolio|showcase)/i, "gallery"],
  [/^(faq|question|answer|q\d+|a\d+|frequently)/i, "faq"],
  [/^(seo|meta|canonical|og_|twitter_|schema)/i, "seo"],
];

/** Look at ~120 chars of context around the {var} occurrence */
const CONTEXT_RADIUS = 140;

const CONTEXT_PATTERNS: Array<[RegExp, SectionKey]> = [
  [/<h1[^>]*>|class\s*=\s*["'][^"']*\b(hero|banner|jumbotron|pgp-hero)\b/i, "hero"],
  [/class\s*=\s*["'][^"']*\b(about|intro|story|mission|overview|pgp-about)\b|<h2[^>]*>\s*about/i, "about"],
  [/<img[^>]*\balt\s*=|<figcaption|class\s*=\s*["'][^"']*\b(gallery|carousel|photo|portfolio|showcase|pgp-gallery)\b/i, "gallery"],
  [/class\s*=\s*["'][^"']*\b(faq|accordion|question|pgp-faq)\b|itemtype\s*=\s*["'][^"']*FAQPage/i, "faq"],
  [/<title>|<meta[^>]+name\s*=\s*["'](description|keywords)/i, "seo"],
];

/**
 * Classify a single variable. Returns the most confident section.
 */
export function classifyVariable(name: string, templateHtml: string): SectionKey {
  // 1) Strong signal from the variable name itself
  for (const [re, section] of NAME_PATTERNS) {
    if (re.test(name)) return section;
  }

  // 2) Look at the HTML surrounding each occurrence and tally votes
  if (templateHtml) {
    const token = `{${name}}`;
    const tally: Record<SectionKey, number> = {
      hero: 0, about: 0, gallery: 0, faq: 0, seo: 0, other: 0,
    };
    let idx = templateHtml.indexOf(token);
    let safety = 0;
    while (idx !== -1 && safety < 50) {
      const start = Math.max(0, idx - CONTEXT_RADIUS);
      const end = Math.min(templateHtml.length, idx + token.length + CONTEXT_RADIUS);
      const context = templateHtml.slice(start, end);
      for (const [re, section] of CONTEXT_PATTERNS) {
        if (re.test(context)) tally[section] += 1;
      }
      idx = templateHtml.indexOf(token, idx + token.length);
      safety += 1;
    }
    const winner = (Object.entries(tally) as Array<[SectionKey, number]>)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])[0];
    if (winner) return winner[0];
  }

  return "other";
}

export interface ClassifiedVariable {
  name: string;
  section: SectionKey;
  /** Number of times the variable appears in the template */
  occurrences: number;
}

/** Classify every variable found in the template's HTML */
export function classifyTemplate(html: string, declared: string[] = []): ClassifiedVariable[] {
  const found = new Set<string>(declared.map(v => v.replace(/[{}]/g, "")));
  const re = /\{([a-zA-Z0-9_.-]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) found.add(m[1]);

  return Array.from(found).map(name => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = html.match(new RegExp(`\\{${escaped}\\}`, "g"));
    return {
      name,
      section: classifyVariable(name, html),
      occurrences: matches ? matches.length : 0,
    };
  }).sort((a, b) => a.section.localeCompare(b.section) || a.name.localeCompare(b.name));
}
