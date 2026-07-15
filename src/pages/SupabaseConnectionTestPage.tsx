import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Database } from "lucide-react";

type CheckStatus = "idle" | "running" | "ok" | "fail";

interface Check {
  name: string;
  status: CheckStatus;
  detail?: string;
  ms?: number;
}

const INITIAL: Check[] = [
  { name: "Environment variables", status: "idle" },
  { name: "Auth reachability (getSession)", status: "idle" },
  { name: "Database reachability (REST)", status: "idle" },
  { name: "Storage reachability (list buckets)", status: "idle" },
];

export default function SupabaseConnectionTestPage() {
  const [checks, setChecks] = useState<Check[]>(INITIAL);
  const [running, setRunning] = useState(false);

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;

  const update = (i: number, patch: Partial<Check>) =>
    setChecks((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const run = async () => {
    setChecks(INITIAL.map((c) => ({ ...c, status: "running" as const })));
    setRunning(true);

    // 1) env
    const t0 = performance.now();
    if (url && anon) {
      update(0, { status: "ok", detail: `${url}`, ms: Math.round(performance.now() - t0) });
    } else {
      update(0, {
        status: "fail",
        detail: `Missing ${!url ? "VITE_SUPABASE_URL " : ""}${!anon ? "VITE_SUPABASE_PUBLISHABLE_KEY" : ""}`.trim(),
      });
      setRunning(false);
      return;
    }

    // 2) auth
    const t1 = performance.now();
    try {
      const { error } = await supabase.auth.getSession();
      if (error) throw error;
      update(1, { status: "ok", detail: "Auth endpoint reachable", ms: Math.round(performance.now() - t1) });
    } catch (e: any) {
      update(1, { status: "fail", detail: e?.message ?? String(e) });
    }

    // 3) db via REST root (works without any table knowledge)
    const t2 = performance.now();
    try {
      const res = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: anon!, Authorization: `Bearer ${anon}` },
      });
      if (!res.ok && res.status !== 200 && res.status !== 404) {
        throw new Error(`HTTP ${res.status}`);
      }
      update(2, {
        status: "ok",
        detail: `PostgREST responded (${res.status})`,
        ms: Math.round(performance.now() - t2),
      });
    } catch (e: any) {
      update(2, { status: "fail", detail: e?.message ?? String(e) });
    }

    // 4) storage
    const t3 = performance.now();
    try {
      const { error } = await supabase.storage.listBuckets();
      if (error) throw error;
      update(3, { status: "ok", detail: "Storage reachable", ms: Math.round(performance.now() - t3) });
    } catch (e: any) {
      update(3, { status: "fail", detail: e?.message ?? String(e) });
    }

    setRunning(false);
  };

  const allOk = checks.every((c) => c.status === "ok");
  const anyFail = checks.some((c) => c.status === "fail");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl shadow-surface">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>Supabase Connection Test</CardTitle>
          </div>
          <CardDescription>
            Verify the frontend can reach your Supabase project using the current
            <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">.env</code>
            values.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border p-3 text-xs space-y-1 font-mono">
            <div>URL: <span className="text-muted-foreground">{url || "—"}</span></div>
            <div>Project ID: <span className="text-muted-foreground">{projectId || "—"}</span></div>
            <div>
              Anon key:{" "}
              <span className="text-muted-foreground">
                {anon ? `${anon.slice(0, 8)}…${anon.slice(-4)}` : "—"}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {checks.map((c) => (
              <div
                key={c.name}
                className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {c.status === "ok" && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
                  {c.status === "fail" && <XCircle className="h-5 w-5 text-destructive shrink-0" />}
                  {c.status === "running" && <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />}
                  {c.status === "idle" && <div className="h-5 w-5 rounded-full border border-border shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{c.name}</div>
                    {c.detail && (
                      <div className="text-xs text-muted-foreground break-all">{c.detail}</div>
                    )}
                  </div>
                </div>
                {typeof c.ms === "number" && (
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {c.ms} ms
                  </Badge>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {allOk && !running && (
                <Badge className="bg-green-500/15 text-green-600 border-green-500/30">
                  All checks passed
                </Badge>
              )}
              {anyFail && !running && (
                <Badge variant="destructive">Some checks failed</Badge>
              )}
            </div>
            <Button onClick={run} disabled={running}>
              {running ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Testing…</>
              ) : (
                "Run connection test"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
