import { useSearchParams, useNavigate } from "react-router-dom";
import logo3x from "@/assets/logo-3x.png";
import {
  ShieldCheck,
  Mail,
  Activity,
  Users,
  Rocket,
  FileText,
  CreditCard,
  Zap,
  BarChart3,
  Plug,
  KeyRound,
  Settings,
  ArrowLeft,
  LogOut,
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface AdminNavItem {
  label: string;
  /** Tab/section key synced to ?section= */
  section: string;
  icon: typeof Activity;
}

const managementNav: AdminNavItem[] = [
  { label: "Overview", section: "overview", icon: BarChart3 },
  { label: "Inbox", section: "inbox", icon: Mail },
  { label: "Activity", section: "activity", icon: Activity },
  { label: "Users", section: "users", icon: Users },
  { label: "Campaigns", section: "campaigns", icon: Rocket },
  { label: "Generated Pages", section: "pages", icon: FileText },
  { label: "Subscriptions", section: "subscriptions", icon: CreditCard },
];

const aiNav: AdminNavItem[] = [
  { label: "AI Credits", section: "ai-credits", icon: Zap },
  { label: "Usage Report", section: "ai-usage", icon: BarChart3 },
  { label: "AI Access", section: "ai-access", icon: KeyRound },
];

const systemNav: AdminNavItem[] = [
  { label: "Connections", section: "connections", icon: Plug },
  { label: "Settings", section: "settings", icon: Settings },
];

interface AdminSidebarProps {
  onLogout?: () => void;
}

export function AdminSidebar({ onLogout }: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { basePath } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get("section") || "overview";

  const renderItems = (items: AdminNavItem[]) =>
    items.map((item) => {
      const isActive = active === item.section;
      return (
        <SidebarMenuItem key={item.section}>
          <SidebarMenuButton asChild>
            <button
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("section", item.section);
                setSearchParams(next);
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg w-full text-left transition-all duration-150 ${
                isActive
                  ? "bg-primary/10 text-primary font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent className="px-3 py-4">
        {/* Admin header */}
        <div className="mb-4 px-3 flex items-center gap-2.5">
          <img src={logo3x} alt="3XVISIBILITY" className="h-7 w-7 rounded-lg object-contain shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">Admin Panel</p>
              <p className="text-[11px] text-muted-foreground truncate">Platform control</p>
            </div>
          )}
        </div>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-1">
              Management
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">{renderItems(managementNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && <Separator className="my-3 mx-3" />}

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-1">
              AI Control
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">{renderItems(aiNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && <Separator className="my-3 mx-3" />}

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-1">
              System
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">{renderItems(systemNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    onClick={() => navigate(`${basePath}/dashboard`)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg w-full text-left text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="text-sm">Back to App</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 pb-4">
        {onLogout && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={onLogout}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-all duration-150"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="text-sm">Log out</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
