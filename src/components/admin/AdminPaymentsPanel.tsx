import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  ExternalLink,
  RefreshCw,
  Undo2,
  Loader2,
  ShieldCheck,
  Wallet,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { AdminInvoicesPanel } from "./AdminInvoicesPanel";
import { EinvoicingConfigCard } from "./EinvoicingConfigCard";

interface PaymentItem {
  id: string;
  created: number;
  amount: number;
  amount_refunded: number;
  currency: string;
  status: string;
  refunded: boolean;
  disputed: boolean;
  description: string | null;
  product_name: string | null;
  receipt_url: string | null;
  invoice_url: string | null;
  customer_id: string | null;
  customer_email: string | null;
  payment_intent: string | null;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
  app_user: {
    id: string;
    email: string;
    full_name?: string | null;
    plan?: string | null;
  } | null;
}

interface ModeInfo {
  mode: "live" | "test";
  key_prefix: string;
  methods: { card: boolean; paypal: boolean };
}

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
  }).format(amount / 100);

const statusBadge = (item: PaymentItem) => {
  if (item.refunded)
    return { label: "Refunded", className: "bg-muted text-muted-foreground border-border" };
  if (item.amount_refunded > 0)
    return { label: "Partial refund", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" };
  if (item.disputed)
    return { label: "Disputed", className: "bg-destructive/15 text-destructive border-destructive/30" };
  if (item.status === "succeeded")
    return { label: "Succeeded", className: "bg-green-500/15 text-green-500 border-green-500/30" };
  if (item.status === "failed")
    return { label: "Failed", className: "bg-destructive/15 text-destructive border-destructive/30" };
  return { label: item.status, className: "bg-muted text-muted-foreground border-border" };
};

const PAYMENT_RANGES: Record<string, number | null> = {
  all: null,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "365d": 365,
};

export function AdminPaymentsPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [rangeFilter, setRangeFilter] = useState("all");
  const [refunding, setRefunding] = useState<PaymentItem | null>(null);
  const [refundReason, setRefundReason] = useState<
    "duplicate" | "fraudulent" | "requested_by_customer"
  >("requested_by_customer");
  const [refundAmount, setRefundAmount] = useState<string>("");

  const modeQuery = useQuery({
    queryKey: ["admin-payments-mode"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-payments", {
        body: { action: "mode" },
      });
      if (error) throw error;
      return data as ModeInfo;
    },
  });

  const listQuery = useQuery({
    queryKey: ["admin-payments-list"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-payments", {
        body: { action: "list", limit: 50 },
      });
      if (error) throw error;
      return data as { items: PaymentItem[]; mode: string };
    },
  });

  const methodsMutation = useMutation({
    mutationFn: async (methods: { card: boolean; paypal: boolean }) => {
      const { data, error } = await supabase.functions.invoke("admin-payments", {
        body: { action: "update-methods", ...methods },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Payment methods updated");
      qc.invalidateQueries({ queryKey: ["admin-payments-mode"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to update methods"),
  });

  const refundMutation = useMutation({
    mutationFn: async () => {
      if (!refunding) throw new Error("No charge selected");
      const cents = refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined;
      const { data, error } = await supabase.functions.invoke("admin-payments", {
        body: {
          action: "refund",
          charge_id: refunding.id,
          reason: refundReason,
          ...(cents ? { amount: cents } : {}),
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Refund issued");
      setRefunding(null);
      setRefundAmount("");
      qc.invalidateQueries({ queryKey: ["admin-payments-list"] });
    },
    onError: (e: any) => toast.error(e.message || "Refund failed"),
  });

  const items = listQuery.data?.items ?? [];

  const planOptions = Array.from(
    new Set(
      items
        .map((it) => it.app_user?.plan || it.product_name)
        .filter((p): p is string => !!p),
    ),
  ).sort();

  const rangeDays = PAYMENT_RANGES[rangeFilter];
  const cutoff = rangeDays ? Date.now() - rangeDays * 86_400_000 : null;

  const filtered = items.filter((it) => {
    if (planFilter !== "all" && (it.app_user?.plan || it.product_name) !== planFilter)
      return false;
    if (cutoff && it.created * 1000 < cutoff) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return Boolean(
      it.customer_email?.toLowerCase().includes(q) ||
        it.app_user?.full_name?.toLowerCase().includes(q) ||
        it.product_name?.toLowerCase().includes(q) ||
        it.id.toLowerCase().includes(q),
    );
  });

  const filteredTotal = filtered.reduce((s, i) => s + (i.amount - (i.amount_refunded || 0)), 0);

  return (
    <div className="space-y-6">
      <EinvoicingConfigCard />

      {/* Mode + Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Live Payments
          </CardTitle>
          <CardDescription>
            Current Stripe environment and the payment methods offered at checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {modeQuery.isLoading ? (
            <Skeleton className="h-14 w-full" />
          ) : (
            <div className="flex flex-wrap items-center gap-3 p-3 border rounded-lg bg-card">
              <Badge
                variant="outline"
                className={
                  modeQuery.data?.mode === "live"
                    ? "bg-green-500/15 text-green-500 border-green-500/30"
                    : "bg-amber-500/15 text-amber-500 border-amber-500/30"
                }
              >
                {modeQuery.data?.mode === "live" ? "LIVE MODE" : "TEST MODE"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Stripe key:{" "}
                <code className="text-[11px]">{modeQuery.data?.key_prefix}</code>
              </span>
              {modeQuery.data?.mode !== "live" && (
                <span className="text-xs text-amber-500">
                  Set a <code>sk_live_…</code> STRIPE_SECRET_KEY to accept real payments.
                </span>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <Label>Card</Label>
              </div>
              <Switch
                checked={modeQuery.data?.methods.card ?? true}
                disabled={methodsMutation.isPending}
                onCheckedChange={(v) =>
                  methodsMutation.mutate({
                    card: v,
                    paypal: modeQuery.data?.methods.paypal ?? true,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <Label>PayPal</Label>
              </div>
              <Switch
                checked={modeQuery.data?.methods.paypal ?? true}
                disabled={methodsMutation.isPending}
                onCheckedChange={(v) =>
                  methodsMutation.mutate({
                    card: modeQuery.data?.methods.card ?? true,
                    paypal: v,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-generated invoices */}
      <AdminInvoicesPanel />

      {/* Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Payments received</CardTitle>
            <CardDescription>Every Stripe charge, mapped to the paying user.</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => listQuery.refetch()}
            disabled={listQuery.isFetching}
          >
            {listQuery.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Filter by email, name, product…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={rangeFilter} onValueChange={setRangeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="365d">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            {planOptions.length > 0 && (
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  {planOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{filtered.length}</span> payments ·
            net{" "}
            <span className="font-medium text-foreground">
              {formatMoney(filteredTotal, filtered[0]?.currency || "eur")}
            </span>
          </div>


          {listQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No payments yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((it) => {
                    const s = statusBadge(it);
                    return (
                      <TableRow key={it.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(it.created * 1000).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {it.app_user?.full_name || it.customer_email || "Guest"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {it.customer_email}
                            {it.app_user?.plan && (
                              <Badge variant="outline" className="ml-2 text-[10px]">
                                {it.app_user.plan}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs max-w-[220px] truncate">
                          {it.product_name || it.description || "—"}
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {formatMoney(it.amount, it.currency)}
                          {it.amount_refunded > 0 && (
                            <div className="text-[10px] text-muted-foreground">
                              −{formatMoney(it.amount_refunded, it.currency)} refunded
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {it.payment_method_brand}
                          {it.payment_method_last4 && ` •••• ${it.payment_method_last4}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={s.className}>
                            {s.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1 whitespace-nowrap">
                          {it.receipt_url && (
                            <Button asChild size="sm" variant="ghost">
                              <a href={it.receipt_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Receipt
                              </a>
                            </Button>
                          )}
                          {it.status === "succeeded" && !it.refunded && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRefunding(it);
                                setRefundAmount("");
                                setRefundReason("requested_by_customer");
                              }}
                            >
                              <Undo2 className="h-3.5 w-3.5 mr-1" /> Refund
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refund dialog */}
      <Dialog open={!!refunding} onOpenChange={(o) => !o && setRefunding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue refund</DialogTitle>
            <DialogDescription>
              {refunding && (
                <>
                  Refund{" "}
                  <strong>
                    {formatMoney(
                      refunding.amount - refunding.amount_refunded,
                      refunding.currency,
                    )}
                  </strong>{" "}
                  to {refunding.customer_email || "customer"}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Amount (optional — leave blank for full refund)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder={
                  refunding
                    ? ((refunding.amount - refunding.amount_refunded) / 100).toFixed(2)
                    : ""
                }
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={refundReason} onValueChange={(v) => setRefundReason(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requested_by_customer">Requested by customer</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                  <SelectItem value="fraudulent">Fraudulent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefunding(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => refundMutation.mutate()}
              disabled={refundMutation.isPending}
            >
              {refundMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirm refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
