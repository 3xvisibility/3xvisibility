import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Sheet,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  downloadInvoicePdf,
  downloadInvoicesZip,
  downloadMergedInvoicePdf,
  formatInvoiceMoney,
  type InvoiceRecord,
} from "@/lib/invoice-pdf";
import { Checkbox } from "@/components/ui/checkbox";
import { FileArchive, FilePlus2 } from "lucide-react";
import { InvoiceDetailsDialog } from "./InvoiceDetailsDialog";
import { ManualInvoiceStatusDialog } from "./ManualInvoiceStatusDialog";

const statusTone = (status: string) => {
  if (status === "paid") return "bg-green-500/15 text-green-500 border-green-500/30";
  if (status === "partially_refunded")
    return "bg-amber-500/15 text-amber-500 border-amber-500/30";
  if (status === "refunded") return "bg-orange-500/15 text-orange-500 border-orange-500/30";
  if (status === "disputed") return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30";
  if (status === "voided") return "bg-destructive/15 text-destructive border-destructive/30";
  return "bg-muted text-muted-foreground border-border";
};

const RANGES: Record<string, number | null> = {
  all: null,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "365d": 365,
};

export function AdminInvoicesPanel() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [range, setRange] = useState("all");
  const [plan, setPlan] = useState("all");
  const [selected, setSelected] = useState<InvoiceRecord | null>(null);
  const [adjusting, setAdjusting] = useState<InvoiceRecord | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const invoicesQuery = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("issued_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as InvoiceRecord[];
    },
  });

  const invoices = useMemo(() => invoicesQuery.data ?? [], [invoicesQuery.data]);

  const plans = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((i) => {
      const p = i.plan || i.description;
      if (p) set.add(p);
    });
    return Array.from(set).sort();
  }, [invoices]);

  const filtered = useMemo(() => {
    const days = RANGES[range];
    const cutoff = days ? Date.now() - days * 86_400_000 : null;
    const q = search.trim().toLowerCase();

    return invoices.filter((inv) => {
      if (status !== "all" && inv.status !== status) return false;
      if (plan !== "all" && (inv.plan || inv.description) !== plan) return false;
      if (cutoff && new Date(inv.issued_at).getTime() < cutoff) return false;
      if (!q) return true;
      return [
        inv.invoice_number,
        inv.customer_email,
        inv.customer_name,
        inv.plan,
        inv.description,
        inv.stripe_charge_id,
        inv.stripe_invoice_id,
        inv.stripe_customer_id,
        inv.stripe_payment_intent,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [invoices, search, status, plan, range]);

  const totals = useMemo(() => {
    const gross = filtered.reduce((s, i) => s + i.amount_total, 0);
    const refunded = filtered.reduce((s, i) => s + (i.amount_refunded || 0), 0);
    return { gross, refunded, net: gross - refunded };
  }, [filtered]);

  const currency = filtered[0]?.currency || "usd";

  const exportCsv = () => {
    const header = [
      "Invoice",
      "Issued",
      "Customer",
      "Email",
      "Plan",
      "Amount",
      "Refunded",
      "Currency",
      "Status",
      "Charge",
    ];
    const rows = filtered.map((i) => [
      i.invoice_number,
      new Date(i.issued_at).toISOString(),
      i.customer_name ?? "",
      i.customer_email ?? "",
      i.plan ?? i.description ?? "",
      (i.amount_total / 100).toFixed(2),
      ((i.amount_refunded || 0) / 100).toFixed(2),
      i.currency,
      i.status,
      i.stripe_charge_id ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} invoices`);
  };

  const chosen = filtered.filter((i) => checked.has(i.id));
  const bulkTargets = chosen.length > 0 ? chosen : filtered;
  const allVisibleChecked = filtered.length > 0 && filtered.every((i) => checked.has(i.id));

  const toggleAll = (value: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      filtered.forEach((i) => (value ? next.add(i.id) : next.delete(i.id)));
      return next;
    });
  };

  const toggleOne = (id: string, value: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const runBulk = async (mode: "zip" | "merged") => {
    if (bulkTargets.length === 0) return;
    setBulkBusy(true);
    try {
      if (mode === "zip") await downloadInvoicesZip(bulkTargets);
      else downloadMergedInvoicePdf(bulkTargets);
      toast.success(
        `${bulkTargets.length} invoice${bulkTargets.length > 1 ? "s" : ""} downloaded`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk download failed");
    } finally {
      setBulkBusy(false);
    }
  };



  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Invoices
          </CardTitle>
          <CardDescription>
            Every successful payment creates a numbered invoice. Search, filter, inspect full
            transaction metadata, and export.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Sheet className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => invoicesQuery.refetch()}
            disabled={invoicesQuery.isFetching}
          >
            {invoicesQuery.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search invoice, email, plan, charge id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partially_refunded">Partially refunded</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
              <SelectItem value="disputed">Disputed (chargeback)</SelectItem>
              <SelectItem value="voided">Voided (chargeback lost)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
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
          {plans.length > 0 && (
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                {plans.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Totals */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{filtered.length}</span> invoices
          </span>
          <span>
            Gross{" "}
            <span className="font-medium text-foreground">
              {formatInvoiceMoney(totals.gross, currency)}
            </span>
          </span>
          <span>
            Refunded{" "}
            <span className="font-medium text-destructive">
              {formatInvoiceMoney(totals.refunded, currency)}
            </span>
          </span>
          <span>
            Net{" "}
            <span className="font-medium text-foreground">
              {formatInvoiceMoney(totals.net, currency)}
            </span>
          </span>
        </div>

        {/* Bulk download bar */}
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {chosen.length > 0
                ? `${chosen.length} selected`
                : `No selection — actions apply to all ${filtered.length} filtered invoices`}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => runBulk("zip")}
              >
                {bulkBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <FileArchive className="h-3.5 w-3.5 mr-1" />
                )}
                Download ZIP ({bulkTargets.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkBusy}
                onClick={() => runBulk("merged")}
              >
                <FilePlus2 className="h-3.5 w-3.5 mr-1" /> Merged PDF ({bulkTargets.length})
              </Button>
              {chosen.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setChecked(new Set())}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}



        {invoicesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            {invoices.length === 0
              ? "No invoices yet. They are created automatically when a customer pays."
              : "No invoices match these filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={allVisibleChecked}
                      onCheckedChange={(v) => toggleAll(!!v)}
                      aria-label="Select all invoices"
                    />
                  </TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Plan / item</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => (
                  <TableRow
                    key={inv.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(inv)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={checked.has(inv.id)}
                        onCheckedChange={(v) => toggleOne(inv.id, !!v)}
                        aria-label={`Select ${inv.invoice_number}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(inv.issued_at).toLocaleDateString("en-US", {
                        dateStyle: "medium",
                      })}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{inv.customer_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {inv.customer_email || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {inv.plan || inv.description || "—"}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums whitespace-nowrap">
                      {formatInvoiceMoney(inv.amount_total, inv.currency)}
                      {inv.amount_refunded > 0 && (
                        <div className="text-[11px] text-destructive">
                          -{formatInvoiceMoney(inv.amount_refunded, inv.currency)} refunded
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusTone(inv.status)}>
                        {inv.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button size="sm" variant="ghost" onClick={() => setSelected(inv)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Details
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAdjusting(inv)}
                        title="Manually mark refunded or voided"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5 mr-1" /> Adjust
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          try {
                            downloadInvoicePdf(inv);
                          } catch (e) {
                            toast.error(
                              e instanceof Error ? e.message : "Could not build the PDF",
                            );
                          }
                        }}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> PDF
                      </Button>
                      {inv.hosted_invoice_url && (
                        <Button size="sm" variant="ghost" asChild className="ml-1">
                          <a
                            href={inv.hosted_invoice_url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open hosted invoice"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <ManualInvoiceStatusDialog
        invoice={adjusting}
        open={!!adjusting}
        onOpenChange={(o) => !o && setAdjusting(null)}
        onUpdated={() => invoicesQuery.refetch()}
      />

      <InvoiceDetailsDialog
        invoice={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </Card>
  );
}
