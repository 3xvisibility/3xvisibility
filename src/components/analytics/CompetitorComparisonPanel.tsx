import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
};

interface Competitor {
  id: string;
  domain: string;
  label: string | null;
  authority_score: number;
  organic_keywords: number;
  organic_traffic: number;
  backlinks: number;
  is_self: boolean;
}

const emptyForm = {
  domain: "",
  label: "",
  authority_score: "",
  organic_keywords: "",
  organic_traffic: "",
  backlinks: "",
  is_self: false,
};

export default function CompetitorComparisonPanel({ workspaceId }: { workspaceId?: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: competitors = [], isLoading } = useQuery({
    queryKey: ["competitors", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitors")
        .select("id, domain, label, authority_score, organic_keywords, organic_traffic, backlinks, is_self")
        .eq("workspace_id", workspaceId!)
        .order("is_self", { ascending: false })
        .order("organic_traffic", { ascending: false });
      if (error) throw error;
      return (data || []) as Competitor[];
    },
  });

  const addCompetitor = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !workspaceId) throw new Error("Not signed in");
      const { error } = await supabase.from("competitors").insert({
        workspace_id: workspaceId,
        user_id: user.id,
        domain: form.domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""),
        label: form.label.trim() || null,
        authority_score: parseInt(form.authority_score || "0", 10) || 0,
        organic_keywords: parseInt(form.organic_keywords || "0", 10) || 0,
        organic_traffic: parseInt(form.organic_traffic || "0", 10) || 0,
        backlinks: parseInt(form.backlinks || "0", 10) || 0,
        is_self: form.is_self,
        last_checked_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitors", workspaceId] });
      setOpen(false);
      setForm(emptyForm);
      toast({ title: "Competitor added" });
    },
    onError: (e: Error) => toast({ title: "Could not add competitor", description: e.message, variant: "destructive" }),
  });

  const removeCompetitor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("competitors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["competitors", workspaceId] }),
  });

  const chartData = useMemo(
    () =>
      competitors.slice(0, 6).map((c) => ({
        name: c.label || c.domain,
        keywords: c.organic_keywords,
        traffic: c.organic_traffic,
        authority: c.authority_score,
      })),
    [competitors],
  );

  const self = competitors.find((c) => c.is_self);

  return (
    <Card className="shadow-surface">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Competitor Comparison
          </h3>
          <div className="flex items-center gap-2">
            {self && <Badge variant="outline" className="text-[10px]">You: {self.domain}</Badge>}
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add domain
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : competitors.length === 0 ? (
          <div className="h-[180px] flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            No competitors tracked yet.
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add your site and a rival
            </Button>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="keywords" name="Organic keywords" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="traffic" name="Organic traffic" fill="hsl(var(--muted-foreground) / 0.4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="overflow-x-auto" data-no-autotranslate>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Domain</TableHead>
                    <TableHead className="text-xs text-right">Authority</TableHead>
                    <TableHead className="text-xs text-right">Keywords</TableHead>
                    <TableHead className="text-xs text-right">Traffic</TableHead>
                    <TableHead className="text-xs text-right">Backlinks</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitors.map((c) => (
                    <TableRow key={c.id} className={c.is_self ? "bg-primary/5" : undefined}>
                      <TableCell className="text-xs font-medium">
                        {c.label || c.domain}
                        {c.is_self && <Badge variant="secondary" className="ml-2 text-[9px]">You</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{c.authority_score}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{c.organic_keywords.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{c.organic_traffic.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right tabular-nums">{c.backlinks.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeCompetitor.mutate(c.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a domain to compare</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Domain</Label>
              <Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="competitor.com" />
            </div>
            <div>
              <Label className="text-xs">Label (optional)</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Authority score</Label>
                <Input type="number" value={form.authority_score} onChange={(e) => setForm({ ...form, authority_score: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Organic keywords</Label>
                <Input type="number" value={form.organic_keywords} onChange={(e) => setForm({ ...form, organic_keywords: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Organic traffic</Label>
                <Input type="number" value={form.organic_traffic} onChange={(e) => setForm({ ...form, organic_traffic: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Backlinks</Label>
                <Input type="number" value={form.backlinks} onChange={(e) => setForm({ ...form, backlinks: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={form.is_self} onCheckedChange={(v) => setForm({ ...form, is_self: v })} />
              <Label className="text-xs">This is my own site</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.domain.trim() || addCompetitor.isPending} onClick={() => addCompetitor.mutate()}>
              Add domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
