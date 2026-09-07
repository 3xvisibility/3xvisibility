import {
  LayoutDashboard,
  Rocket,
  Sparkles,
  FileText,
  Layers,
  BarChart3,
  Globe,
  CreditCard,
  Settings,
  Users,
  Database,
  Store,
  ClipboardCheck,
  Gift,
  KeyRound,
  Columns3,
  Boxes,
  Link2,
  SlidersHorizontal,
  Search as SearchIcon,
  Zap,
  Activity,
} from "lucide-react";
import type { FeatureKey } from "@/lib/plan-features";
import { isItemActive } from "@/lib/sidebar-active";

export type UserRole = "admin" | "user";

export interface NavItem {
  titleKey: string;
  /** Relative path within workspace, e.g. "dashboard" */
  path: string;
  icon: typeof LayoutDashboard;
  /** Gate by plan feature flag */
  requiredFeature?: FeatureKey;
  /** Gate by user role; item is hidden entirely if role not met */
  requiredRole?: UserRole;
}

export interface NavGroup {
  /** Stable key used for persisted open/closed state */
  key: string;
  /** i18n key for the group label */
  labelKey: string;
  items: NavItem[];
}

export const mainNav: NavItem[] = [
  { titleKey: "sidebar.dashboard", path: "dashboard", icon: LayoutDashboard },
  { titleKey: "sidebar.campaigns", path: "pgp-generate", icon: Rocket },
  { titleKey: "sidebar.aiSiteBuilder", path: "ai-site-builder", icon: Sparkles },
  { titleKey: "sidebar.generatedPages", path: "pages", icon: Layers },
  { titleKey: "sidebar.templates", path: "templates", icon: FileText },
];

// Everything related to managing websites / their content & data.
export const websiteNav: NavItem[] = [
  { titleKey: "sidebar.websites", path: "websites", icon: Globe },
  { titleKey: "sidebar.websiteContent", path: "website-content", icon: Boxes, requiredFeature: "discovery" },
  { titleKey: "sidebar.marketplace", path: "marketplace", icon: Store, requiredFeature: "internalLinks" },
  { titleKey: "sidebar.dataCsv", path: "data", icon: Database },
];

// Everything related to SEO, keywords, ranking & analytics.
export const seoNav: NavItem[] = [
  
  { titleKey: "sidebar.keywordGroups", path: "keyword-groups", icon: Boxes },
  { titleKey: "sidebar.pgpTerms", path: "pgp-terms", icon: Columns3 },
  { titleKey: "sidebar.seoAudit", path: "seo-audit", icon: ClipboardCheck },
  { titleKey: "sidebar.indexing", path: "indexing", icon: SearchIcon, requiredFeature: "indexing" },
  { titleKey: "sidebar.analytics", path: "analytics", icon: BarChart3 },
  { titleKey: "sidebar.domainAnalysis", path: "domain-analysis", icon: Globe },
  { titleKey: "sidebar.performance", path: "performance", icon: Activity },
];

export const settingsNav: NavItem[] = [
  { titleKey: "sidebar.affiliate", path: "affiliate", icon: Gift },
  { titleKey: "sidebar.referral", path: "referral", icon: Link2 },
  { titleKey: "sidebar.billing", path: "billing", icon: CreditCard },
  { titleKey: "sidebar.settings", path: "settings", icon: Settings },
  { titleKey: "sidebar.workspaceSettings", path: "workspace-settings", icon: Users, requiredFeature: "teamCollaboration" },
];

/** Ordered groups used both by the sidebar and the breadcrumb. */
export const NAV_GROUPS: NavGroup[] = [
  { key: "main", labelKey: "sidebar.main", items: mainNav },
  { key: "website", labelKey: "sidebar.websiteSection", items: websiteNav },
  { key: "seo", labelKey: "sidebar.seoSection", items: seoNav },
  { key: "account", labelKey: "sidebar.account", items: settingsNav },
];

export interface BreadcrumbTrail {
  /** i18n key for the parent group, if the route belongs to one */
  groupLabelKey?: string;
  /** i18n key for the active nav item */
  itemTitleKey?: string;
}

/**
 * Resolve the active sidebar group + item for a pathname, so the breadcrumb
 * header can mirror the sidebar's active state. Returns empty when no nav
 * item matches (e.g. detail routes handled by generic segment labels).
 */
export function getBreadcrumbTrail(pathname: string, basePath: string): BreadcrumbTrail {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((it) => isItemActive(pathname, basePath, it));
    if (item) {
      return { groupLabelKey: group.labelKey, itemTitleKey: item.titleKey };
    }
  }
  return {};
}
