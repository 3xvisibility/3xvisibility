import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Menu as MenuIcon,
  Palette,
  LayoutTemplate,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { extractEdgeError } from "@/lib/edge-function-error";

interface MenuItem {
  id: number;
  name: string;
  slug: string;
  count: number;
}
interface MenuLocation {
  slug: string;
  label: string;
  assigned_id: number;
}
interface ThemeItem {
  stylesheet: string;
  name: string;
  version: string;
  is_block: boolean;
  active: boolean;
}
interface PageTemplate {
  slug: string;
  name: string;
}
interface SiteActionData {
  menus: { menus: MenuItem[]; locations: MenuLocation[] };
  themes: { active: string; themes: ThemeItem[] };
  templates: { templates: PageTemplate[] };
}

const NONE = "__none__";

export default function WpControlPage() {
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const [websiteId, setWebsiteId] = useState<string>("");
  const [postId, setPostId] = useState<string>("");
  const [pageTemplate, setPageTemplate] = useState<string>("");

  const { data: websites, isLoading: sitesLoading } = useQuery({
    queryKey: ["wp-control-sites", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("id, name, url, type")
        .eq("workspace_id", wsId!)
        .eq("type", "wordpress")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const {
    data: actions,
    isLoading: actionsLoading,
    isFetching: actionsFetching,
    error: actionsError,
    refetch,
  } = useQuery<SiteActionData>({
    queryKey: ["wp-control-actions", websiteId],
    enabled: !!websiteId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("wp-site-actions", {
        body: { website_id: websiteId, action: "list" },
      });
      if (error) throw new Error(await extractEdgeError(error, "Failed to load site actions"));
      if (data?.error) throw new Error(data.error);
      return data as SiteActionData;
    },
  });

  const runAction = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke("wp-site-actions", {
        body: { website_id: websiteId, ...body },
      });
      if (error) throw new Error(await extractEdgeError(error, "Action failed"));
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Done", description: "WordPress updated successfully." });
      refetch();
    },
    onError: (e: Error) => {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    },
  });

  const busy = runAction.isPending;

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <SlidersHorizontal className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">WordPress Control</h1>
          <p className="text-sm text-muted-foreground">
            Control menus, themes, and page templates on a connected WordPress site through the connector plugin.
          </p>
        </div>
      </div>

      {/* Site picker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected site</CardTitle>
          <CardDescription>Requires the 3xVisibility WordPress Connector plugin (v1.3.0+).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label>WordPress site</Label>
            {sitesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={websiteId} onValueChange={setWebsiteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a WordPress site" />
                </SelectTrigger>
                <SelectContent>
                  {(websites ?? []).map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name || w.url}
                    </SelectItem>
                  ))}
                  {(websites ?? []).length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No WordPress sites connected.</div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
          <Button
            variant="outline"
            disabled={!websiteId || actionsFetching}
            onClick={() => refetch()}
          >
            {actionsFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </CardContent>
      </Card>

      {!websiteId && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Select a site</AlertTitle>
          <AlertDescription>Choose a connected WordPress site to manage its menus, theme, and page templates.</AlertDescription>
        </Alert>
      )}

      {websiteId && actionsError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Could not reach the connector</AlertTitle>
          <AlertDescription>{(actionsError as Error).message}</AlertDescription>
        </Alert>
      )}

      {websiteId && actionsLoading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {websiteId && actions && (
        <>
          {/* Menus */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MenuIcon className="h-4 w-4" /> Navigation menus
              </CardTitle>
              <CardDescription>Assign a menu to each theme location.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(actions.menus?.locations ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">This theme registered no menu locations.</p>
              )}
              {(actions.menus?.locations ?? []).map((loc) => (
                <div key={loc.slug} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{loc.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{loc.slug}</p>
                  </div>
                  <Select
                    disabled={busy}
                    value={loc.assigned_id ? String(loc.assigned_id) : NONE}
                    onValueChange={(v) =>
                      runAction.mutate({
                        action: "assign_menu",
                        location: loc.slug,
                        menu_id: v === NONE ? 0 : Number(v),
                      })
                    }
                  >
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue placeholder="No menu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— No menu —</SelectItem>
                      {actions.menus.menus.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name} ({m.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Theme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4" /> Active theme
              </CardTitle>
              <CardDescription>Switch the active WordPress theme.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {actions.themes.themes.map((t) => (
                <div key={t.stylesheet} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      {t.name}
                      {t.active && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </Badge>
                      )}
                      {t.is_block && <Badge variant="outline">Block</Badge>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.stylesheet} · v{t.version}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={t.active ? "outline" : "default"}
                    disabled={t.active || busy}
                    onClick={() => runAction.mutate({ action: "activate_theme", stylesheet: t.stylesheet })}
                  >
                    {t.active ? "Current" : "Activate"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Page template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutTemplate className="h-4 w-4" /> Page template
              </CardTitle>
              <CardDescription>Set the layout template for a specific page by its WordPress post ID.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="space-y-1.5">
                <Label>Post ID</Label>
                <Input
                  type="number"
                  className="w-32"
                  placeholder="e.g. 42"
                  value={postId}
                  onChange={(e) => setPostId(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>Template</Label>
                <Select value={pageTemplate} onValueChange={setPageTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {actions.templates.templates.map((tpl) => (
                      <SelectItem key={tpl.slug} value={tpl.slug}>
                        {tpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                disabled={!postId || !pageTemplate || busy}
                onClick={() =>
                  runAction.mutate({
                    action: "set_page_template",
                    post_id: Number(postId),
                    template: pageTemplate,
                  })
                }
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Apply template
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
