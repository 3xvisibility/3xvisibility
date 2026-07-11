import { useEffect, useState } from "react";
import logo3x from "@/assets/logo-3x.png";
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
  LogOut,
  ShieldCheck,
  Search as SearchIcon,
  Zap,
  Users,
  Database,
  Lock,
  Store,
  
  CalendarDays,
  ClipboardCheck,
  Activity,
  Gift,
  KeyRound,
  Columns3,
  Boxes,
  Link2,
  SlidersHorizontal,
  ScanLine,
  ChevronDown,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePersistedState } from "@/hooks/use-persisted-state";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSubscription } from "@/hooks/use-subscription";
import { useBranding } from "@/contexts/BrandingContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { FeatureKey } from "@/lib/plan-features";
import { getMinimumPlanFor, PLAN_FEATURES } from "@/lib/plan-features";

type UserRole = "admin" | "user";

interface NavItem {
  titleKey: string;
  /** Relative path within workspace, e.g. "dashboard" */
  path: string;
  icon: typeof LayoutDashboard;
  /** Gate by plan feature flag */
  requiredFeature?: FeatureKey;
  /** Gate by user role; item is hidden entirely if role not met */
  requiredRole?: UserRole;
}

const mainNav: NavItem[] = [
  { titleKey: "sidebar.dashboard", path: "dashboard", icon: LayoutDashboard },
  { titleKey: "sidebar.campaigns", path: "campaigns", icon: Rocket },
  { titleKey: "sidebar.aiSiteBuilder", path: "ai-site-builder", icon: Sparkles },
  { titleKey: "sidebar.generatedPages", path: "pages", icon: Layers },
  { titleKey: "sidebar.templates", path: "templates", icon: FileText },
];

// Everything related to managing websites / their content & data.
const websiteNav: NavItem[] = [
  { titleKey: "sidebar.websites", path: "websites", icon: Globe },
  { titleKey: "sidebar.websiteContent", path: "website-content", icon: Boxes, requiredFeature: "discovery" },
  { titleKey: "sidebar.wpControl", path: "wp-control", icon: SlidersHorizontal },
  { titleKey: "sidebar.marketplace", path: "marketplace", icon: Store, requiredFeature: "internalLinks" },
  { titleKey: "sidebar.dataCsv", path: "data", icon: Database },
];

// Everything related to SEO, keywords, ranking & analytics.
const seoNav: NavItem[] = [
  { titleKey: "sidebar.pgpKeywords", path: "pgp-keywords", icon: KeyRound },
  { titleKey: "sidebar.pgpGenerate", path: "pgp-generate", icon: Zap },
  { titleKey: "sidebar.pgpTerms", path: "pgp-terms", icon: Columns3 },
  { titleKey: "sidebar.seoAudit", path: "seo-audit", icon: ClipboardCheck },
  { titleKey: "sidebar.indexing", path: "indexing", icon: SearchIcon, requiredFeature: "indexing" },
  { titleKey: "sidebar.analytics", path: "analytics", icon: BarChart3 },
  { titleKey: "sidebar.performance", path: "performance", icon: Activity },
];

const settingsNav: NavItem[] = [
  { titleKey: "sidebar.affiliate", path: "affiliate", icon: Gift },
  { titleKey: "sidebar.referral", path: "referral", icon: Link2 },
  { titleKey: "sidebar.billing", path: "billing", icon: CreditCard },
  { titleKey: "sidebar.settings", path: "settings", icon: Settings },
  { titleKey: "sidebar.workspaceSettings", path: "workspace-settings", icon: Users, requiredFeature: "teamCollaboration" },
];

interface AppSidebarProps {
  onLogout?: () => void;
}

