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
  ScanSearch,
  Compass,
  ShieldCheck,
  Search as SearchIcon,
  Store,
  Zap,
  Users,
  Database,
  Lock,
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
import { useNavigate } from "react-router-dom";
import type { FeatureKey } from "@/lib/plan-features";
import { getMinimumPlanFor, PLAN_FEATURES } from "@/lib/plan-features";

interface NavItem {
  titleKey: string;
  url: string;
  icon: typeof LayoutDashboard;
  requiredFeature?: FeatureKey;
}

const mainNav: NavItem[] = [
  { titleKey: "sidebar.dashboard", url: "/dashboard", icon: LayoutDashboard },
  { titleKey: "sidebar.campaigns", url: "/campaigns", icon: Rocket },
  { titleKey: "sidebar.generatedPages", url: "/pages", icon: Layers },
  { titleKey: "sidebar.templates", url: "/templates", icon: FileText },
  { titleKey: "sidebar.dataCsv", url: "/data", icon: Database },
];

const toolsNav: NavItem[] = [
  { titleKey: "sidebar.aiScanner", url: "/scanner", icon: ScanSearch },
  { titleKey: "sidebar.discovery", url: "/discovery", icon: Compass, requiredFeature: "discovery" },
  { titleKey: "sidebar.analytics", url: "/analytics", icon: BarChart3 },
  { titleKey: "sidebar.indexing", url: "/indexing", icon: SearchIcon, requiredFeature: "indexing" },
  { titleKey: "sidebar.storeGenerator", url: "/store-generator", icon: Store, requiredFeature: "storeGenerator" },
];

const settingsNav: NavItem[] = [
  { titleKey: "sidebar.websites", url: "/websites", icon: Globe },
  { titleKey: "sidebar.billing", url: "/billing", icon: CreditCard },
  { titleKey: "sidebar.settings", url: "/settings", icon: Settings },
  { titleKey: "sidebar.workspaceSettings", url: "/workspace-settings", icon: Users, requiredFeature: "teamCollaboration" },
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
    "/campaigns": "campaigns",
    "/templates": "templates",
    "/analytics": "analytics",
  };

  const renderNavItems = (items: NavItem[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.titleKey}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.url === "/dashboard"}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150"
            activeClassName="bg-primary/10 text-primary font-medium shadow-sm"
            {...(onboardingMap[item.url] ? { "data-onboarding": onboardingMap[item.url] } : {})}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-sm">{t(item.titleKey)}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent className="px-3 py-4">
        {/* Workspace Switcher */}
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
                      to="/admin"
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
