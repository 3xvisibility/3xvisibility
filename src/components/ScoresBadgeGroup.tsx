import { SeoScoreBadge } from "@/components/SeoScoreBadge";
import {
  calculateContentSeoScore,
  calculateContentSeaScore,
  calculateContentGeoScore,
  type ContentScoreResult,
} from "@/lib/content-seo-score";

interface ScoresBadgeGroupProps {
  title: string;
  content: string;
  slug: string;
  url?: string;
  description?: string;
  size?: "sm" | "md";
  /** Show labels like "SEO", "SEA", "GEO" next to badges */
  showLabels?: boolean;
}

export function ScoresBadgeGroup({
  title,
  content,
  slug,
  url,
  description,
  size = "sm",
  showLabels = false,
}: ScoresBadgeGroupProps) {
  const seo = calculateContentSeoScore(title, content, slug, url, description);
  const sea = calculateContentSeaScore(title, content, slug, url);
  const geo = calculateContentGeoScore(title, content, slug, url);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <ScoreItem label="SEO" result={seo} size={size} showLabel={showLabels} />
      <ScoreItem label="SEA" result={sea} size={size} showLabel={showLabels} />
      <ScoreItem label="GEO" result={geo} size={size} showLabel={showLabels} />
    </div>
  );
}

function ScoreItem({ label, result, size, showLabel }: { label: string; result: ContentScoreResult; size: "sm" | "md"; showLabel: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {showLabel && <span className="text-[9px] font-semibold text-muted-foreground uppercase">{label}</span>}
      <SeoScoreBadge score={result.score} label={result.label} color={result.color} checks={result.checks} size={size} scoreType={label} />
    </div>
  );
}

/** Compute average scores for a group of pages */
export function computeAverageScores(pages: { title: string; content: string; slug: string; url?: string }[]) {
  if (pages.length === 0) return null;
  let seoSum = 0, seaSum = 0, geoSum = 0;
  for (const p of pages) {
    seoSum += calculateContentSeoScore(p.title, p.content, p.slug, p.url).score;
    seaSum += calculateContentSeaScore(p.title, p.content, p.slug, p.url).score;
    geoSum += calculateContentGeoScore(p.title, p.content, p.slug, p.url).score;
  }
  const n = pages.length;
  return {
    seo: Math.round(seoSum / n),
    sea: Math.round(seaSum / n),
    geo: Math.round(geoSum / n),
  };
}
