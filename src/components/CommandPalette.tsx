import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Rocket,
  FileText,
  Layers,
  BarChart3,
  Globe,
  CreditCard,
  Settings,
  ScanSearch,
  Compass,
  Store,
  SearchIcon,
  Database,
  Users,
  Keyboard,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLanguage } from "@/i18n/LanguageContext";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navItems = [
  { titleKey: "sidebar.dashboard", icon: LayoutDashboard, path: "dashboard", keywords: "home overview" },
  { titleKey: "sidebar.websites", icon: Globe, path: "websites", keywords: "website connection wordpress shopify" },
  { titleKey: "sidebar.campaigns", icon: Rocket, path: "campaigns", keywords: "launch create campaign" },
  { titleKey: "sidebar.generatedPages", icon: Layers, path: "pages", keywords: "pages content generated" },
  { titleKey: "sidebar.templates", icon: FileText, path: "templates", keywords: "template html design" },
  { titleKey: "sidebar.marketplace", icon: Store, path: "marketplace", keywords: "marketplace shared community" },
  { titleKey: "sidebar.dataCsv", icon: Database, path: "data", keywords: "data csv upload file" },
  { titleKey: "sidebar.websiteContent", icon: Layers, path: "website-content", keywords: "content scrape fetch" },
  { titleKey: "sidebar.aiScanner", icon: ScanSearch, path: "scanner", keywords: "scan ai analyze" },
  { titleKey: "sidebar.discovery", icon: Compass, path: "discovery", keywords: "discover explore website" },
  { titleKey: "sidebar.analytics", icon: BarChart3, path: "analytics", keywords: "analytics stats metrics chart" },
  { titleKey: "sidebar.performance", icon: BarChart3, path: "performance", keywords: "performance page speed views" },
  
  { titleKey: "sidebar.contentCalendar", icon: Layers, path: "content-calendar", keywords: "calendar schedule plan content" },
  { titleKey: "sidebar.seoAudit", icon: ScanSearch, path: "seo-audit", keywords: "seo audit check score" },
  { titleKey: "sidebar.indexing", icon: SearchIcon, path: "indexing", keywords: "google index seo submit" },
  { titleKey: "sidebar.billing", icon: CreditCard, path: "billing", keywords: "billing plan subscription payment" },
  { titleKey: "sidebar.settings", icon: Settings, path: "settings", keywords: "settings profile preferences" },
  { titleKey: "sidebar.workspaceSettings", icon: Users, path: "workspace-settings", keywords: "workspace team members" },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { currentWorkspace, basePath } = useWorkspace();
  const { t } = useLanguage();
  const wsId = currentWorkspace?.id;

  const { data: campaigns = [] } = useQuery({
    queryKey: ["cmd-campaigns", wsId],
    enabled: open && !!wsId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("id, name, status")
        .eq("workspace_id", wsId!)
        .order("updated_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["cmd-templates", wsId],
    enabled: open && !!wsId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("templates")
        .select("id, name")
        .eq("workspace_id", wsId!)
        .order("updated_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: pages = [] } = useQuery({
    queryKey: ["cmd-pages", wsId],
    enabled: open && !!wsId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_pages")
        .select("id, title, slug, campaign_id")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  const go = useCallback(
    (path: string) => {
      navigate(path);
      onOpenChange(false);
    },
    [navigate, onOpenChange]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("command.searchPlaceholder")} />
      <CommandList>
        <CommandEmpty>{t("common.noResultsFound")}</CommandEmpty>

        <CommandGroup heading={t("common.navigation")}>
          {navItems.map((item) => (
            <CommandItem
              key={item.path}
               value={`nav-${t(item.titleKey)} ${item.keywords}`}
              onSelect={() => go(`${basePath}/${item.path}`)}
              className="gap-3"
            >
              <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
               <span>{t(item.titleKey)}</span>
              <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground opacity-0 group-aria-selected:opacity-100 transition-opacity" />
            </CommandItem>
          ))}
        </CommandGroup>

        {campaigns.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("sidebar.campaigns")}>
              {campaigns.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`campaign-${c.name}`}
                  onSelect={() => go(`${basePath}/campaigns/${c.id}`)}
                  className="gap-3"
                >
                  <Rocket className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground capitalize">{c.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {templates.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("sidebar.templates")}>
              {templates.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`template-${t.name}`}
                  onSelect={() => go(`${basePath}/templates`)}
                  className="gap-3"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{t.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {pages.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("sidebar.generatedPages")}>
              {pages.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`page-${p.title} ${p.slug}`}
                  onSelect={() => go(`${basePath}/pages`)}
                  className="gap-3"
                >
                  <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{p.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading={t("common.help")}>
          <CommandItem
            value="keyboard-shortcuts-help"
            onSelect={() => {
              onOpenChange(false);
              window.dispatchEvent(new CustomEvent("show-shortcuts-help"));
            }}
            className="gap-3"
          >
            <Keyboard className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{t("common.keyboardShortcuts")}</span>
            <kbd className="ml-auto text-[10px] font-mono text-muted-foreground border border-border rounded px-1">?</kbd>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
