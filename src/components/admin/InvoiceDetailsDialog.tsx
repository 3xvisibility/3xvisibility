import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Download, ExternalLink, Receipt } from "lucide-react";
import { toast } from "sonner";
import {
  downloadInvoicePdf,
  formatInvoiceMoney,
  type InvoiceRecord,
  type InvoiceLineItem,
} from "@/lib/invoice-pdf";

interface Props {
  invoice: InvoiceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Field = ({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) => (
  <div className="space-y-0.5">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`text-sm break-all ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</p>
  </div>
);

const copy = (value?: string | null) => {
  if (!value) return;
  navigator.clipboard.writeText(value);
  toast.success("Copied to clipboard");
};

/** Full metadata view for one invoice: customer, amounts, line items, Stripe references. */
export function InvoiceDetailsDialog({ invoice, open, onOpenChange }: Props) {
  if (!invoice) return null;

  const lines: InvoiceLineItem[] =
    invoice.line_items && invoice.line_items.length > 0
      ? invoice.line_items
      : [
          {
            description: invoice.plan || invoice.description || "Subscription payment",
            quantity: 1,
            amount: invoice.amount_total,
          },
        ];

  const billing = (invoice.billing_details || {}) as Record<string, unknown>;
  const billingEntries = Object.entries(billing).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );

  const net = invoice.amount_total - (invoice.amount_refunded || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <span className="font-mono text-base">{invoice.invoice_number}</span>
            <Badge
              variant="outline"
              className={
                invoice.status === "paid"
                  ? "bg-green-500/15 text-green-500 border-green-500/30"
                  : invoice.status === "partially_refunded"
                    ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                    : invoice.status === "refunded"
                      ? "bg-orange-500/15 text-orange-500 border-orange-500/30"
                      : invoice.status === "disputed"
                        ? "bg-yellow-500/15 text-yellow-600 border-yellow-500/30"
                        : invoice.status === "voided"
                          ? "bg-destructive/15 text-destructive border-destructive/30"
                          : "bg-muted text-muted-foreground border-border"
              }
            >
              {invoice.status.replace("_", " ")}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-9rem)] px-6">
          <div className="space-y-5 pb-6">
            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Amount</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatInvoiceMoney(invoice.amount_total, invoice.currency)}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Refunded</p>
                <p className="text-lg font-semibold tabular-nums text-destructive">
                  {formatInvoiceMoney(invoice.amount_refunded || 0, invoice.currency)}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Net</p>
                <p className="text-lg font-semibold tabular-nums">
                  {formatInvoiceMoney(net, invoice.currency)}
                </p>
              </div>
            </div>

            {/* Chargeback / dispute details */}
            {invoice.dispute_status && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                <p className="text-[11px] uppercase text-destructive font-medium">
                  Chargeback / dispute
                </p>
                <div className="grid gap-2 sm:grid-cols-2 text-sm">
                  <Field label="Dispute status" value={invoice.dispute_status} />
                  <Field label="Reason" value={invoice.dispute_reason} />
                  <Field
                    label="Disputed amount"
                    value={formatInvoiceMoney(invoice.disputed_amount || 0, invoice.currency)}
                  />
                  <Field
                    label="Opened"
                    value={
                      invoice.disputed_at
                        ? new Date(invoice.disputed_at).toLocaleString()
                        : null
                    }
                  />
                </div>
              </div>
            )}

            {/* Manual admin adjustment */}
            {invoice.manual_status_reason && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                <p className="text-[11px] uppercase text-amber-600 font-medium">
                  Manual admin adjustment
                </p>
                <div className="grid gap-2 sm:grid-cols-2 text-sm">
                  <Field label="Reason" value={invoice.manual_status_reason} />
                  <Field
                    label="Applied"
                    value={
                      invoice.manual_status_at
                        ? new Date(invoice.manual_status_at).toLocaleString()
                        : null
                    }
                  />
                  <Field label="Admin user ID" value={invoice.manual_status_by} mono />
                </div>
              </div>
            )}

            <Separator />




            {/* Customer + dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Customer" value={invoice.customer_name} />
              <Field label="Email" value={invoice.customer_email} />
              <Field label="Plan / item" value={invoice.plan || invoice.description} />
              <Field label="Currency" value={(invoice.currency || "usd").toUpperCase()} />
              <Field
                label="Issued at"
                value={new Date(invoice.issued_at).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
              <Field label="User ID" value={invoice.user_id} mono />
            </div>

            <Separator />

            {/* Line items */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Line items
              </p>
              <div className="rounded-lg border border-border/60 divide-y divide-border/60">
                {lines.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="text-sm min-w-0 truncate">{item.description}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      × {item.quantity ?? 1}
                    </span>
                    <span className="text-sm tabular-nums whitespace-nowrap">
                      {formatInvoiceMoney(item.amount ?? 0, invoice.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stripe references */}
            <Separator />
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Payment references
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Stripe invoice", invoice.stripe_invoice_id],
                  ["Charge", invoice.stripe_charge_id],
                  ["Customer", (invoice as { stripe_customer_id?: string }).stripe_customer_id],
                  [
                    "Payment intent",
                    (invoice as { stripe_payment_intent?: string }).stripe_payment_intent,
                  ],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex items-end justify-between gap-2">
                    <Field label={label as string} value={value as string} mono />
                    {value && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => copy(value as string)}
                        aria-label={`Copy ${label}`}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Billing details */}
            {billingEntries.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Billing details
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {billingEntries.map(([k, v]) => (
                      <Field
                        key={k}
                        label={k.replace(/_/g, " ")}
                        value={typeof v === "object" ? JSON.stringify(v) : String(v)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Actions */}
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => downloadInvoicePdf(invoice)}>
                <Download className="h-3.5 w-3.5 mr-1" /> Download PDF
              </Button>
              {invoice.hosted_invoice_url && (
                <Button size="sm" variant="outline" asChild>
                  <a href={invoice.hosted_invoice_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Hosted invoice
                  </a>
                </Button>
              )}
              {invoice.receipt_url && (
                <Button size="sm" variant="outline" asChild>
                  <a href={invoice.receipt_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Stripe receipt
                  </a>
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
