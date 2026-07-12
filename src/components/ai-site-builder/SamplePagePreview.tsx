import { Star } from "lucide-react";

interface SamplePagePreviewProps {
  mode: "replicate" | "fresh";
  brand?: string;
  niche?: string;
}

/**
 * A small, representative sample page that reflects the selected design
 * fidelity so the user can judge typography, spacing, and components before
 * running the full build. Purely presentational — no data fetching.
 */
export function SamplePagePreview({ mode, brand, niche }: SamplePagePreviewProps) {
  const name = brand?.trim() || "Your Brand";
  const tagline = niche?.trim() || "A better way to serve your customers";

  if (mode === "replicate") {
    // Structured, conservative layout mirroring a typical reference site:
    // system-ish typography, even spacing, boxed sections.
    return (
      <div className="rounded-lg border border-border bg-background overflow-hidden text-foreground">
        {/* Nav */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold tracking-tight">{name}</span>
          <nav className="hidden sm:flex gap-4 text-xs text-muted-foreground">
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
          <button className="mt-3 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground">
            Get started
          </button>
        </div>
        {/* Feature grid */}
        <div className="grid grid-cols-3 gap-3 p-4">
          {["Reliable", "Affordable", "Expert"].map((f) => (
            <div key={f} className="rounded-md border border-border p-3">
              <div className="h-6 w-6 rounded bg-muted mb-2" />
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
  return (
    <div className="rounded-lg border border-primary/25 bg-gradient-to-br from-primary/10 via-background to-background overflow-hidden text-foreground">
      {/* Nav */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-extrabold tracking-tight">{name}</span>
        <button className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
          Book now
        </button>
      </div>
      {/* Hero */}
      <div className="px-4 pt-4 pb-6">
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          <Star className="h-2.5 w-2.5 fill-current" /> Rated 5.0 by clients
        </span>
        <h3 className="mt-2 text-2xl font-black leading-tight tracking-tight max-w-xs">
          {tagline}
        </h3>
        <p className="mt-2 text-xs text-muted-foreground max-w-sm">
          A modern experience designed to convert visitors into loyal customers.
        </p>
        <div className="mt-3 flex gap-2">
          <button className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
            Get a quote
          </button>
          <button className="rounded-full border border-primary/40 px-4 py-1.5 text-xs font-semibold text-foreground">
            Learn more
          </button>
        </div>
      </div>
      {/* Cards */}
      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        {["Signature service", "Client favorite"].map((f, i) => (
          <div
            key={f}
            className={`rounded-xl p-3 ${i === 0 ? "bg-primary/10 border border-primary/20" : "border border-border bg-background"}`}
          >
            <div className="h-7 w-7 rounded-lg bg-primary/20 mb-2" />
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
