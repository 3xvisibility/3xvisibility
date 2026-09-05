import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";

const releases = [
  {
    version: "v3.5",
    date: "July 2026",
    items: [
      "Template engine sync: per-template and per-page status view showing exactly which connected pages were updated",
      "Retry only the failed templates from the last sync without reprocessing successful ones",
      "Full 4-language auto-translation across all marketing and changelog pages",
    ],
  },
  {
    version: "v3.4",
    date: "May 2026",
    items: [
      "Shopify theme adapter — published pages now auto-match the active store theme",
      "Locale-aware slug & title formatting across all generators",
      "Auto-translate provider with placeholder text support",
    ],
  },
  {
    version: "v3.3",
    date: "April 2026",
    items: [
      "AI Template Builder: 8 new design directions",
      "Marketplace template versioning with FNV-1a hash pinning",
      "CSV starter download per template",
    ],
  },
  {
    version: "v3.2",
    date: "March 2026",
    items: [
      "Multi-provider AI routing (Lovable AI, Gemini, GPT)",
      "Bulk SEO optimization for Shopify products",
      "SEO Audit Suite with Jaccard duplicate detection",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <>
      <Seo
        title="Changelog"
        description="Recent improvements, fixes and new features shipped to 3XVISIBILITY."
        path="/changelog"
      />
    <StaticPageLayout title="Changelog" subtitle="Recent improvements, fixes and new features.">
      <div className="not-prose space-y-6">
        {releases.map((r) => (
          <div key={r.version} className="rounded-xl border border-[hsl(96,67%,48%,0.15)] bg-card p-6 shadow-surface hover:shadow-surface-hover transition-shadow duration-200">
            <div className="flex items-baseline gap-3">
              <h3 className="text-xl font-semibold text-[hsl(240,12%,12%)]">{r.version}</h3>
              <span className="text-xs uppercase tracking-widest text-[hsl(240,8%,45%)]">{r.date}</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-[hsl(240,8%,28%)] leading-relaxed list-disc pl-5">
              {r.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </StaticPageLayout>
    </>
  );
}
