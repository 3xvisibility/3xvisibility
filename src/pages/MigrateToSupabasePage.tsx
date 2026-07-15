import { useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Loader2, Database, ShieldAlert, Play } from "lucide-react";

/**
 * Cloud → own Supabase data-migration wizard.
 *
 * Runs entirely client-side. Service-role keys are kept in memory only
 * (never persisted). Uses each project's REST API to copy rows.
 */

const CLOUD_URL_DEFAULT = "https://qmuxdkxdrxevlnckssuw.supabase.co";

const DEFAULT_TABLES = [
  // parents first — order matters for FK constraints
  "profiles",
  "workspaces",
  "user_roles",
  "workspace_members",
  "workspace_invitations",
  "subscriptions",
  "ai_credits",
  "ai_credits_usage",
  "user_ai_access",
  "websites",
  "shopify_connections",
  "shopify_field_mappings",
  "shopify_sync_events",
  "sitemaps",
  "templates",
  "template_versions",
  "shared_templates",
  "template_ratings",
  "marketplace_templates",
  "elementor_templates",
  "mappings",
  "mapping_profiles",
  "data_sources",
  "campaigns",
  "campaign_csv_files",
  "campaign_logs",
  "generated_pages",
  "generation_jobs",
  "page_versions",
  "page_metrics",
  "page_improvements",
  "page_render_checks",
  "ab_tests",
  "indexing_requests",
  "internal_links",
  "internal_link_settings",
  "locations",
  "pgp_keywords",
  "notifications",
  "affiliate_links",
  "affiliate_clicks",
  "affiliate_referrals",
  "affiliate_payouts",
  "referral_reward_settings",
  "contact_submissions",
  "audit_logs",
  "email_send_log",
  "email_send_state",
  "email_unsubscribe_tokens",
  "suppressed_emails",
  "webhook_endpoints",
  "system_settings",
  "store_generations",
  "template_backfill_runs",
  "template_backfill_items",
  "template_backfill_page_items",
];

type TableStatus = {
  name: string;
  state: "pending" | "reading" | "writing" | "done" | "error" | "skipped";
  read: number;
  written: number;
  error?: string;
};

const BATCH = 500;

