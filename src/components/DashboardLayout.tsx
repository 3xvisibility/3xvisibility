import { useState, useEffect, useCallback } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useJobNotifications } from "@/hooks/use-job-notifications";
import { AppSidebar } from "@/components/AppSidebar";
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
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { CommandPalette } from "@/components/CommandPalette";
import { OnboardingTour } from "@/components/OnboardingTour";

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
  useJobNotifications();
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
          <header className="h-16 flex items-center justify-between border-b border-border bg-card px-4 lg:px-6 shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="lg:hidden" />
              <button
                onClick={() => setCmdOpen(true)}
                className="hidden md:flex items-center gap-2 h-9 w-64 rounded-lg bg-muted/50 px-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{t("dashboard.search")}</span>
                <kbd className="text-[10px] font-mono border border-border rounded px-1.5 py-0.5 bg-background text-muted-foreground">
                  ⌘K
                </kbd>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <LanguageSwitcher
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
              />
              <NotificationsDropdown />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 gap-2 px-2 rounded-lg">
                    <Avatar className="h-7 w-7">
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
                  <DropdownMenuItem onClick={() => navigate("/settings")}>{t("dashboard.settings")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/billing")}>{t("dashboard.billing")}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-destructive">
                    {t("dashboard.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto animate-fade-in">
              {children}
            </div>
          </main>
          <KeyboardShortcutsDialog />
          <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
        </div>
      </div>
    </SidebarProvider>
  );
}
