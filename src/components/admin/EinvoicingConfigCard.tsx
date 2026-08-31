import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  ExternalLink,
  Save,
  Loader2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";

interface EinvoicingConfig {
  provider: "none" | "pennylane" | "billit" | "custom";
  enabled: boolean;
  pa_name: string | null;
  webhook_url: string | null;
  webhook_secret_configured: boolean;
}

const PROVIDERS = [
  { value: "none", label: "None (disabled)" },
  { value: "pennylane", label: "Pennylane" },
  { value: "billit", label: "Billit" },
  { value: "custom", label: "Custom PA" },
];

const MARKETPLACE_URLS: Record<string, string> = {
  pennylane: "https://marketplace.stripe.com/apps/pennylane",
  billit: "https://marketplace.stripe.com/apps/billit",
};

export function EinvoicingConfigCard() {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-einvoicing-config"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-panel", {
        body: { action: "get-einvoicing-config" },
      });
      if (error) throw error;
      return data.config as EinvoicingConfig;
    },
  });

  const [draft, setDraft] = useState<EinvoicingConfig | null>(null);
  if (data && !draft) setDraft({ ...data });
  const isDirty = !!draft && JSON.stringify(draft) !== JSON.stringify(data);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      const { data, error } = await supabase.functions.invoke("admin-panel", {
        body: {
          action: "update-einvoicing-config",
          provider: draft.provider,
          enabled: draft.enabled,
          pa_name: draft.pa_name,
        },
      });
      if (error) throw error;
      return data.config as EinvoicingConfig;
    },
    onSuccess: (cfg) => {
      toast.success("E-invoicing settings saved");
      qc.setQueryData(["admin-einvoicing-config"], cfg);
      setDraft({ ...cfg });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  if (isLoading || !draft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> E-Invoicing (Factur-X)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const copyWebhook = async () => {
    if (!draft.webhook_url) return;
    try {
      await navigator.clipboard.writeText(draft.webhook_url);
      setCopied(true);
      toast.success("Webhook URL copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 text-primary" /> E-Invoicing (Factur-X)
          {draft.enabled && draft.provider !== "none" ? (
            <Badge variant="outline" className="bg-green-500/15 text-green-500 border-green-500/30">
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
              Disabled
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          French e-invoicing reform (Factur-X) compliance. Connect a certified
          platform (PA) to convert Stripe invoices into structured e-invoices.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Compliance context */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong className="text-foreground">Regulation:</strong> France's B2B
                e-invoicing reform (Decree 2026-677) requires structured Factur-X
                invoices transmitted through an approved platform (PA) connected to
                the PPF.
              </p>
              <p>
                <strong className="text-foreground">Your deadline:</strong> As a
                small/medium business, your obligation to{" "}
                <em>issue</em> compliant e-invoices is{" "}
                <strong className="text-foreground">1 September 2027</strong>. The
                1 September 2026 date applies to receiving supplier invoices.
                Stripe alone does not generate Factur-X — a PA connector is required.
              </p>
            </div>
          </div>
        </div>

        {/* Provider selection */}
        <div className="space-y-2">
          <Label>Approved platform (PA)</Label>
          <Select
            value={draft.provider}
            onValueChange={(v) =>
              setDraft({
                ...draft,
                provider: v as EinvoicingConfig["provider"],
                pa_name: v === "custom" ? draft.pa_name : v,
              })
            }
          >
            <SelectTrigger className="max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Install the PA from the{" "}
            <a
              href={MARKETPLACE_URLS[draft.provider] || "https://marketplace.stripe.com"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              Stripe App Marketplace <ExternalLink className="h-3 w-3" />
            </a>
            . The app auto-converts each Stripe invoice to Factur-X and transmits it
            through its access point.
          </p>
        </div>

        {draft.provider === "custom" && (
          <div className="space-y-2">
            <Label htmlFor="pa-name">PA name</Label>
            <Input
              id="pa-name"
              placeholder="e.g. My Certified PA"
              value={draft.pa_name ?? ""}
              onChange={(e) => setDraft({ ...draft, pa_name: e.target.value })}
              className="max-w-md"
            />
          </div>
        )}

        {/* Enable toggle */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <Label className="font-medium">Enable e-invoicing tracking</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              New invoices start as "pending" and update as the PA transmits them.
            </p>
          </div>
          <Switch
            checked={draft.enabled}
            onCheckedChange={(v) => setDraft({ ...draft, enabled: v })}
            disabled={draft.provider === "none"}
          />
        </div>

        {/* Webhook URL */}
        {draft.webhook_url && (
          <div className="space-y-2">
            <Label>PA callback webhook URL</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] bg-muted px-3 py-2 rounded-md break-all">
                {draft.webhook_url}
              </code>
              <Button size="sm" variant="outline" onClick={copyWebhook}>
                {copied ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Register this URL in your PA dashboard so it posts transmission status
              (pending → transmitted → delivered) back here.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="outline"
                className={
                  draft.webhook_secret_configured
                    ? "bg-green-500/15 text-green-500 border-green-500/30"
                    : "bg-amber-500/15 text-amber-500 border-amber-500/30"
                }
              >
                {draft.webhook_secret_configured
                  ? "Signature verification on"
                  : "Verification secret not set"}
              </Badge>
              {!draft.webhook_secret_configured && (
                <span className="text-xs text-muted-foreground">
                  Add the{" "}
                  <code className="text-[11px]">EINVOICING_PA_WEBHOOK_SECRET</code>{" "}
                  secret in Supabase to verify PA callbacks.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end">
          <Button
            disabled={!isDirty || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
