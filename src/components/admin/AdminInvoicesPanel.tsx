import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, ExternalLink, FileText, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import {
  downloadInvoicePdf,
  formatInvoiceMoney,
  type InvoiceRecord,
} from "@/lib/invoice-pdf";

const statusTone = (status: string) => {
  if (status === "paid") return "bg-green-500/15 text-green-500 border-green-500/30";
  if (status === "refunded") return "bg-muted text-muted-foreground border-border";
  if (status === "partially_refunded")
    return "bg-amber-500/15 text-amber-500 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
};

export function AdminInvoicesPanel() {
  const [search, setSearch] = useState("");

  const invoicesQuery = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("issued_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as InvoiceRecord[];
    },
  });

  const invoices = invoicesQuery.data ?? [];
  const filtered = invoices.filter((inv) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.customer_email?.toLowerCase().includes(q) ||
      inv.customer_name?.toLowerCase().includes(q) ||
      inv.plan?.toLowerCase().includes(q) ||
      inv.description?.toLowerCase().includes(q)
    );
  });

  const totalPaid = filtered.reduce(
    (sum, inv) => sum + (inv.amount_total - (inv.amount_refunded || 0)),
    0,
  );
  const currency = filtered[0]?.currency || "usd";

  const handleDownload = (inv: InvoiceRecord) => {
    try {
      downloadInvoicePdf(inv);
      toast.success(`${inv.invoice_number}.pdf downloaded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build the PDF");
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
            Every successful payment automatically creates a numbered invoice. Download any of
            them as a PDF.
          </CardDescription>
        </div>
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
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Filter by invoice number, email, plan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{filtered.length}</span> invoices ·{" "}
            <span className="font-medium text-foreground">
              {formatInvoiceMoney(totalPaid, currency)}
            </span>{" "}
            net collected
          </div>
        </div>

        {invoicesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No invoices yet. They are created automatically when a customer pays.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Plan / item</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => (
                  <TableRow key={inv.id}>
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
                    <TableCell className="text-sm max-w-[220px] truncate">
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
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => handleDownload(inv)}>
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
    </Card>
  );
}
