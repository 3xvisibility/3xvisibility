import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, Plus, Loader2, Trash2, Star, Wallet, Landmark, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

interface PaymentMethod {
  id: string;
  type: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  email: string | null;
}

const brandLabel = (brand: string | null) => {
  if (!brand) return "Card";
  const map: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
  };
  return map[brand] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
};

export function PaymentMethods() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<PaymentMethod | null>(null);
  const [methodDialog, setMethodDialog] = useState(false);

  const METHOD_OPTIONS = [
    { id: "card", label: "Credit / Debit Card", desc: "Visa, Mastercard, Amex, etc.", icon: CreditCard },
    { id: "paypal", label: "PayPal", desc: "Link your PayPal account", icon: Wallet },
    { id: "stripe", label: "Stripe Secure Checkout", desc: "Saved securely by Stripe", icon: Landmark },
  ];

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("payment-methods", {
        body: { action: "list" },
      });
      if (error) throw error;
      setMethods(data?.paymentMethods ?? []);
      setDefaultId(data?.defaultPaymentMethodId ?? null);
    } catch (err: any) {
      console.error("Failed to load payment methods:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Coming back from Stripe after saving a card: confirm and refresh the list.
    const params = new URLSearchParams(window.location.search);
    if (params.get("card_added") === "true") {
      toast({ title: t("billing.paymentMethodAdded") });
      params.delete("card_added");
      const rest = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleAdd = async (method?: string) => {
    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke("payment-methods", {
        body: { action: "add", method },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("billing.cardFormOpenFailed"), description: message, variant: "destructive" });
      setAdding(false);
    }
  };

  const handleDelete = async (pm: PaymentMethod) => {
    setBusyId(pm.id);
    try {
      const { error } = await supabase.functions.invoke("payment-methods", {
        body: { action: "delete", paymentMethodId: pm.id },
      });
      if (error) throw error;
      toast({ title: t("billing.paymentMethodRemoved") });
      await load();
    } catch (err: any) {
      toast({ title: t("billing.paymentMethodRemoveFailed"), description: err.message, variant: "destructive" });
    } finally {
      setBusyId(null);
      setToDelete(null);
    }
  };

  const handleSetDefault = async (pm: PaymentMethod) => {
    setBusyId(pm.id);
    try {
      const { error } = await supabase.functions.invoke("payment-methods", {
        body: { action: "set_default", paymentMethodId: pm.id },
      });
      if (error) throw error;
      setDefaultId(pm.id);
      toast({ title: t("billing.defaultPaymentUpdated") });
    } catch (err: any) {
      toast({ title: t("billing.defaultPaymentUpdateFailed"), description: err.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="shadow-surface border-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">{t("billing.paymentMethods")}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("billing.paymentMethodsDesc")}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setMethodDialog(true)} disabled={adding}>
          {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {t("common.add")}
        </Button>
      </CardHeader>

      {/* Method chooser dialog — user picks one, stays on billing (no signout) */}
      <Dialog open={methodDialog} onOpenChange={(open) => !adding && setMethodDialog(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> {t("billing.addCardPaypal")}
            </DialogTitle>
            <DialogDescription>
              Choose a payment method to add. You will complete the details on a secure Stripe page and return here automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {METHOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={adding}
                onClick={() => handleAdd(opt.id === "stripe" ? "card" : opt.id)}
                className="w-full flex items-center gap-3 rounded-xl border border-border/60 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <opt.icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                {adding ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : methods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <Wallet className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("billing.noPaymentMethods")}</p>
            <Button variant="outline" size="sm" onClick={() => setMethodDialog(true)} disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {t("billing.addCardPaypal")}
            </Button>
          </div>
        ) : (
          methods.map((pm) => (
            <div
              key={pm.id}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-card/50 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-14 rounded-lg bg-muted flex items-center justify-center">
                  {pm.type === "paypal" ? (
                    <Wallet className="h-5 w-5 text-primary" />
                  ) : (
                    <CreditCard className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {pm.type === "paypal" ? "PayPal" : brandLabel(pm.brand)}
                    </span>
                    {pm.type !== "paypal" && pm.last4 && (
                      <span className="text-sm text-muted-foreground">•••• {pm.last4}</span>
                    )}
                    {defaultId === pm.id && (
                      <Badge variant="outline" className="text-[10px] text-success border-success/30 bg-success/5">
                        {t("billing.default")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pm.type === "paypal"
                      ? pm.email ?? "PayPal account"
                      : pm.expMonth
                        ? t("billing.expires", { date: `${String(pm.expMonth).padStart(2, "0")}/${pm.expYear}` })
                        : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {defaultId !== pm.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(pm)}
                    disabled={busyId === pm.id}
                    title={t("billing.setAsDefault")}
                  >
                    {busyId === pm.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setToDelete(pm)}
                  disabled={busyId === pm.id}
                  title={t("common.remove")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("billing.removePaymentMethodTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.type === "paypal"
                ? t("billing.removePaypalDesc")
                : t("billing.removeCardDesc", { brand: brandLabel(toDelete?.brand ?? null), last4: toDelete?.last4 ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && handleDelete(toDelete)}
            >
              {t("common.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
