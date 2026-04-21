import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowRight, Columns3, FileText, Info, Search, Sparkles,
  Image as ImageIcon, MessageSquareQuote, Rocket, Globe2, Layers,
  Pencil, X as XIcon, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  classifyTemplate, SECTIONS, type SectionKey, type ClassifiedVariable,
} from "@/lib/template-section-classifier";

interface Campaign {
  id: string;
  name: string;
  template_id: string | null;
  csv_data: any;
  mapping: Record<string, string> | null;
}

interface Template {
  id: string;
  name: string;
  content: string;
  variables: string[] | null;
}

interface GeneratedPage {
  id: string;
  title: string;
  slug: string;
  campaign_id: string | null;
  created_at: string;
}

const SECTION_ICON: Record<SectionKey, typeof Rocket> = {
  hero: Rocket,
  about: Info,
  gallery: ImageIcon,
  faq: MessageSquareQuote,
  seo: Globe2,
  other: Layers,
};

export default function TemplateMappingPage() {
  const { currentWorkspace, basePath } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [search, setSearch] = useState("");

  // Fetch campaigns that actually have a template attached
  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ["mapping-campaigns", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id,name,template_id,csv_data,mapping")
        .eq("workspace_id", wsId!)
        .not("template_id", "is", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Campaign[];
    },
  });

  // Auto-pick first campaign once loaded
  const activeCampaignId = selectedCampaignId || campaigns[0]?.id || "";
  const activeCampaign = campaigns.find(c => c.id === activeCampaignId) || null;

  const { data: template } = useQuery({
    queryKey: ["mapping-template", activeCampaign?.template_id],
    enabled: !!activeCampaign?.template_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("id,name,content,variables")
        .eq("id", activeCampaign!.template_id!)
        .maybeSingle();
      if (error) throw error;
      return data as Template | null;
    },
  });

  const { data: pages = [] } = useQuery({
    queryKey: ["mapping-pages", activeCampaignId],
    enabled: !!activeCampaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_pages")
        .select("id,title,slug,campaign_id,created_at")
        .eq("campaign_id", activeCampaignId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as GeneratedPage[];
    },
  });

  const queryClient = useQueryClient();

  /** Persist a mapping change for a single variable → CSV column. */
  const updateMapping = useMutation({
    mutationFn: async ({ varName, column }: { varName: string; column: string | null }) => {
      if (!activeCampaign) throw new Error("No campaign selected");
      const next = { ...(activeCampaign.mapping || {}) } as Record<string, string>;
      if (column) next[varName] = column;
      else delete next[varName];
      const { error } = await supabase
        .from("campaigns")
        .update({ mapping: next })
        .eq("id", activeCampaign.id);
      if (error) throw error;
      return next;
    },
    onSuccess: (_n, vars) => {
      toast.success(vars.column ? `Mapped {${vars.varName}} → ${vars.column}` : `Cleared mapping for {${vars.varName}}`);
      queryClient.invalidateQueries({ queryKey: ["mapping-campaigns", wsId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update mapping"),
  });

  // Classify variables once template is loaded
  const classified = useMemo<ClassifiedVariable[]>(() => {
    if (!template) return [];
    return classifyTemplate(template.content || "", template.variables || []);
  }, [template]);

  // Group classified vars by section
  const sectionGroups = useMemo(() => {
    const groups: Record<SectionKey, ClassifiedVariable[]> = {
      hero: [], about: [], gallery: [], faq: [], seo: [], other: [],
    };
    for (const v of classified) groups[v.section].push(v);
    return groups;
  }, [classified]);

  // Build CSV column → variable map
  const csvRows: Array<Record<string, any>> = useMemo(() => {
    const raw = activeCampaign?.csv_data;
    if (Array.isArray(raw)) return raw as Array<Record<string, any>>;
    return [];
  }, [activeCampaign]);

  const csvColumns = useMemo(() => {
    if (!csvRows.length) return [] as string[];
    return Object.keys(csvRows[0] || {});
  }, [csvRows]);

  /** Resolve which CSV column feeds a given variable name. */
  const resolveColumnForVar = (varName: string): string | null => {
    const m = activeCampaign?.mapping || {};
    // direct mapping wins
    if (typeof m[varName] === "string" && m[varName]) return m[varName];
    // fallback: case-insensitive direct match against csv columns
    const hit = csvColumns.find(c => c.toLowerCase() === varName.toLowerCase());
    return hit || null;
  };

  /** Resolve the actual filled value for a variable on a specific row. */
  const resolveValueForVar = (varName: string, row: Record<string, any>): string => {
    const col = resolveColumnForVar(varName);
    if (col && row[col] != null && row[col] !== "") return String(row[col]);
    if (row[varName] != null && row[varName] !== "") return String(row[varName]);
    return "";
  };

  const filteredVars = (vars: ClassifiedVariable[]) =>
    !search ? vars : vars.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));

  const totalVars = classified.length;
  const mappedVars = classified.filter(v => resolveColumnForVar(v.name)).length;
  const unmappedVars = totalVars - mappedVars;

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-display flex items-center gap-2">
            <Columns3 className="h-5 w-5 text-primary" />
            Template Variable Mapping
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            See exactly which CSV column fills the hero, about, gallery captions, FAQ
            and other slots of every generated page.
          </p>
        </div>
        <Button variant="outline" asChild size="sm" className="w-fit">
          <Link to={`${basePath}/campaigns`}>
            Manage campaigns <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {/* ── Campaign picker ──────────────────── */}
      <Card className="shadow-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Choose a campaign</CardTitle>
          <CardDescription className="text-xs">
            Mappings are scoped to the campaign + template combination.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingCampaigns ? (
            <Skeleton className="h-9 w-full max-w-sm" />
          ) : campaigns.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4">
              No campaigns with templates yet.{" "}
              <Link to={`${basePath}/campaigns`} className="underline text-primary">
                Create one
              </Link>{" "}
              to see its mapping here.
            </div>
          ) : (
            <Select value={activeCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="w-full sm:max-w-sm h-9">
                <SelectValue placeholder="Select a campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {activeCampaign && template && (
        <>
          {/* ── Summary stats ─────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Template" value={template.name} icon={FileText} />
            <StatCard label="Variables" value={String(totalVars)} icon={Sparkles} />
            <StatCard label="Mapped" value={String(mappedVars)} tone="success" />
            <StatCard label="Unmapped" value={String(unmappedVars)} tone={unmappedVars ? "warn" : "muted"} />
          </div>

          {/* ── Search ────────────────────────── */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter variables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          {/* ── Tabs: by section / by page ────── */}
          <Tabs defaultValue="sections" className="space-y-4">
            <TabsList>
              <TabsTrigger value="sections">By section</TabsTrigger>
              <TabsTrigger value="pages">By generated page</TabsTrigger>
            </TabsList>

            {/* By section view */}
            <TabsContent value="sections" className="space-y-4">
              {(Object.keys(SECTIONS) as SectionKey[]).map((key) => {
                const vars = filteredVars(sectionGroups[key]);
                if (vars.length === 0) return null;
                const Icon = SECTION_ICON[key];
                const meta = SECTIONS[key];
                return (
                  <Card key={key} className="shadow-surface overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className={`h-9 w-9 rounded-lg border flex items-center justify-center shrink-0 ${meta.badgeClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm flex items-center gap-2">
                            {meta.label}
                            <Badge variant="outline" className="text-[10px]">{vars.length}</Badge>
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {meta.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[140px]">Template variable</TableHead>
                              <TableHead className="min-w-[160px]">CSV column</TableHead>
                              <TableHead className="hidden sm:table-cell">Sample value</TableHead>
                              <TableHead className="text-right w-[80px]">Uses</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {vars.map(v => {
                              const col = resolveColumnForVar(v.name);
                              const sample = csvRows[0] ? resolveValueForVar(v.name, csvRows[0]) : "";
                              return (
                                <TableRow key={v.name}>
                                  <TableCell>
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                      {`{${v.name}}`}
                                    </code>
                                  </TableCell>
                                  <TableCell>
                                    <MappingEditor
                                      varName={v.name}
                                      currentColumn={col}
                                      csvColumns={csvColumns}
                                      isPending={updateMapping.isPending && updateMapping.variables?.varName === v.name}
                                      onChange={(column) => updateMapping.mutate({ varName: v.name, column })}
                                    />
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[260px] truncate">
                                    {sample || <span className="italic opacity-60">—</span>}
                                  </TableCell>
                                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                                    {v.occurrences}×
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {totalVars === 0 && (
                <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
                  This template has no <code className="bg-muted px-1 rounded">{'{variable}'}</code> placeholders.
                </CardContent></Card>
              )}
            </TabsContent>

            {/* By page view */}
            <TabsContent value="pages" className="space-y-4">
              {pages.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No pages have been generated for this campaign yet.
                </CardContent></Card>
              ) : (
                pages.map(page => {
                  const row = csvRows.find(r =>
                    String(r.slug || "").toLowerCase() === page.slug.toLowerCase()
                    || String(r.title || "").toLowerCase() === page.title.toLowerCase()
                  ) || csvRows[pages.indexOf(page)] || csvRows[0] || {};
                  return (
                    <Card key={page.id} className="shadow-surface">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm truncate">{page.title}</CardTitle>
                        <CardDescription className="text-xs truncate">/{page.slug}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="max-h-[260px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="min-w-[110px]">Section</TableHead>
                                <TableHead className="min-w-[120px]">Variable</TableHead>
                                <TableHead className="min-w-[120px]">From column</TableHead>
                                <TableHead>Filled value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredVars(classified).map(v => {
                                const col = resolveColumnForVar(v.name);
                                const value = resolveValueForVar(v.name, row);
                                const meta = SECTIONS[v.section];
                                return (
                                  <TableRow key={v.name}>
                                    <TableCell>
                                      <Badge variant="outline" className={`text-[10px] ${meta.badgeClass}`}>
                                        {meta.label}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                        {`{${v.name}}`}
                                      </code>
                                    </TableCell>
                                    <TableCell>
                                      <MappingEditor
                                        varName={v.name}
                                        currentColumn={col}
                                        csvColumns={csvColumns}
                                        compact
                                        isPending={updateMapping.isPending && updateMapping.variables?.varName === v.name}
                                        onChange={(column) => updateMapping.mutate({ varName: v.name, column })}
                                      />
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">
                                      {value || <span className="italic opacity-60">empty</span>}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

/* ─── tiny stat card ────────────────────────────── */

function StatCard({
  label, value, icon: Icon, tone = "default",
}: {
  label: string;
  value: string;
  icon?: typeof Rocket;
  tone?: "default" | "success" | "warn" | "muted";
}) {
  const toneCls =
    tone === "success" ? "text-emerald-600" :
    tone === "warn" ? "text-amber-600" :
    tone === "muted" ? "text-muted-foreground" : "text-foreground";
  return (
    <Card className="shadow-surface">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
        <p className={`mt-1 text-sm sm:text-base font-semibold truncate ${toneCls}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

/* ─── inline mapping editor ─────────────────────── */

const UNMAPPED = "__unmapped__";

function MappingEditor({
  varName, currentColumn, csvColumns, onChange, isPending, compact,
}: {
  varName: string;
  currentColumn: string | null;
  csvColumns: string[];
  onChange: (column: string | null) => void;
  isPending?: boolean;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (csvColumns.length === 0) {
    return (
      <span className="text-[11px] italic text-muted-foreground">
        No CSV columns available
      </span>
    );
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        {currentColumn ? (
          <span className="inline-flex items-center gap-1.5 text-xs min-w-0">
            {!compact && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
            <span className="font-medium truncate" title={currentColumn}>{currentColumn}</span>
          </span>
        ) : (
          <Badge variant="destructive" className="text-[10px]">unmapped</Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => setEditing(true)}
          aria-label={`Change mapping for ${varName}`}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pencil className="h-3 w-3" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Select
        defaultValue={currentColumn || UNMAPPED}
        onValueChange={(val) => {
          onChange(val === UNMAPPED ? null : val);
          setEditing(false);
        }}
      >
        <SelectTrigger className="h-7 text-xs min-w-[140px] max-w-[220px]">
          <SelectValue placeholder="Pick a CSV column" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNMAPPED}>
            <span className="italic text-muted-foreground">— Unmapped —</span>
          </SelectItem>
          {csvColumns.map(c => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => setEditing(false)}
        aria-label="Cancel"
      >
        <XIcon className="h-3 w-3" />
      </Button>
    </div>
  );
}
