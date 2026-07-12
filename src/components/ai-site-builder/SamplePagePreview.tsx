import { Star } from "lucide-react";

interface SampleTheme {
  primary: string;
  accent: string;
  font: string;
  logoPlacement: "left" | "center" | "right";
}

interface SamplePagePreviewProps {
  mode: "replicate" | "fresh";
  brand?: string;
  niche?: string;
  theme?: SampleTheme;
}

// Maps the theme font key to an actual CSS font stack for the preview.
const FONT_STACKS: Record<string, string> = {
  "plus-jakarta": '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  inter: 'Inter, ui-sans-serif, system-ui, sans-serif',
  poppins: 'Poppins, ui-sans-serif, system-ui, sans-serif',
  "space-grotesk": '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
  sora: 'Sora, ui-sans-serif, system-ui, sans-serif',
  playfair: '"Playfair Display", ui-serif, Georgia, serif',
};

/**
 * A small, representative sample page that reflects the selected design
 * fidelity and (optionally) the brand theme — color, font, and logo
 * placement — so the user can judge the look before running the full build.
 * Purely presentational — no data fetching.
 */
export function SamplePagePreview({ mode, brand, niche, theme }: SamplePagePreviewProps) {
  const name = brand?.trim() || "Your Brand";
  const tagline = niche?.trim() || "A better way to serve your customers";

  const primary = theme?.primary;
  const accent = theme?.accent || theme?.primary;
  const fontFamily = theme?.font ? FONT_STACKS[theme.font] : undefined;
  const placement = theme?.logoPlacement || "left";

  // Nav layout driven by logo placement.
  const navClass =
    placement === "center"
      ? "flex flex-col items-center gap-1.5"
      : placement === "right"
      ? "flex items-center flex-row-reverse justify-between"
      : "flex items-center justify-between";

  const rootStyle = { fontFamily } as React.CSSProperties;

  if (mode === "replicate") {
    return (
      <div className="rounded-lg border border-border bg-background overflow-hidden text-foreground" style={rootStyle}>
        {/* Nav */}
        <div className={`border-b border-border px-4 py-3 ${navClass}`}>
          <span className="text-sm font-semibold tracking-tight" style={primary ? { color: primary } : undefined}>
            {name}
          </span>
          <nav className={`hidden sm:flex gap-4 text-xs text-muted-foreground ${placement === "center" ? "justify-center" : ""}`}>
            <span>Home</span>
            <span>Services</span>
            <span>About</span>
            <span>Contact</span>
          </nav>
        </div>
        {/* Hero */}
        <div className="px-4 py-6 text-center bg-muted/30">
          <h3 className="text-lg font-bold tracking-tight">{tagline}</h3>
          <p className="mt-1.5 text-xs text-muted-foreground max-w-sm mx-auto">
            Trusted, professional service delivered with care and consistency.
          </p>
          <button
            className="mt-3 rounded-md px-4 py-1.5 text-xs font-medium text-white"
            style={{ backgroundColor: primary || "hsl(var(--primary))" }}
          >
            Get started
          </button>
        </div>
        {/* Feature grid */}
        <div className="grid grid-cols-3 gap-3 p-4">
          {["Reliable", "Affordable", "Expert"].map((f) => (
            <div key={f} className="rounded-md border border-border p-3">
              <div className="h-6 w-6 rounded bg-muted mb-2" style={accent ? { backgroundColor: `${accent}33` } : undefined} />
              <p className="text-xs font-semibold">{f}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                Short supporting line describing this benefit.
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Fresh: bolder type, asymmetric hero, gradient accents, pill buttons.
  const heroBg = primary
    ? `linear-gradient(135deg, ${primary}22, transparent 60%)`
    : undefined;

  return (
    <div
      className="rounded-lg border border-primary/25 bg-gradient-to-br from-primary/10 via-background to-background overflow-hidden text-foreground"
      style={{ ...rootStyle, ...(heroBg ? { backgroundImage: heroBg } : {}) }}
    >
      {/* Nav */}
      <div className={`px-4 py-3 ${navClass}`}>
        <span className="text-sm font-extrabold tracking-tight" style={primary ? { color: primary } : undefined}>
          {name}
        </span>
        <button
          className="rounded-full px-3 py-1 text-[11px] font-semibold text-white"
          style={{ backgroundColor: primary || "hsl(var(--primary))" }}
        >
          Book now
        </button>
      </div>
      {/* Hero */}
      <div className={`px-4 pt-4 pb-6 ${placement === "center" ? "text-center" : ""}`}>
        <span
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
          style={
            primary
              ? { color: primary, borderColor: `${primary}55`, backgroundColor: `${primary}14` }
              : undefined
          }
        >
          <Star className="h-2.5 w-2.5 fill-current" /> Rated 5.0 by clients
        </span>
        <h3 className={`mt-2 text-2xl font-black leading-tight tracking-tight max-w-xs ${placement === "center" ? "mx-auto" : ""}`}>
          {tagline}
        </h3>
        <p className={`mt-2 text-xs text-muted-foreground max-w-sm ${placement === "center" ? "mx-auto" : ""}`}>
          A modern experience designed to convert visitors into loyal customers.
        </p>
        <div className={`mt-3 flex gap-2 ${placement === "center" ? "justify-center" : ""}`}>
          <button
            className="rounded-full px-4 py-1.5 text-xs font-semibold text-white"
            style={{ backgroundColor: primary || "hsl(var(--primary))" }}
          >
            Get a quote
          </button>
          <button
            className="rounded-full border px-4 py-1.5 text-xs font-semibold text-foreground"
            style={accent ? { borderColor: `${accent}66` } : undefined}
          >
            Learn more
          </button>
        </div>
      </div>
      {/* Cards */}
      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        {["Signature service", "Client favorite"].map((f, i) => (
          <div
            key={f}
            className="rounded-xl p-3 border border-border bg-background"
            style={i === 0 && accent ? { backgroundColor: `${accent}14`, borderColor: `${accent}33` } : undefined}
          >
            <div className="h-7 w-7 rounded-lg mb-2" style={{ backgroundColor: accent ? `${accent}33` : "hsl(var(--primary) / 0.2)" }} />
            <p className="text-xs font-bold">{f}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
              Distinctive detail that sets your brand apart.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
