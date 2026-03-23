import { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Building2, ChevronRight, ChevronsUpDown, Search } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

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
  const { currentWorkspace, workspaces, setCurrentWorkspace, basePath } = useWorkspace();
  const { t } = useLanguage();
  const location = useLocation();
  const segmentLabels: Record<string, string> = {
    dashboard: t("sidebar.dashboard"),
    campaigns: t("sidebar.campaigns"),
    templates: t("sidebar.templates"),
    pages: t("sidebar.generatedPages"),
    websites: t("sidebar.websites"),
    billing: t("sidebar.billing"),
    settings: t("sidebar.settings"),
    admin: t("sidebar.admin"),
    scanner: t("sidebar.aiScanner"),
    discovery: t("sidebar.discovery"),
    analytics: t("sidebar.analytics"),
    marketplace: t("sidebar.marketplace"),
    indexing: t("sidebar.indexing"),
    data: t("sidebar.dataCsv"),
    "website-content": t("sidebar.websiteContent"),
    "ab-testing": t("sidebar.abTesting"),
    "content-calendar": t("sidebar.contentCalendar"),
    performance: t("sidebar.performance"),
    "seo-audit": t("sidebar.seoAudit"),
    "workspace-settings": t("sidebar.workspaceSettings"),
  };

  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  if (!currentWorkspace || !basePath) return null;

  // Extract path segments after /w/{slug}/
  const subPath = location.pathname.startsWith(basePath)
    ? location.pathname.slice(basePath.length + 1)
    : "";
  const segments = subPath.split("/").filter(Boolean);

  // Current sub-route to preserve on switch (e.g. "dashboard")
  const currentSubRoute = segments[0] || "dashboard";

  // Build crumbs after workspace (skipping workspace itself — handled separately)
  const crumbs: { label: string; href?: string }[] = [];
  let accPath = basePath;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    accPath += `/${seg}`;
    const label = segmentLabels[seg];
    if (label) {
      const isLast = i === segments.length - 1;
      crumbs.push({ label, href: isLast ? undefined : accPath });
    } else {
      const truncated = seg.length > 12 ? `${seg.slice(0, 8)}…` : seg;
      crumbs.push({ label: truncated });
    }
  }

  const filtered = workspaces.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSwitch = (ws: typeof currentWorkspace) => {
    if (!ws) return;
    setCurrentWorkspace(ws);
    setOpen(false);
    setSearch("");
    navigate(`/w/${ws.slug}/${currentSubRoute}`);
  };

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm min-w-0">
      {/* Workspace switcher crumb */}
      <span className="flex items-center gap-1 min-w-0">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-0.5" />
        <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors truncate max-w-[160px] rounded px-1 -mx-1 hover:bg-muted/60">
              <span className="truncate">{currentWorkspace.name}</span>
              {workspaces.length > 1 && <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2" sideOffset={8}>
            {workspaces.length > 3 && (
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t("common.searchWorkspaces")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                  autoFocus
                />
              </div>
            )}
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">{t("common.noWorkspacesFound")}</p>
              )}
              {filtered.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleSwitch(ws)}
                  className={`w-full text-left rounded-md px-2.5 py-1.5 text-sm transition-colors truncate ${
                    ws.id === currentWorkspace.id
                      ? "bg-accent text-accent-foreground font-medium"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  {ws.name}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </span>

      {/* Remaining crumbs */}
      {crumbs.map((crumb, idx) => (
        <span key={idx} className="flex items-center gap-1 min-w-0">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
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