export function AppSidebar({ onLogout }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [isAdmin, setIsAdmin] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { pagesUsed, pagesLimit, canUseFeature } = useSubscription();
  const { appName, logoUrl, isWhitelabeled } = useBranding();
  const { basePath } = useWorkspace();

  // Whether any nav item in a group matches the current route.
  const isGroupActive = (items: NavItem[]) =>
    items.some((item) => {
      const full = `${basePath}/${item.path}`;
      return item.path === "dashboard" ? pathname === full : pathname.startsWith(full);
    });
  const usagePercent = pagesLimit > 0 ? Math.round((pagesUsed / pagesLimit) * 100) : 0;
  const [openGroups, setOpenGroups] = usePersistedState<Record<string, boolean>>(
    "sidebar:groups",
    { main: true, website: true, seo: true },
  );
  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!data);
    }
    checkAdmin();
  }, []);

  const onboardingMap: Record<string, string> = {
    "campaigns": "campaigns",
    "templates": "templates",
    "analytics": "analytics",
  };

  const hasRole = (role?: UserRole) => {
    if (!role) return true;
    if (role === "admin") return isAdmin;
    return true;
  };

  const renderNavItems = (items: NavItem[]) =>
    items
      .filter((item) => hasRole(item.requiredRole))
      .map((item) => {
      const fullPath = `${basePath}/${item.path}`;
      const isLocked = item.requiredFeature ? !canUseFeature(item.requiredFeature) : false;
      const minPlanLabel = item.requiredFeature
        ? PLAN_FEATURES[getMinimumPlanFor(item.requiredFeature)].label
        : "";

      if (isLocked) {
        const content = (
          <button
            onClick={() => navigate(`${basePath}/billing`)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground/50 hover:bg-muted/50 transition-all duration-150 w-full cursor-pointer"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="text-sm flex-1 text-left">{t(item.titleKey)}</span>
                <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
              </>
            )}
          </button>
        );

        return (
          <SidebarMenuItem key={item.titleKey}>
            <SidebarMenuButton asChild>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent side="right">
                    {t("common.requiresPlan", { plan: minPlanLabel })}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent side="right">
                    {t("common.upgradeToUnlock", { plan: minPlanLabel })}
                  </TooltipContent>
                </Tooltip>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      }

      return (
        <SidebarMenuItem key={item.titleKey}>
          <SidebarMenuButton asChild>
            <NavLink
              to={fullPath}
              end={item.path === "dashboard"}
              className="group/nav relative flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-0 before:w-1 before:rounded-full before:bg-primary before:transition-all before:duration-200"
              activeClassName="bg-primary/10 text-primary font-semibold shadow-sm before:h-5"
              {...(onboardingMap[item.path] ? { "data-onboarding": onboardingMap[item.path] } : {})}
            >
              <item.icon className="h-4 w-4 shrink-0 transition-colors group-[.active]/nav:text-primary" />
              {!collapsed && <span className="text-sm">{t(item.titleKey)}</span>}
            </NavLink>

          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  const renderCollapsibleGroup = (
    groupKey: string,
    labelKey: string,
    items: NavItem[],
    className?: string,
  ) => {
    // When collapsed to icon rail, groups are always shown (no toggle chrome).
    if (collapsed) {
      return (
        <SidebarGroup className={className}>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">{renderNavItems(items)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }
    const isOpen = openGroups[groupKey] ?? true;
    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleGroup(groupKey)} className={className}>
        <SidebarGroup>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="group/label flex items-center justify-between cursor-pointer select-none text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-1 hover:text-foreground transition-colors">
              <span>{t(labelKey)}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-data-[state=closed]/label:-rotate-90" />
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">{renderNavItems(items)}</SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent className="px-3 py-4">
        {/* Branding / Workspace Switcher */}
        {!collapsed && (
          <div className="mb-3 px-3 flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-7 w-7 rounded-lg object-contain shrink-0" />
            ) : (
              <img src={logo3x} alt={appName} width={1107} height={261} className="h-7 w-auto object-contain shrink-0" />
            )}
            {isWhitelabeled && (
              <span className="text-sm font-semibold truncate">{appName}</span>
            )}
          </div>
        )}
        <div className="mb-4">
          <WorkspaceSwitcher collapsed={collapsed} />
        </div>

        {renderCollapsibleGroup("main", "sidebar.main", mainNav)}

        {!collapsed && <Separator className="my-3 mx-3" />}

        {renderCollapsibleGroup("website", "sidebar.websiteSection", websiteNav)}

        {!collapsed && <Separator className="my-3 mx-3" />}

        {renderCollapsibleGroup("seo", "sidebar.seoSection", seoNav)}

        {!collapsed && <Separator className="my-3 mx-3" />}

        <SidebarGroup className="mt-auto">
          {!collapsed && (
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-1">
              {t("sidebar.account")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={`${basePath}/admin`}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150"
                      activeClassName="bg-primary/10 text-primary font-medium shadow-sm"
                    >
                      <ShieldCheck className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{t("sidebar.admin")}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {renderNavItems(settingsNav)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 pb-4">
        {!collapsed && (
          <div className="px-3 py-3 rounded-xl bg-muted/50 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">{t("sidebar.usage")}</span>
              <span className="tabular-nums">{pagesUsed} / {pagesLimit}</span>
            </div>
            <Progress value={usagePercent} className="h-1.5" />
            <p className="text-[11px] text-muted-foreground">{t("sidebar.pagesGenerated")}</p>
          </div>
        )}
        {onLogout && (
          <SidebarMenu className="mt-2">
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={onLogout}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-all duration-150"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="text-sm">{t("sidebar.logout")}</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
