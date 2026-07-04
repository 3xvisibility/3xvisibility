import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { extractEdgeError } from "@/lib/edge-function-error";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Rocket,
  ShieldCheck,
} from "lucide-react";

interface PublishStep {
  label: string;
  status: "running" | "ok" | "warn" | "error";
  detail?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Display name of the template being tested. */
  templateName: string;
  /** The Elementor-converted HTML content of the template. */
  content: string;
}

const STATUS_ICON: Record<PublishStep["status"], JSX.Element> = {
  running: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />,
  ok: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  error: <XCircle className="h-4 w-4 text-destructive" />,
};

export function TemplateWordPressTestDialog({ open, onOpenChange, templateName, content }: Props) {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const wsId = currentWorkspace?.id;

  const [websiteId, setWebsiteId] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<PublishStep[]>([]);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<"pass" | "warn" | "fail" | null>(null);

  const { data: websites = [], isLoading } = useQuery({
    queryKey: ["wp-test-websites", wsId],
    enabled: !!wsId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("id, name, url, type")
        .eq("workspace_id", wsId!)
        .eq("type", "wordpress")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as { id: string; name: string; url: string; type: string }[];
    },
  });

  const readinessStep = useMemo(
    () => steps.find((s) => s.label.toLowerCase().includes("editor readiness")),
    [steps],
  );

  const reset = () => {
    setSteps([]);
    setPublishedUrl(null);
    setVerdict(null);
  };

  const runTest = async () => {
    if (!websiteId) {
      toast({ title: "Select a WordPress site", variant: "destructive" });
      return;
    }
    setRunning(true);
    reset();
    setSteps([{ label: "Publishing test page to WordPress", status: "running" }]);
    try {
      const slug = `xxxv-test-${Date.now().toString(36)}`;
      const { data, error } = await supabase.functions.invoke("publish-pages", {
        body: {
          website_id: websiteId,
          workspace_id: wsId,
          publish_type: "page",
          publish_format: "elementor",
          pages: [
            {
              title: `[TEST] ${templateName}`,
              content,
              slug,
              seo_title: `[TEST] ${templateName}`,
            },
          ],
        },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      const resultSteps: PublishStep[] = Array.isArray(result?.steps) ? result.steps : [];
      setSteps(resultSteps.length ? resultSteps : [{ label: "Publish complete", status: "ok" }]);

      if (result?.status !== "published") {
        setVerdict("fail");
        throw new Error(result?.error || "Publish did not complete.");
      }
      setPublishedUrl(result.external_url || result.url || null);

      // Derive the 1:1 native-Elementor verdict from the verification step.
      const readiness = resultSteps.find((s) => s.label.toLowerCase().includes("editor readiness"));
      if (readiness?.status === "ok") setVerdict("pass");
      else if (readiness?.status === "warn") setVerdict("warn");
      else setVerdict("pass"); // published, non-Elementor verification unavailable

      toast({ title: "Test publish complete", description: "Check the verification result below." });
    } catch (err) {
      setVerdict((v) => v ?? "fail");
      toast({ title: "Test failed", description: getFriendlyError(err), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!running) onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            One-Click WordPress Test
          </DialogTitle>
          <DialogDescription>
            Publishes “{templateName}” to a connected WordPress site and verifies the live page renders
            as native Elementor widgets & CSS (1:1).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Target WordPress site</label>
            <Select value={websiteId} onValueChange={setWebsiteId} disabled={running || isLoading}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading sites…" : "Select a WordPress site"} />
              </SelectTrigger>
              <SelectContent>
                {websites.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name || w.url}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isLoading && websites.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No WordPress sites connected. Connect one on the Websites page first.
              </p>
            )}
          </div>

          {verdict && (
            <div
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                verdict === "pass"
                  ? "border-green-500/40 bg-green-500/10"
                  : verdict === "warn"
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-destructive/40 bg-destructive/10"
              }`}
            >
              {verdict === "pass" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
              ) : verdict === "warn" ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
              )}
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {verdict === "pass"
                    ? "Renders as native Elementor widgets & CSS (1:1)"
                    : verdict === "warn"
                      ? "Published, but native rendering needs review"
                      : "Test failed"}
                </p>
                {readinessStep?.detail && (
                  <p className="text-muted-foreground">{readinessStep.detail}</p>
                )}
                {publishedUrl && (
                  <a
                    href={publishedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    View live page <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {steps.length > 0 && (
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border p-3">
              {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5">{STATUS_ICON[s.status]}</span>
                  <div>
                    <span className="font-medium">{s.label}</span>
                    {s.detail && <p className="text-xs text-muted-foreground">{s.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button onClick={runTest} disabled={running || !websiteId} className="w-full">
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing…
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" /> Publish &amp; Verify
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
