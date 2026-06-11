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
import { CreditCard, Plus, Loader2, Trash2, Star, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<PaymentMethod | null>(null);

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
  }, []);

  const handleAdd = async () => {
    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke("payment-methods", {
        body: { action: "add" },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Couldn't open card form", description: err.message, variant: "destructive" });
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
      toast({ title: "Payment method removed" });
      await load();
    } catch (err: any) {
      toast({ title: "Couldn't remove", description: err.message, variant: "destructive" });
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
      toast({ title: "Default payment method updated" });
    } catch (err: any) {
      toast({ title: "Couldn't update", description: err.message, variant: "destructive" });
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
            <CardTitle className="text-base font-bold">Payment Methods</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage your saved cards and PayPal. Add, set default or remove anytime.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={handleAdd} disabled={adding}>
          {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : methods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <Wallet className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No payment methods saved yet.</p>
            <Button variant="outline" size="sm" onClick={handleAdd} disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add a card or PayPal
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
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pm.type === "paypal"
                      ? pm.email ?? "PayPal account"
                      : pm.expMonth
                        ? `Expires ${String(pm.expMonth).padStart(2, "0")}/${pm.expYear}`
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
                    title="Set as default"
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
                  title="Remove"
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
            <AlertDialogTitle>Remove payment method?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              {toDelete?.type === "paypal" ? "your PayPal account" : `${brandLabel(toDelete?.brand ?? null)} ending in ${toDelete?.last4}`}{" "}
              from your account. You can add it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && handleDelete(toDelete)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
