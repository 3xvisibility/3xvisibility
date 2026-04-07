import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Play, Pause, RotateCcw, Eye, FileText, Key, Layers, Loader2,
  CheckCircle2, XCircle, AlertTriangle, Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { filterDesignVars } from "@/lib/design-vars-filter";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { renderTemplate } from "@/lib/renderer";

type Template = Tables<"templates">;

interface PgpKeyword {
  id: string;
  name: string;
  terms: string[];
  term_count: number;
  delimiter: string | null;
  columns: string[];
}

export default function PgpGeneratePage() {
  const [searchParams] = useSearchParams();
  const preselectedGroup = searchParams.get("group") || "";

  const [selectedGroupId, setSelectedGroupId] = useState(preselectedGroup);
  const [method, setMethod] = useState<"all" | "specific">("all");
  const [numberOfPages, setNumberOfPages] = useState("");
  const [resumeIndex, setResumeIndex] = useState("0");
  const [overwrite, setOverwrite] = useState(false);
  const [spinContent, setSpinContent] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState("");
  const [publishMode, setPublishMode] = useState("draft");
  const [isGenerating, setIsGenerating] = useState(false);
  const [testPreview, setTestPreview] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState<{ processed: number; total: number; errors: number } | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentWorkspace, basePath } = useWorkspace();
  const wsId = currentWorkspace?.id;

  useEffect(() => {
    if (preselectedGroup) setSelectedGroupId(preselectedGroup);
  }, [preselectedGroup]);

  const { data: contentGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["pgp-content-groups", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("templates").select("*").eq("workspace_id", wsId!).order("name");
      if (error) throw error;
      return data as Template[];
    },
  });

  const { data: keywords = [] } = useQuery({
    queryKey: ["pgp-keywords-full", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pgp_keywords").select("*").eq("workspace_id", wsId!);
      if (error) throw error;
      return data as PgpKeyword[];
    },
  });

  const { data: websites = [] } = useQuery({
    queryKey: ["pgp-websites", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("websites").select("id, name, url, type, status").eq("workspace_id", wsId!).order("name");
      if (error) throw error;
      return data;
    },
  });

  const selectedGroup = contentGroups.find(g => g.id === selectedGroupId);

  const groupKeywords = useMemo(() => {
    if (!selectedGroup) return [];
    const vars = filterDesignVars(selectedGroup.variables || []).map(v => v.replace(/[{}]/g, ""));
    return vars.map(v => {
      const kw = keywords.find(k => k.name === v);
      return { name: v, keyword: kw || null, termCount: kw?.term_count || 0 };
    });
  }, [selectedGroup, keywords]);

  const maxPages = useMemo(() => {
    if (groupKeywords.length === 0) return 0;
    const counts = groupKeywords.filter(k => k.keyword).map(k => k.termCount);
    if (counts.length === 0) return 0;
    // All combinations or sequential based on method
    return Math.max(...counts);
  }, [groupKeywords]);

  const missingKeywords = groupKeywords.filter(k => !k.keyword);

  const handleTestGenerate = () => {
    if (!selectedGroup) return;
    // Build sample data from first term of each keyword
    const sampleData: Record<string, string> = {};
    for (const gk of groupKeywords) {
      if (gk.keyword && gk.keyword.terms.length > 0) {
        sampleData[gk.name] = gk.keyword.terms[0];
      } else {
        sampleData[gk.name] = `[${gk.name}]`;
      }
    }
    const rendered = renderTemplate(selectedGroup.content, sampleData);
    setTestPreview(rendered);
  };

  const handleGenerate = async () => {
    if (!selectedGroup || !wsId) return;
    if (missingKeywords.length > 0) {
      toast({ title: "Missing Keywords", description: `Define keywords: ${missingKeywords.map(k => k.name).join(", ")}`, variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGenProgress({ processed: 0, total: 0, errors: 0 });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Build CSV data from keywords
      const maxTerms = Math.max(...groupKeywords.map(k => k.termCount));
      const limit = numberOfPages ? Math.min(parseInt(numberOfPages), maxTerms) : maxTerms;
      const start = parseInt(resumeIndex) || 0;

      const rows: Record<string, string>[] = [];
      for (let i = start; i < Math.min(start + limit, maxTerms); i++) {
        const row: Record<string, string> = {};
        for (const gk of groupKeywords) {
          if (gk.keyword) {
            row[gk.name] = gk.keyword.terms[i % gk.keyword.terms.length] || "";
          }
        }
        rows.push(row);
      }

      setGenProgress({ processed: 0, total: rows.length, errors: 0 });

      // Create campaign
      const { data: campaign, error: campErr } = await supabase.from("campaigns").insert({
        name: `PGP: ${selectedGroup.name}`,
        template_id: selectedGroup.id,
        website_id: selectedWebsite || null,
        csv_data: rows,
        total_rows: rows.length,
        status: "processing" as any,
        user_id: user.id,
        workspace_id: wsId,
        publish_mode: publishMode,
        generation_method: method,
        campaign_types: ["seo"],
      } as any).select("id").single();

      if (campErr) throw campErr;

      // Invoke generation
      const { error: genErr } = await supabase.functions.invoke("generate-pages", {
        body: {
          campaign_id: campaign.id,
          overwrite,
        },
      });

      if (genErr) throw genErr;

      setGenProgress({ processed: rows.length, total: rows.length, errors: 0 });
      toast({ title: "Generation complete!", description: `${rows.length} pages generated.` });

      // Navigate to campaign detail
      setTimeout(() => {
        navigate(`${basePath}/campaigns/${campaign.id}`);
      }, 1500);

    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display">Generate</h1>
        <p className="text-muted-foreground mt-1">
          Select a Content Group and generate pages using your Keywords.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration */}
        <div className="lg:col-span-2 space-y-5">
          {/* Content Group Selection */}
          <Card className="shadow-surface">
            <CardContent className="p-5 space-y-4">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" /> Content Group
              </Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a Content Group..." />
                </SelectTrigger>
                <SelectContent>
                  {contentGroups.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      <span className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" /> {g.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedGroup && (
                <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keywords in this group</p>
                  <div className="space-y-2">
                    {groupKeywords.map(gk => (
                      <div key={gk.name} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <Key className="h-3.5 w-3.5 text-muted-foreground" />
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{`{${gk.name}}`}</code>
                        </div>
                        {gk.keyword ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> {gk.termCount} terms
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            <XCircle className="h-3 w-3 mr-1" /> Not defined
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  {missingKeywords.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Define missing keywords before generating.</span>
                      <Button variant="link" size="sm" className="text-amber-600 h-auto p-0 ml-auto" onClick={() => navigate(`${basePath}/pgp-keywords`)}>
                        Go to Keywords →
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generation Settings */}
          {selectedGroup && (
            <Card className="shadow-surface">
              <CardContent className="p-5 space-y-4">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" /> Generation Settings
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Number of Pages</Label>
                    <Input
                      type="number"
                      placeholder={`Max: ${maxPages}`}
                      value={numberOfPages}
                      onChange={(e) => setNumberOfPages(e.target.value)}
                      className="h-9"
                    />
                    <p className="text-[10px] text-muted-foreground">Leave blank to generate all ({maxPages} pages)</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Resume Index</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={resumeIndex}
                      onChange={(e) => setResumeIndex(e.target.value)}
                      className="h-9"
                    />
                    <p className="text-[10px] text-muted-foreground">Start from this term index (0-based)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Publish To</Label>
                    <Select value={selectedWebsite} onValueChange={setSelectedWebsite}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="None (save locally)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (save locally)</SelectItem>
                        {websites.filter(w => w.status === "connected").map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Publish Mode</Label>
                    <Select value={publishMode} onValueChange={setPublishMode}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="publish">Publish</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Overwrite Existing</p>
                      <p className="text-[11px] text-muted-foreground">Replace pages with matching slugs</p>
                    </div>
                    <Switch checked={overwrite} onCheckedChange={setOverwrite} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Spin Content</p>
                      <p className="text-[11px] text-muted-foreground">Resolve {"{spintax|variations}"} in content</p>
                    </div>
                    <Switch checked={spinContent} onCheckedChange={setSpinContent} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generation Progress */}
          {genProgress && (
            <Card className="shadow-surface">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Generation Progress</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {genProgress.processed}/{genProgress.total}
                  </span>
                </div>
                <Progress value={genProgress.total > 0 ? (genProgress.processed / genProgress.total) * 100 : 0} className="h-2" />
                {genProgress.errors > 0 && (
                  <p className="text-xs text-destructive">{genProgress.errors} error(s)</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Actions & Preview */}
        <div className="space-y-4">
          <Card className="shadow-surface">
            <CardContent className="p-5 space-y-3">
              <Button
                className="w-full"
                size="lg"
                disabled={!selectedGroup || missingKeywords.length > 0 || isGenerating}
                onClick={handleGenerate}
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" /> Generate</>
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                disabled={!selectedGroup || groupKeywords.every(k => !k.keyword)}
                onClick={handleTestGenerate}
              >
                <Eye className="h-4 w-4 mr-2" /> Test (Preview 1 Page)
              </Button>

              {selectedGroup && (
                <div className="rounded-xl border p-3 space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Keywords</span>
                    <span className="font-medium text-foreground">{groupKeywords.length}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Max Pages</span>
                    <span className="font-medium text-foreground">{maxPages}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Will Generate</span>
                    <span className="font-medium text-foreground">
                      {numberOfPages ? Math.min(parseInt(numberOfPages) || 0, maxPages) : maxPages}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Preview */}
          {testPreview && (
            <Card className="shadow-surface">
              <CardContent className="p-0 overflow-hidden rounded-xl">
                <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
                  <span className="text-xs font-semibold">Preview</span>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setTestPreview(null)}>Close</Button>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  <TemplatePreview html={testPreview} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
