import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Rocket,
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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
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
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { FeatureKey } from "@/lib/plan-features";
import { getMinimumPlanFor, PLAN_FEATURES } from "@/lib/plan-features";

interface NavItem {
  titleKey: string;
  /** Relative path within workspace, e.g. "dashboard" */
  path: string;
  icon: typeof LayoutDashboard;
  requiredFeature?: FeatureKey;
}

const mainNav: NavItem[] = [
  { titleKey: "sidebar.dashboard", path: "dashboard", icon: LayoutDashboard },
  { titleKey: "sidebar.websites", path: "websites", icon: Globe },
  { titleKey: "sidebar.campaigns", path: "campaigns", icon: Rocket },
  { titleKey: "sidebar.generatedPages", path: "pages", icon: Layers },
  { titleKey: "sidebar.templates", path: "templates", icon: FileText },
  { titleKey: "sidebar.marketplace", path: "marketplace", icon: Store },
  { titleKey: "sidebar.dataCsv", path: "data", icon: Database },
];

const pgpNav: NavItem[] = [
  { titleKey: "sidebar.pgpKeywords", path: "pgp-keywords", icon: KeyRound },
  { titleKey: "sidebar.pgpGenerate", path: "pgp-generate", icon: Zap },
  { titleKey: "sidebar.pgpTerms", path: "pgp-terms", icon: Database },
];

const toolsNav: NavItem[] = [
  { titleKey: "sidebar.websiteContent", path: "website-content", icon: Layers },
  { titleKey: "Variable Mapping", path: "template-mapping", icon: Columns3 },
  { titleKey: "sidebar.analytics", path: "analytics", icon: BarChart3 },
  { titleKey: "sidebar.performance", path: "performance", icon: Activity },
  
  { titleKey: "sidebar.contentCalendar", path: "content-calendar", icon: CalendarDays },
  { titleKey: "sidebar.seoAudit", path: "seo-audit", icon: ClipboardCheck },
  { titleKey: "sidebar.indexing", path: "indexing", icon: SearchIcon, requiredFeature: "indexing" },
];

const settingsNav: NavItem[] = [
  { titleKey: "sidebar.affiliate", path: "affiliate", icon: Gift },
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
  const { pagesUsed, pagesLimit, canUseFeature } = useSubscription();
  const { appName, logoUrl, isWhitelabeled } = useBranding();
  const { basePath } = useWorkspace();
  const usagePercent = pagesLimit > 0 ? Math.round((pagesUsed / pagesLimit) * 100) : 0;

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

  const renderNavItems = (items: NavItem[]) =>
    items.map((item) => {
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
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150"
              activeClassName="bg-primary/10 text-primary font-medium shadow-sm"
              {...(onboardingMap[item.path] ? { "data-onboarding": onboardingMap[item.path] } : {})}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-sm">{t(item.titleKey)}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent className="px-3 py-4">
        {/* Branding / Workspace Switcher */}
        {isWhitelabeled && !collapsed && (
          <div className="mb-3 px-3 flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-7 w-7 rounded-lg object-contain shrink-0" />
            ) : (
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <span className="text-sm font-semibold truncate">{appName}</span>
          </div>
        )}
        <div className="mb-4">
          <WorkspaceSwitcher collapsed={collapsed} />
        </div>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-1">
              {t("sidebar.main")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {renderNavItems(mainNav)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && <Separator className="my-3 mx-3" />}

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-1">
              {t("sidebar.pgpSection")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {renderNavItems(pgpNav)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && <Separator className="my-3 mx-3" />}

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-1">
              {t("sidebar.tools")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {renderNavItems(toolsNav)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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
