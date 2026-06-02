import { useState, useEffect, useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useJobNotifications } from "@/hooks/use-job-notifications";
import { useSessionTimeout } from "@/hooks/use-session-timeout";
import { AppSidebar } from "@/components/AppSidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useLocation } from "react-router-dom";
import { Search, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { CommandPalette } from "@/components/CommandPalette";
import { OnboardingTour } from "@/components/OnboardingTour";
import { WorkspaceBreadcrumb } from "@/components/WorkspaceBreadcrumb";
import { BackToTop } from "@/components/BackToTop";

interface DashboardLayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

export function DashboardLayout({ children, onLogout }: DashboardLayoutProps) {
  const [email, setEmail] = useState("");
  const [cmdOpen, setCmdOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { basePath } = useWorkspace();
  useJobNotifications();
  useSessionTimeout();
  useKeyboardShortcuts(useCallback(() => setCmdOpen(true), []));

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  const initials = email
    ? email.substring(0, 2).toUpperCase()
    : "U";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar onLogout={onLogout} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-card px-3 py-2 sm:px-4 lg:px-6 shrink-0">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <SidebarTrigger className="shrink-0 lg:hidden" />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground md:hidden"
                onClick={() => setCmdOpen(true)}
              >
                <Search className="h-4 w-4" />
                <span className="sr-only">{t("common.openSearch")}</span>
              </Button>
              <button
                data-onboarding="search"
                onClick={() => setCmdOpen(true)}
                className="hidden md:flex items-center gap-2 h-9 w-full max-w-xs lg:w-64 rounded-lg bg-muted/50 px-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left truncate">{t("dashboard.search")}</span>
                <kbd className="text-[10px] font-mono border border-border rounded px-1.5 py-0.5 bg-background text-muted-foreground">
                  ⌘K
                </kbd>
              </button>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="sr-only">{t("common.toggleTheme")}</span>
              </Button>
              <LanguageSwitcher
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
              />
              <NotificationsDropdown />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 min-w-0 gap-2 px-2 rounded-lg">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-sm font-medium truncate max-w-[120px]">
                      {email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate(`${basePath}/settings`)}>{t("dashboard.settings")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`${basePath}/billing`)}>{t("dashboard.billing")}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-destructive">
                    {t("dashboard.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <div className="border-b border-border bg-card/50 px-3 py-2 sm:px-4 lg:px-6 overflow-x-auto scrollbar-none">
            <WorkspaceBreadcrumb />
          </div>
          <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-8">
            <div className="max-w-7xl mx-auto animate-fade-in">
              {children}
            </div>
          </main>
          <KeyboardShortcutsDialog />
          <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
          <OnboardingTour />
          <BackToTop />
        </div>
      </div>
    </SidebarProvider>
  );
}
