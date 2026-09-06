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

interface LegacyPurchase {
  id: string;
  plan: string;
  billing_cycle: string | null;
  created_at: string;
}

interface PlanPriceRow {
  plan: string;
  label: string | null;
  monthly_price: number | null;
  yearly_discount: number | null;
  currency: string | null;
}

/** Builds a synthetic invoice record for an older purchase that predates invoice records. */
function legacyPurchaseToInvoice(
  purchase: LegacyPurchase,
  pricing: PlanPriceRow | undefined,
  email: string | null,
): InvoiceRecord {
  const cycle = (purchase.billing_cycle || "monthly").toLowerCase();
  const monthly = Number(pricing?.monthly_price ?? 0);
  const discount = Number(pricing?.yearly_discount ?? 0);
  const amount =
    cycle === "yearly" || cycle === "annual"
      ? Math.round(monthly * 12 * (1 - discount / 100) * 100)
      : Math.round(monthly * 100);
  const planLabel = pricing?.label || purchase.plan;
  const issuedYear = new Date(purchase.created_at).getFullYear();
  return {
    id: `legacy-${purchase.id}`,
    invoice_number: `INV-${issuedYear}-${purchase.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    customer_email: email,
    customer_name: null,
    description: `${planLabel} plan (${cycle})`,
    plan: planLabel,
    amount_total: amount,
    amount_refunded: 0,
    currency: (pricing?.currency || "eur").toLowerCase(),
    status: "paid",
    hosted_invoice_url: null,
    invoice_pdf_url: null,
    receipt_url: null,
    line_items: [
      {
        description: `${planLabel} plan — ${cycle} billing`,
        quantity: 1,
        amount,
      },
    ],
    billing_details: email ? { email } : null,
    issued_at: purchase.created_at,
  };
}

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

  // Older plan purchases (made before invoices were recorded) so they can be
  // turned into downloadable PDF invoices too.
  const { data: legacyInvoices = [] } = useQuery({
    queryKey: ["my-legacy-purchases", invoices.length],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return [] as InvoiceRecord[];

      const { data: subs, error: subsError } = await supabase
        .from("subscriptions")
        .select("id, plan, billing_cycle, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (subsError) throw subsError;

      const purchases = (subs || []) as LegacyPurchase[];
      if (purchases.length === 0) return [] as InvoiceRecord[];

      const coveredPlans = new Set(
        invoices.map((inv) => (inv.plan || "").toLowerCase().trim()),
      );
      const missing = purchases.filter(
        (p) => p.plan && !coveredPlans.has(p.plan.toLowerCase().trim()),
      );
      if (missing.length === 0) return [] as InvoiceRecord[];

      const { data: pricingRows } = await supabase
        .from("plan_pricing")
        .select("plan, label, monthly_price, yearly_discount, currency");
      const pricingByPlan = new Map(
        ((pricingRows || []) as PlanPriceRow[]).map((row) => [
          row.plan.toLowerCase().trim(),
          row,
        ]),
      );

      return missing
        .map((p) =>
          legacyPurchaseToInvoice(
            p,
            pricingByPlan.get(p.plan.toLowerCase().trim()),
            user.email ?? null,
          ),
        )
        .filter((inv) => inv.amount_total > 0);
    },
    enabled: !isLoading,
  });

  const allInvoices = [...invoices, ...legacyInvoices];

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
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("billing.invoicesEmpty")}</p>
          </div>
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
