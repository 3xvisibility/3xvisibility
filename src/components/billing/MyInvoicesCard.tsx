import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileArchive, FilePlus2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  downloadInvoicePdf,
  downloadInvoicesZip,
  downloadMergedInvoicePdf,
  formatInvoiceMoney,
  type InvoiceRecord,
} from "@/lib/invoice-pdf";

/** Invoices belonging to the signed-in customer, each downloadable as a PDF. */
export function MyInvoicesCard() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["my-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("issued_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as InvoiceRecord[];
    },
  });

  if (!isLoading && invoices.length === 0) return null;

  return (
    <Card className="shadow-surface border-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-4 w-4 text-primary" /> Invoices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : (
          invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {inv.invoice_number}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      inv.status === "paid"
                        ? "bg-green-500/15 text-green-500 border-green-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    }
                  >
                    {inv.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-sm font-medium truncate">
                  {inv.plan || inv.description || "Subscription payment"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(inv.issued_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold tabular-nums">
                  {formatInvoiceMoney(inv.amount_total, inv.currency)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    try {
                      downloadInvoicePdf(inv);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Could not build the PDF");
                    }
                  }}
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> PDF
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
