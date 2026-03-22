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

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "dashboard", keywords: "home overview" },
  { label: "Websites", icon: Globe, path: "websites", keywords: "website connection wordpress shopify" },
  { label: "Campaigns", icon: Rocket, path: "campaigns", keywords: "launch create campaign" },
  { label: "Generated Pages", icon: Layers, path: "pages", keywords: "pages content generated" },
  { label: "Templates", icon: FileText, path: "templates", keywords: "template html design" },
  { label: "Marketplace", icon: Store, path: "marketplace", keywords: "marketplace shared community" },
  { label: "Data / CSV", icon: Database, path: "data", keywords: "data csv upload file" },
  { label: "Website Content", icon: Layers, path: "website-content", keywords: "content scrape fetch" },
  { label: "AI Scanner", icon: ScanSearch, path: "scanner", keywords: "scan ai analyze" },
  { label: "Discovery", icon: Compass, path: "discovery", keywords: "discover explore website" },
  { label: "Analytics", icon: BarChart3, path: "analytics", keywords: "analytics stats metrics chart" },
  { label: "Performance", icon: BarChart3, path: "performance", keywords: "performance page speed views" },
  { label: "A/B Testing", icon: Layers, path: "ab-testing", keywords: "ab test variant split" },
  { label: "Content Calendar", icon: Layers, path: "content-calendar", keywords: "calendar schedule plan content" },
  { label: "SEO Audit", icon: ScanSearch, path: "seo-audit", keywords: "seo audit check score" },
  { label: "Indexing", icon: SearchIcon, path: "indexing", keywords: "google index seo submit" },
  { label: "Billing", icon: CreditCard, path: "billing", keywords: "billing plan subscription payment" },
  { label: "Settings", icon: Settings, path: "settings", keywords: "settings profile preferences" },
  { label: "Workspace Settings", icon: Users, path: "workspace-settings", keywords: "workspace team members" },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { currentWorkspace, basePath } = useWorkspace();
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
      <CommandInput placeholder="Search pages, campaigns, templates, or navigate..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navItems.map((item) => (
            <CommandItem
              key={item.path}
              value={`nav-${item.label} ${item.keywords}`}
              onSelect={() => go(`${basePath}/${item.path}`)}
              className="gap-3"
            >
              <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{item.label}</span>
              <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground opacity-0 group-aria-selected:opacity-100 transition-opacity" />
            </CommandItem>
          ))}
        </CommandGroup>

        {campaigns.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Campaigns">
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
            <CommandGroup heading="Templates">
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
            <CommandGroup heading="Generated Pages">
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
        <CommandGroup heading="Help">
          <CommandItem
            value="keyboard-shortcuts-help"
            onSelect={() => {
              onOpenChange(false);
              window.dispatchEvent(new CustomEvent("show-shortcuts-help"));
            }}
            className="gap-3"
          >
            <Keyboard className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Keyboard Shortcuts</span>
            <kbd className="ml-auto text-[10px] font-mono text-muted-foreground border border-border rounded px-1">?</kbd>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
