import { useLocation, Link } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Building2, ChevronRight } from "lucide-react";

/** Maps route segments to human-readable labels */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  campaigns: "Campaigns",
  templates: "Templates",
  pages: "Generated Pages",
  websites: "Websites",
  billing: "Billing",
  settings: "Settings",
  admin: "Admin",
  scanner: "AI Scanner",
  discovery: "Discovery",
  analytics: "Analytics",
  marketplace: "Marketplace",
  indexing: "Indexing",
  data: "Data / CSV",
  "website-content": "Website Content",
  "ab-testing": "A/B Testing",
  "content-calendar": "Content Calendar",
  performance: "Performance",
  "seo-audit": "SEO Audit",
  "workspace-settings": "Workspace Settings",
};

export function WorkspaceBreadcrumb() {
  const { currentWorkspace, basePath } = useWorkspace();
  const location = useLocation();

  if (!currentWorkspace || !basePath) return null;

  // Extract path segments after /w/{slug}/
  const subPath = location.pathname.startsWith(basePath)
    ? location.pathname.slice(basePath.length + 1)
    : "";
  const segments = subPath.split("/").filter(Boolean);

  // Build crumbs: [workspace] -> [page] -> [detail id]
  const crumbs: { label: string; href?: string }[] = [
    { label: currentWorkspace.name, href: `${basePath}/dashboard` },
  ];

  let accPath = basePath;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    accPath += `/${seg}`;

    const label = SEGMENT_LABELS[seg];
    if (label) {
      // If this is the last segment, no link
      const isLast = i === segments.length - 1;
      crumbs.push({ label, href: isLast ? undefined : accPath });
    } else {
      // Likely an ID (e.g. campaign detail) — show truncated
      const truncated = seg.length > 12 ? `${seg.slice(0, 8)}…` : seg;
      crumbs.push({ label: truncated });
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm min-w-0">
      {crumbs.map((crumb, idx) => (
        <span key={idx} className="flex items-center gap-1 min-w-0">
          {idx > 0 && (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
          )}
          {idx === 0 && (
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-0.5" />
          )}
          {crumb.href ? (
            <Link
              to={crumb.href}
              className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium truncate max-w-[160px]">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
