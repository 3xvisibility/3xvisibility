// Admin plan & pricing management.
//   • Rows live in public.plan_pricing (public read, admin write via RLS).
//   • The public pricing page reads the same rows, so edits here go live.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Save, Loader2 } from "lucide-react";

export interface PlanPricingRow {
  plan: string;
  label: string;
  monthly_price: number;
  yearly_discount: number;
  currency: string;
  pages_limit: number;
  ai_limit: number;
  base_credits: number;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  popular: boolean;
  active: boolean;
  sort_order: number;
}

const EMPTY: PlanPricingRow = {
  plan: "",
  label: "",
  monthly_price: 0,
  yearly_discount: 0.1667,
  currency: "EUR",
  pages_limit: 0,
  ai_limit: 0,
  base_credits: 0,
  stripe_price_id: "",
  stripe_product_id: "",
  popular: false,
  active: true,
  sort_order: 0,
};

export function PlanPricingPanel() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<PlanPricingRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-plan-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_pricing")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as PlanPricingRow[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (row: PlanPricingRow) => {
      const payload = {
        ...row,
        plan: row.plan.trim().toLowerCase(),
        stripe_price_id: row.stripe_price_id?.trim() || null,
        stripe_product_id: row.stripe_product_id?.trim() || null,
      };
      const { error } = await supabase.from("plan_pricing").upsert(payload as never, { onConflict: "plan" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan saved");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-plan-pricing"] });
      qc.invalidateQueries({ queryKey: ["public-plan-pricing"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save plan"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (plan: string) => {
      const { error } = await supabase.from("plan_pricing").delete().eq("plan", plan);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan removed");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["admin-plan-pricing"] });
      qc.invalidateQueries({ queryKey: ["public-plan-pricing"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to remove plan"),
  });

  const toggleActive = (row: PlanPricingRow, active: boolean) =>
    saveMutation.mutate({ ...row, active });

  if (isLoading) return <Skeleton className="h-72 w-full" />;

  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Plans & Pricing</CardTitle>
          <CardDescription>
            Edit plan names, prices, quotas and Stripe links. Changes appear on the public pricing page.
          </CardDescription>
        </div>
        <Button
          size="sm"
          onClick={() => { setDraft({ ...EMPTY, sort_order: (plans?.length || 0) + 1 }); setIsNew(true); }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add plan
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Price / mo</TableHead>
                <TableHead className="text-right">Pages</TableHead>
                <TableHead className="text-right">AI credits</TableHead>
                <TableHead>Stripe price ID</TableHead>
                <TableHead>Live</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(plans || []).map((p) => (
                <TableRow key={p.plan}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.label}</span>
                      {p.popular && <Badge variant="secondary" className="text-[10px]">Popular</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">{p.plan}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.currency === "EUR" ? "€" : ""}{Number(p.monthly_price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.pages_limit}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.ai_limit}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                    {p.stripe_price_id || (
                      Number(p.monthly_price) > 0 ? (
                        <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px]">
                          No Stripe price — not payable
                        </Badge>
                      ) : "—"
                    )}
                  </TableCell>

                  <TableCell>
                    <Switch checked={p.active} onCheckedChange={(v) => toggleActive(p, v)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setDraft({ ...p }); setIsNew(false); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(p.plan)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(plans || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No plans yet — add your first one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add plan" : `Edit ${draft?.label}`}</DialogTitle>
            <DialogDescription>These values drive the public pricing page and checkout.</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Plan key</Label>
                <Input
                  value={draft.plan}
                  disabled={!isNew}
                  placeholder="pro"
                  onChange={(e) => setDraft({ ...draft, plan: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Display name</Label>
                <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly price</Label>
                <Input type="number" min={0} value={draft.monthly_price}
                  onChange={(e) => setDraft({ ...draft, monthly_price: num(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1.5">
                <Label>Yearly discount (0–1)</Label>
                <Input type="number" step="0.01" min={0} max={1} value={draft.yearly_discount}
                  onChange={(e) => setDraft({ ...draft, yearly_discount: num(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input type="number" value={draft.sort_order}
                  onChange={(e) => setDraft({ ...draft, sort_order: num(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Page limit</Label>
                <Input type="number" value={draft.pages_limit}
                  onChange={(e) => setDraft({ ...draft, pages_limit: num(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>AI generations limit</Label>
                <Input type="number" value={draft.ai_limit}
                  onChange={(e) => setDraft({ ...draft, ai_limit: num(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Included credits</Label>
                <Input type="number" value={draft.base_credits}
                  onChange={(e) => setDraft({ ...draft, base_credits: num(e.target.value) })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Stripe price ID</Label>
                <Input value={draft.stripe_price_id || ""} placeholder="price_…"
                  onChange={(e) => setDraft({ ...draft, stripe_price_id: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Stripe product ID</Label>
                <Input value={draft.stripe_product_id || ""} placeholder="prod_…"
                  onChange={(e) => setDraft({ ...draft, stripe_product_id: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label className="text-sm">Most popular</Label>
                <Switch checked={draft.popular} onCheckedChange={(v) => setDraft({ ...draft, popular: v })} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label className="text-sm">Visible publicly</Label>
                <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button
              disabled={!draft?.plan || !draft?.label || saveMutation.isPending}
              onClick={() => draft && saveMutation.mutate(draft)}
            >
              {saveMutation.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Save className="mr-2 h-4 w-4" />}
              Save plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              It will disappear from the public pricing page. Existing subscribers are not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && deleteMutation.mutate(deleting)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
