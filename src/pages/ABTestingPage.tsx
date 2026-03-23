import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FlaskConical, Trophy, Trash2, Eye, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { useLanguage } from "@/i18n/LanguageContext";

interface ABTest {
  id: string;
  name: string;
  status: string;
  template_id: string | null;
  variant_a_content: string;
  variant_b_content: string;
  variant_a_label: string;
  variant_b_label: string;
  variant_a_pages: number;
  variant_b_pages: number;
  variant_a_published: number;
  variant_b_published: number;
  variant_a_failed: number;
  variant_b_failed: number;
  winner: string | null;
  created_at: string;
  completed_at: string | null;
}

export default function ABTestingPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [viewTest, setViewTest] = useState<ABTest | null>(null);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [variantALabel, setVariantALabel] = useState("Variant A");
  const [variantBLabel, setVariantBLabel] = useState("Variant B");
  const [variantAContent, setVariantAContent] = useState("");
  const [variantBContent, setVariantBContent] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { t } = useLanguage();
  const wsId = currentWorkspace?.id;

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["ab-tests", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ab_tests")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ABTest[];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["ab-templates", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("id, name, content")
        .eq("workspace_id", wsId!)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("ab_tests").insert({
        user_id: user.id,
        workspace_id: wsId!,
        name,
        template_id: templateId || null,
        variant_a_content: variantAContent,
        variant_b_content: variantBContent,
        variant_a_label: variantALabel,
        variant_b_label: variantBLabel,
        status: "running",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
      setCreateOpen(false);
      resetForm();
      toast({ title: "A/B test created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, winner }: { id: string; status: string; winner?: string }) => {
      const update: any = { status, updated_at: new Date().toISOString() };
      if (winner) update.winner = winner;
      if (status === "completed") update.completed_at = new Date().toISOString();
      const { error } = await supabase.from("ab_tests").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
      toast({ title: "Test updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ab_tests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
      toast({ title: "Test deleted" });
    },
  });

  function resetForm() {
    setName("");
    setTemplateId("");
    setVariantALabel("Variant A");
    setVariantBLabel("Variant B");
    setVariantAContent("");
    setVariantBContent("");
  }

  function loadTemplateContent(tplId: string) {
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) {
      setVariantAContent(tpl.content);
      setVariantBContent(tpl.content);
    }
    setTemplateId(tplId);
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      running: "bg-primary/10 text-primary",
      completed: "bg-success/10 text-success",
      paused: "bg-amber-100 text-amber-700",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  const getWinnerRate = (test: ABTest, variant: "a" | "b") => {
    const pages = variant === "a" ? test.variant_a_pages : test.variant_b_pages;
    const published = variant === "a" ? test.variant_a_published : test.variant_b_published;
    if (pages === 0) return 0;
    return Math.round((published / pages) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display">{t("abTesting.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("abTesting.description")}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> {t("abTesting.newTest")}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : tests.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>{t("abTesting.noTests")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tests.map((test) => (
            <Card key={test.id} className="shadow-surface hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{test.name}</h3>
                    <Badge className={`mt-1 ${statusBadge(test.status)}`}>{test.status}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewTest(test)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(test.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Performance bars */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{test.variant_a_label}</span>
                    <span className="text-muted-foreground">{getWinnerRate(test, "a")}% success ({test.variant_a_published}/{test.variant_a_pages})</span>
                  </div>
                  <Progress value={getWinnerRate(test, "a")} className="h-2" />

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{test.variant_b_label}</span>
                    <span className="text-muted-foreground">{getWinnerRate(test, "b")}% success ({test.variant_b_published}/{test.variant_b_pages})</span>
                  </div>
                  <Progress value={getWinnerRate(test, "b")} className="h-2" />
                </div>

                {test.winner && (
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <Trophy className="h-3.5 w-3.5" />
                    Winner: {test.winner === "a" ? test.variant_a_label : test.variant_b_label}
                  </div>
                )}

                {test.status === "running" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs flex-1"
                      onClick={() => updateStatusMutation.mutate({ id: test.id, status: "completed", winner: getWinnerRate(test, "a") >= getWinnerRate(test, "b") ? "a" : "b" })}>
                      <Trophy className="h-3 w-3 mr-1" /> End & Pick Winner
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => updateStatusMutation.mutate({ id: test.id, status: "paused" })}>
                      Pause
                    </Button>
                  </div>
                )}
                {test.status === "paused" && (
                  <Button size="sm" variant="outline" className="text-xs w-full"
                    onClick={() => updateStatusMutation.mutate({ id: test.id, status: "running" })}>
                    Resume
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create A/B Test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Test Name</Label>
                <Input placeholder="Homepage template test" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Base Template (optional)</Label>
                <Select value={templateId} onValueChange={loadTemplateContent}>
                  <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{variantALabel}</Label>
                  <Input className="w-32 h-7 text-xs" value={variantALabel} onChange={(e) => setVariantALabel(e.target.value)} />
                </div>
                <Textarea
                  className="font-mono text-xs min-h-[200px]"
                  placeholder="<h1>{title}</h1>..."
                  value={variantAContent}
                  onChange={(e) => setVariantAContent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>{variantBLabel}</Label>
                  <Input className="w-32 h-7 text-xs" value={variantBLabel} onChange={(e) => setVariantBLabel(e.target.value)} />
                </div>
                <Textarea
                  className="font-mono text-xs min-h-[200px]"
                  placeholder="<h1>{title}</h1>..."
                  value={variantBContent}
                  onChange={(e) => setVariantBContent(e.target.value)}
                />
              </div>
            </div>

            {/* Previews */}
            {(variantAContent || variantBContent) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium mb-1 text-muted-foreground">{variantALabel} Preview</p>
                  <div className="border rounded-md overflow-hidden h-40">
                    <TemplatePreview html={variantAContent} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1 text-muted-foreground">{variantBLabel} Preview</p>
                  <div className="border rounded-md overflow-hidden h-40">
                    <TemplatePreview html={variantBContent} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={!name || !variantAContent || !variantBContent || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Creating..." : "Create Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View test detail dialog */}
      <Dialog open={!!viewTest} onOpenChange={() => setViewTest(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {viewTest && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-primary" />
                  {viewTest.name}
                  <Badge className={statusBadge(viewTest.status)}>{viewTest.status}</Badge>
                </DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="compare">
                <TabsList>
                  <TabsTrigger value="compare">Compare</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
                </TabsList>
                <TabsContent value="compare" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">{viewTest.variant_a_label}</p>
                      <div className="border rounded-md overflow-hidden h-64">
                        <TemplatePreview html={viewTest.variant_a_content} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">{viewTest.variant_b_label}</p>
                      <div className="border rounded-md overflow-hidden h-64">
                        <TemplatePreview html={viewTest.variant_b_content} />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="stats" className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <h4 className="font-medium">{viewTest.variant_a_label}</h4>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-2xl font-bold">{viewTest.variant_a_pages}</p>
                            <p className="text-xs text-muted-foreground">Pages</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-primary">{viewTest.variant_a_published}</p>
                            <p className="text-xs text-muted-foreground">Published</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-destructive">{viewTest.variant_a_failed}</p>
                            <p className="text-xs text-muted-foreground">Failed</p>
                          </div>
                        </div>
                        <Progress value={getWinnerRate(viewTest, "a")} className="h-3" />
                        <p className="text-sm text-center font-medium">{getWinnerRate(viewTest, "a")}% success rate</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <h4 className="font-medium">{viewTest.variant_b_label}</h4>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-2xl font-bold">{viewTest.variant_b_pages}</p>
                            <p className="text-xs text-muted-foreground">Pages</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-primary">{viewTest.variant_b_published}</p>
                            <p className="text-xs text-muted-foreground">Published</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-destructive">{viewTest.variant_b_failed}</p>
                            <p className="text-xs text-muted-foreground">Failed</p>
                          </div>
                        </div>
                        <Progress value={getWinnerRate(viewTest, "b")} className="h-3" />
                        <p className="text-sm text-center font-medium">{getWinnerRate(viewTest, "b")}% success rate</p>
                      </CardContent>
                    </Card>
                  </div>
                  {viewTest.winner && (
                    <Card className="border-primary/30 bg-primary/5">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Trophy className="h-6 w-6 text-primary" />
                        <div>
                          <p className="font-semibold">Winner: {viewTest.winner === "a" ? viewTest.variant_a_label : viewTest.variant_b_label}</p>
                          <p className="text-sm text-muted-foreground">
                            Achieved {getWinnerRate(viewTest, viewTest.winner as "a" | "b")}% success rate
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
