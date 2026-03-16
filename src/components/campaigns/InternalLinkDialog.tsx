import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Link2, CheckCircle2, Settings2, Network } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LinkGraph } from "./LinkGraph";

interface InternalLinkDialogProps {
  campaignId: string;
  campaignName: string;
  templateVariables: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InternalLinkDialog({
  campaignId,
  campaignName,
  templateVariables,
  open,
  onOpenChange,
}: InternalLinkDialogProps) {
  const [enabled, setEnabled] = useState(true);
  const [maxLinks, setMaxLinks] = useState(5);
  const [sectionTitle, setSectionTitle] = useState("Related Pages");
  const [anchorFormat, setAnchorFormat] = useState("{title}");
  const [groupingVar, setGroupingVar] = useState<string>("");
  const [autoBuild, setAutoBuild] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const cleanVars = templateVariables.map((v) => v.replace(/[{}]/g, ""));

  // Load existing settings
  const { data: existingSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ["internal-link-settings", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("internal_link_settings")
        .select("*")
        .eq("campaign_id", campaignId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Load existing link count
  const { data: linkCount } = useQuery({
    queryKey: ["internal-links-count", campaignId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("internal_links")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId);
      if (error) throw error;
      return count || 0;
    },
    enabled: open,
  });

  // Graph data: pages and links
  const { data: graphPages = [] } = useQuery({
    queryKey: ["graph-pages", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_pages")
        .select("id, title")
        .eq("campaign_id", campaignId)
        .neq("status", "failed");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const { data: graphLinks = [] } = useQuery({
    queryKey: ["graph-links", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("internal_links")
        .select("source_page_id, target_page_id")
        .eq("campaign_id", campaignId);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (existingSettings) {
      setEnabled(existingSettings.enabled);
      setMaxLinks(existingSettings.max_links_per_page);
      setSectionTitle(existingSettings.section_title);
      setAnchorFormat(existingSettings.anchor_format);
      setGroupingVar(existingSettings.grouping_variable || "");
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        campaign_id: campaignId,
        user_id: user.id,
        enabled,
        max_links_per_page: maxLinks,
        section_title: sectionTitle,
        anchor_format: anchorFormat,
        grouping_variable: groupingVar || null,
        updated_at: new Date().toISOString(),
      };

      if (existingSettings) {
        const { error } = await supabase
          .from("internal_link_settings")
          .update(payload)
          .eq("id", existingSettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("internal_link_settings")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-link-settings", campaignId] });
      toast({ title: "Settings saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const buildMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("build-internal-links", {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { links_created: number; pages_updated: number; total_pages: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["internal-links-count", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["graph-links", campaignId] });
      toast({
        title: "Internal links built",
        description: `${data.links_created} links created across ${data.pages_updated} pages.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to build links", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Internal Linking — {campaignName}
          </DialogTitle>
        </DialogHeader>

        {loadingSettings ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="settings" className="mt-4">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="settings" className="flex items-center gap-1.5">
                <Settings2 className="h-3.5 w-3.5" /> Settings
              </TabsTrigger>
              <TabsTrigger value="graph" className="flex items-center gap-1.5">
                <Network className="h-3.5 w-3.5" /> Link Graph
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-5 mt-4">
              {/* Status */}
              {(linkCount ?? 0) > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  <span className="text-sm">
                    <strong>{linkCount}</strong> internal links currently active
                  </span>
                </div>
              )}

              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Enable Internal Linking</Label>
                  <p className="text-xs text-muted-foreground">Auto-link related pages in this campaign</p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              {enabled && (
                <>
                  {/* Max links */}
                  <div>
                    <Label>Maximum links per page</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={maxLinks}
                      onChange={(e) => setMaxLinks(parseInt(e.target.value) || 5)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Number of related page links to include on each page</p>
                  </div>

                  {/* Section title */}
                  <div>
                    <Label>Link section title</Label>
                    <Input
                      value={sectionTitle}
                      onChange={(e) => setSectionTitle(e.target.value)}
                      placeholder="e.g., Other Locations, Related Services"
                    />
                  </div>

                  {/* Anchor format */}
                  <div>
                    <Label>Anchor text format</Label>
                    <Input
                      value={anchorFormat}
                      onChange={(e) => setAnchorFormat(e.target.value)}
                      placeholder="e.g., {service} in {location}"
                      className="font-mono text-sm"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <button
                        type="button"
                        className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        onClick={() => setAnchorFormat("{title}")}
                      >
                        {"{title}"}
                      </button>
                      {cleanVars.map((v) => (
                        <button
                          key={v}
                          type="button"
                          className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors font-mono"
                          onClick={() => setAnchorFormat((prev) => `${prev}{${v}}`)}
                        >
                          {`{${v}}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grouping variable */}
                  <div>
                    <Label>Smart grouping variable</Label>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      Link pages that share this variable (e.g., same "service" across different "location" values)
                    </p>
                    <Select value={groupingVar} onValueChange={setGroupingVar}>
                      <SelectTrigger>
                        <SelectValue placeholder="None (link all pages)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (link all pages)</SelectItem>
                        {cleanVars.map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preview */}
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
                    <div className="text-sm">
                      <p className="font-semibold">{sectionTitle}</p>
                      <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5">
                        <li className="text-primary underline text-xs">{anchorFormat || "{title}"}</li>
                        <li className="text-primary underline text-xs">{anchorFormat || "{title}"}</li>
                        <li className="text-primary underline text-xs">{anchorFormat || "{title}"}</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
                <Button
                  onClick={async () => {
                    if (!existingSettings) {
                      await saveMutation.mutateAsync();
                    }
                    buildMutation.mutate();
                  }}
                  disabled={!enabled || buildMutation.isPending}
                >
                  {buildMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building...
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" /> Build Links Now
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="graph" className="mt-4">
              {graphLinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Network className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No internal links built yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Configure settings and click "Build Links Now" to generate the link graph.</p>
                </div>
              ) : (
                <LinkGraph pages={graphPages} links={graphLinks} />
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