export default function MigrateToSupabasePage() {
  const [step, setStep] = useState(1);
  const [sourceUrl, setSourceUrl] = useState(CLOUD_URL_DEFAULT);
  const [sourceKey, setSourceKey] = useState("");
  const [targetUrl, setTargetUrl] = useState(import.meta.env.VITE_SUPABASE_URL || "");
  const [targetKey, setTargetKey] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>(
    () => Object.fromEntries(DEFAULT_TABLES.map((t) => [t, true]))
  );
  const [customTables, setCustomTables] = useState("");
  const [statuses, setStatuses] = useState<TableStatus[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const allTables = () => {
    const custom = customTables.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    return [...DEFAULT_TABLES, ...custom.filter((t) => !DEFAULT_TABLES.includes(t))];
  };

  const toggle = (name: string) =>
    setSelected((p) => ({ ...p, [name]: !p[name] }));

  const setAll = (v: boolean) =>
    setSelected(Object.fromEntries(allTables().map((t) => [t, v])));

  const migrateTable = async (
    source: SupabaseClient,
    target: SupabaseClient,
    name: string,
    onUpdate: (patch: Partial<TableStatus>) => void
  ) => {
    onUpdate({ state: "reading", read: 0, written: 0 });

    let from = 0;
    let total = 0;
    // paginate through source
    while (true) {
      const { data, error } = await source
        .from(name)
        .select("*")
        .range(from, from + BATCH - 1);
      if (error) {
        onUpdate({ state: "error", error: `read: ${error.message}` });
        return;
      }
      if (!data || data.length === 0) break;

      onUpdate({ state: "writing", read: from + data.length });

      const { error: upErr } = await target.from(name).upsert(data, {
        onConflict: "id",
        ignoreDuplicates: false,
      });
      if (upErr) {
        // fallback to insert without upsert if no id column
        const { error: insErr } = await target.from(name).insert(data);
        if (insErr) {
          onUpdate({ state: "error", error: `write: ${upErr.message}` });
          return;
        }
      }
      total += data.length;
      onUpdate({ written: total });
      if (data.length < BATCH) break;
      from += BATCH;
    }
    onUpdate({ state: "done" });
  };

  const runMigration = async () => {
    const chosen = allTables().filter((t) => selected[t]);
    const init: TableStatus[] = chosen.map((n) => ({
      name: n,
      state: "pending",
      read: 0,
      written: 0,
    }));
    setStatuses(init);
    setRunning(true);
    setDone(false);

    const source = createClient(sourceUrl, sourceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const target = createClient(targetUrl, targetKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    for (let i = 0; i < chosen.length; i++) {
      const name = chosen[i];
      await migrateTable(source, target, name, (patch) => {
        setStatuses((prev) =>
          prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s))
        );
      });
    }

    setRunning(false);
    setDone(true);
  };

  const canProceedStep1 = sourceUrl && sourceKey.length > 20;
  const canProceedStep2 = targetUrl && targetKey.length > 20;
  const chosenCount = allTables().filter((t) => selected[t]).length;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Database className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Cloud → Supabase Migration Wizard</h1>
            <p className="text-sm text-muted-foreground">
              Copy data from Lovable Cloud into your own Supabase project.
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 text-xs">
          {[
            { n: 1, label: "Source" },
            { n: 2, label: "Target" },
            { n: 3, label: "Tables" },
            { n: 4, label: "Run" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <Badge variant={step >= s.n ? "default" : "outline"}>
                {s.n}. {s.label}
              </Badge>
              {i < 3 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Service-role keys required</AlertTitle>
          <AlertDescription>
            Reading all rows and inserting rows across RLS requires service-role keys. They stay in memory in this tab only and are never sent anywhere except the two Supabase projects.
          </AlertDescription>
        </Alert>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1 · Source (Lovable Cloud)</CardTitle>
              <CardDescription>Where data is copied from.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Source URL</Label>
                <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
              </div>
              <div>
                <Label>Source service_role key</Label>
                <Input
                  type="password"
                  placeholder="eyJhbGciOi…"
                  value={sourceKey}
                  onChange={(e) => setSourceKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Get it from the Lovable Cloud project's API settings.
                </p>
              </div>
              <div className="flex justify-end">
                <Button disabled={!canProceedStep1} onClick={() => setStep(2)}>
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2 · Target (your Supabase)</CardTitle>
              <CardDescription>Where data will be written.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Target URL</Label>
                <Input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} />
              </div>
              <div>
                <Label>Target service_role key</Label>
                <Input
                  type="password"
                  placeholder="eyJhbGciOi…"
                  value={targetKey}
                  onChange={(e) => setTargetKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your own Supabase project → Settings → API → service_role key.
                </p>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button disabled={!canProceedStep2} onClick={() => setStep(3)}>
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3 · Tables ({chosenCount} selected)</CardTitle>
              <CardDescription>
                Order matches FK dependencies. You can deselect any you don't need or add extras below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setAll(true)}>
                  Select all
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAll(false)}>
                  Clear
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-80 overflow-auto p-2 rounded-md border">
                {allTables().map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={!!selected[t]} onCheckedChange={() => toggle(t)} />
                    <span className="font-mono text-xs">{t}</span>
                  </label>
                ))}
              </div>
              <div>
                <Label>Extra tables (comma or newline separated)</Label>
                <Input
                  value={customTables}
                  onChange={(e) => setCustomTables(e.target.value)}
                  placeholder="my_extra_table, another_table"
                />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button disabled={chosenCount === 0} onClick={() => setStep(4)}>
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 4 · Run migration</CardTitle>
              <CardDescription>
                Rows are read from the source in batches of {BATCH} and upserted (by <code>id</code>) into the target.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={runMigration} disabled={running}>
                  {running ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running…</>
                  ) : (
                    <><Play className="mr-2 h-4 w-4" /> Start migration</>
                  )}
                </Button>
                {!running && (
                  <Button variant="outline" onClick={() => setStep(3)}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> Back
                  </Button>
                )}
              </div>

              {statuses.length > 0 && (
                <div className="space-y-1 max-h-[500px] overflow-auto rounded-md border p-2">
                  {statuses.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center gap-2 text-xs py-1 border-b last:border-0"
                    >
                      <div className="w-4">
                        {s.state === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        {s.state === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                        {(s.state === "reading" || s.state === "writing") && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                      </div>
                      <span className="font-mono flex-1">{s.name}</span>
                      <span className="text-muted-foreground">
                        read {s.read} · wrote {s.written}
                      </span>
                      {s.error && (
                        <span className="text-destructive max-w-[240px] truncate" title={s.error}>
                          {s.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {done && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <AlertTitle>Migration complete</AlertTitle>
                  <AlertDescription>
                    {statuses.filter((s) => s.state === "done").length} tables migrated,{" "}
                    {statuses.filter((s) => s.state === "error").length} failed. Review any errors above and re-run for those tables.
                  </AlertDescription>
                </Alert>
              )}

              {running && (
                <Progress
                  value={
                    (statuses.filter((s) => s.state === "done" || s.state === "error").length /
                      Math.max(statuses.length, 1)) *
                    100
                  }
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
