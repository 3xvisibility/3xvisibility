import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatInvoiceMoney, type InvoiceRecord } from "@/lib/invoice-pdf";

type ManualStatus = "refunded" | "partially_refunded" | "voided";

interface Props {
  invoice: InvoiceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

/**
 * Manual override for cases where Stripe webhooks are delayed or never
 * arrive. Requires an explicit reason plus a second confirmation step.
 */
export function ManualInvoiceStatusDialog({ invoice, open, onOpenChange, onUpdated }: Props) {
  const [status, setStatus] = useState<ManualStatus>("refunded");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus("refunded");
      setAmount("");
      setReason("");
      setNotify(true);
    }
  }, [open, invoice?.id]);

  if (!invoice) return null;

  const currency = invoice.currency || "usd";
  const total = invoice.amount_total ?? 0;
  const partialCents = Math.round((Number(amount) || 0) * 100);

  const reasonValid = reason.trim().length >= 3;
  const amountValid =
    status !== "partially_refunded" || (partialCents > 0 && partialCents <= total);
  const canSubmit = reasonValid && amountValid && !busy;

  const submit = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-invoice-status", {
        body: {
          invoiceId: invoice.id,
          status,
          reason: reason.trim(),
          amountRefunded: status === "partially_refunded" ? partialCents : undefined,
          notify,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success(
        `${invoice.invoice_number} marked as ${status.replace("_", " ")}${
          notify ? " — customer notified" : ""
        }`,
      );
      setConfirmOpen(false);
      onOpenChange(false);
      onUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the invoice");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manually adjust invoice</DialogTitle>
            <DialogDescription>
              Use this when a Stripe refund or chargeback event is delayed or missing. This only
              changes the invoice record here — it does not move money in Stripe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <div className="font-mono text-xs">{invoice.invoice_number}</div>
              <div className="text-muted-foreground text-xs mt-1">
                {invoice.customer_email || "no email"} ·{" "}
                {formatInvoiceMoney(total, currency)} · currently{" "}
                <span className="font-medium">{invoice.status.replace("_", " ")}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>New status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ManualStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refunded">Refunded (full)</SelectItem>
                  <SelectItem value="partially_refunded">Partially refunded</SelectItem>
                  <SelectItem value="voided">Voided</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {status === "partially_refunded" && (
              <div className="space-y-2">
                <Label htmlFor="manual-amount">
                  Refunded amount ({currency.toUpperCase()})
                </Label>
                <Input
                  id="manual-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={(total / 100).toFixed(2)}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {!amountValid && (
                  <p className="text-xs text-destructive">
                    Enter an amount between 0.01 and {formatInvoiceMoney(total, currency)}.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="manual-reason">Reason (required)</Label>
              <Textarea
                id="manual-reason"
                rows={3}
                maxLength={500}
                placeholder="e.g. Refund processed in Stripe on Jul 24, webhook never arrived"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Stored on the invoice with your admin account and a timestamp.
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={notify} onCheckedChange={(v) => setNotify(!!v)} />
              <span>
                Notify the customer by email and in-app notification
                {invoice.customer_email ? ` (${invoice.customer_email})` : ""}
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button disabled={!canSubmit} onClick={() => setConfirmOpen(true)}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !busy && setConfirmOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Confirm manual change
            </AlertDialogTitle>
            <AlertDialogDescription>
              {invoice.invoice_number} will be marked as{" "}
              <strong>{status.replace("_", " ")}</strong>
              {status === "partially_refunded"
                ? ` with ${formatInvoiceMoney(partialCents, currency)} refunded`
                : ""}
              . {notify ? "The customer will be notified." : "The customer will not be notified."}{" "}
              This does not create a refund in Stripe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                submit();
              }}
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
