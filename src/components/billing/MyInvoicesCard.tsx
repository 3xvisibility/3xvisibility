import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileArchive, FilePlus2, FileText, FileCheck2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  downloadInvoicePdf,
  downloadInvoicesZip,
  downloadMergedInvoicePdf,
  formatInvoiceMoney,
  type InvoiceRecord,
} from "@/lib/invoice-pdf";

/** Invoices belonging to the signed-in customer, each downloadable as a PDF. */
export function MyInvoicesCard() {
  const { t } = useLanguage();
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["my-invoices"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return [] as InvoiceRecord[];
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", uid)
        .order("issued_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as InvoiceRecord[];
    },
  });

  const [bulkBusy, setBulkBusy] = useState(false);

  const runBulk = async (mode: "zip" | "merged") => {
    if (invoices.length === 0) return;
    setBulkBusy(true);
    try {
      if (mode === "zip") await downloadInvoicesZip(invoices);
      else downloadMergedInvoicePdf(invoices);
      toast.success(t("billing.invoicesDownloaded", { count: invoices.length }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("billing.invoicesBulkFailed"));
    } finally {
      setBulkBusy(false);
    }
  };

  if (!isLoading && invoices.length === 0) return null;

  return (
    <Card className="shadow-surface border-0">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 gap-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-4 w-4 text-primary" /> {t("billing.invoicesTitle")}
        </CardTitle>
        {invoices.length > 1 && (
          <div className="flex flex-wrap gap-2">
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
              {t("billing.invoicesDownloadZip")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => runBulk("merged")}
            >
              <FilePlus2 className="h-3.5 w-3.5 mr-1" /> {t("billing.invoicesMergedPdf")}
            </Button>
          </div>
        )}
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
                        : inv.status === "partially_refunded"
                          ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                          : inv.status === "refunded"
                            ? "bg-orange-500/15 text-orange-500 border-orange-500/30"
                            : inv.status === "disputed"
                              ? "bg-yellow-500/15 text-yellow-600 border-yellow-500/30"
                              : inv.status === "voided"
                                ? "bg-destructive/15 text-destructive border-destructive/30"
                                : "bg-muted text-muted-foreground border-border"
                    }
                  >
                    {inv.status.replace("_", " ")}
                  </Badge>
                  {inv.einvoicing_status &&
                    inv.einvoicing_status !== "not_configured" && (
                      <a
                        href={inv.einvoicing_url ?? "#"}
                        target={inv.einvoicing_url ? "_blank" : undefined}
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/15"
                        title={
                          inv.einvoicing_pa
                            ? `Compliant e-invoice via ${inv.einvoicing_pa}`
                            : "Compliant Factur-X e-invoice"
                        }
                      >
                        <FileCheck2 className="h-3 w-3" />
                        Factur-X · {inv.einvoicing_status}
                      </a>
                    )}
                  {(inv.amount_refunded || 0) > 0 && (
                    <span className="text-[11px] text-destructive">
                      -{formatInvoiceMoney(inv.amount_refunded, inv.currency)} {t("billing.invoicesRefunded")}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium truncate">
                  {inv.plan || inv.description || t("billing.invoicesSubscriptionPayment")}
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
                      toast.error(e instanceof Error ? e.message : t("billing.invoicesPdfFailed"));
                    }
                  }}
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> {t("billing.invoicesPdf")}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
