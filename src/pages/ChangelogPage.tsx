import { StaticPageLayout } from "@/components/landing/StaticPageLayout";

const releases = [
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
    <StaticPageLayout title="Changelog" subtitle="Recent improvements, fixes and new features.">
      <div className="not-prose space-y-8">
        {releases.map((r) => (
          <div key={r.version} className="rounded-xl border border-[hsl(96,90%,45%,0.12)] bg-[hsl(250,30%,8%,0.4)] p-6">
            <div className="flex items-baseline gap-3">
              <h3 className="text-xl font-semibold">{r.version}</h3>
              <span className="text-xs uppercase tracking-widest text-[hsl(250,15%,45%)]">{r.date}</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-[hsl(250,15%,70%)] list-disc pl-5">
              {r.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </StaticPageLayout>
  );
}
