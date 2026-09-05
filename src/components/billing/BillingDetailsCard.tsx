import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";

interface BillingDetails {
  billing_name: string;
  billing_email: string;
  billing_address: string;
  billing_postal_code: string;
  billing_city: string;
  billing_country: string;
  billing_vat_number: string;
  billing_language: string;
}

const EMPTY: BillingDetails = {
  billing_name: "",
  billing_email: "",
  billing_address: "",
  billing_postal_code: "",
  billing_city: "",
  billing_country: "",
  billing_vat_number: "",
  billing_language: "auto",
};

/** Lets the signed-in customer maintain the details printed on their invoices. */
export function BillingDetailsCard() {
  const { t } = useLanguage();
  const [form, setForm] = useState<BillingDetails>(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-billing-details"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return { profile: profile as Record<string, unknown> | null, email: auth.user?.email ?? "" };
    },
  });

  useEffect(() => {
    if (!data) return;
    const p = (data.profile ?? {}) as Record<string, string | null>;
    setForm({
      billing_name: p.billing_name || (p.company as string) || (p.full_name as string) || "",
      billing_email: p.billing_email || data.email || "",
      billing_address: p.billing_address || "",
      billing_postal_code: p.billing_postal_code || "",
      billing_city: p.billing_city || "",
      billing_country: p.billing_country || "",
      billing_vat_number: p.billing_vat_number || "",
      billing_language: p.billing_language || "auto",
    });
  }, [data]);

  const set = (key: keyof BillingDetails) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error(t("billing.detailsSignInRequired"));
      const payload = {
        ...form,
        billing_language: form.billing_language === "auto" ? null : form.billing_language,
      };
      const { error } = await supabase
        .from("profiles")
        .update(payload as never)
        .eq("user_id", uid);
      if (error) throw error;
      toast.success(t("billing.detailsSaved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("billing.detailsSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="shadow-surface border-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-4 w-4 text-primary" /> {t("billing.detailsTitle")}
        </CardTitle>
        <CardDescription>
          {t("billing.detailsDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="billing_name">{t("billing.detailsName")}</Label>
                <Input
                  id="billing_name"
                  value={form.billing_name}
                  onChange={(e) => set("billing_name")(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billing_email">{t("billing.detailsEmail")}</Label>
                <Input
                  id="billing_email"
                  type="email"
                  value={form.billing_email}
                  onChange={(e) => set("billing_email")(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="billing_address">{t("billing.detailsAddress")}</Label>
                <Input
                  id="billing_address"
                  value={form.billing_address}
                  onChange={(e) => set("billing_address")(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billing_postal_code">{t("billing.detailsPostalCode")}</Label>
                <Input
                  id="billing_postal_code"
                  value={form.billing_postal_code}
                  onChange={(e) => set("billing_postal_code")(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billing_city">{t("billing.detailsCity")}</Label>
                <Input
                  id="billing_city"
                  value={form.billing_city}
                  onChange={(e) => set("billing_city")(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billing_country">{t("billing.detailsCountry")}</Label>
                <Input
                  id="billing_country"
                  value={form.billing_country}
                  onChange={(e) => set("billing_country")(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billing_vat_number">{t("billing.detailsVat")}</Label>
                <Input
                  id="billing_vat_number"
                  value={form.billing_vat_number}
                  onChange={(e) => set("billing_vat_number")(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billing_language">{t("billing.detailsLanguage")}</Label>
                <Select
                  value={form.billing_language}
                  onValueChange={set("billing_language")}
                >
                  <SelectTrigger id="billing_language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t("billing.detailsLanguageAuto")}</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {t("billing.detailsSave")}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
