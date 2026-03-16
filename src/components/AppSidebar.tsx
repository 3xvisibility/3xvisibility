import { 
  LayoutDashboard, 
  Rocket, 
  FileText, 
  Globe, 
  CreditCard, 
  Settings,
  ChevronLeft,
  LogOut
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
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
import { Button } from "@/components/ui/button";

const mainNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Campaigns", url: "/campaigns", icon: Rocket },
  { title: "Templates", url: "/templates", icon: FileText },
  { title: "Websites", url: "/websites", icon: Globe },
];

const bottomNav = [
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  onLogout?: () => void;
}

export function AppSidebar({ onLogout }: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            {!collapsed && <span className="text-display-sm">PGP</span>}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={toggleSidebar}
            >
              <ChevronLeft className={`h-4 w-4 transition-transform duration-150 ${collapsed ? 'rotate-180' : ''}`} />
            </Button>
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-4">
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-accent/50 transition-all duration-150"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-accent/50 transition-all duration-150"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && (
          <div className="px-3 py-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Usage</span>
              <span className="tabular-nums">42 / 100 pages</span>
            </div>
            <Progress value={42} className="h-1.5" />
          </div>
        )}
        {onLogout && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onLogout} className="text-destructive hover:bg-destructive/10">
                <LogOut className="mr-2 h-4 w-4 shrink-0" />
                {!collapsed && <span>Log out</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
