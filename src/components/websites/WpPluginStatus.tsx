import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type StatusCode = "installed" | "missing" | "unauthorized" | "unreachable" | "unknown";

interface PluginStatus {
  installed: boolean;
  status: StatusCode;
  version?: string | null;
  message?: string;
}

/**
 * Automatically verifies that the "3xVisibility HTML Assets" companion plugin
 * is installed & active on a connected WordPress site. Without it WordPress
 * strips <style>/<link>/<script> from page content and published pages lose
 * their design, so we prompt the user to install it when the check fails.
 */
export function WpPluginStatus({ websiteId }: { websiteId: string }) {
  const { data, isFetching, refetch, error } = useQuery<PluginStatus>({
    queryKey: ["wp-html-assets-status", websiteId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("wp-site-actions", {
        body: { website_id: websiteId, action: "assets_status" },
      });
      if (error) throw error;
      return data as PluginStatus;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const status: StatusCode = error ? "unknown" : (data?.status ?? "unknown");
  const installed = !error && data?.installed === true;

  const tone = installed
    ? "border-emerald-500/30 bg-emerald-500/5"
    : "border-amber-500/30 bg-amber-500/5";

  return (
    <div className={`mt-3 rounded-lg border p-3 ${tone}`}>
      <div className="flex items-start gap-2">
        {isFetching ? (
          <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : installed ? (
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
        ) : (
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        )}

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold">HTML Assets plugin</p>
            {isFetching ? (
              <Badge variant="outline" className="h-5 text-[10px]">Checking…</Badge>
            ) : installed ? (
              <Badge className="h-5 bg-emerald-500/15 text-[10px] text-emerald-600 hover:bg-emerald-500/15">
                Installed{data?.version ? ` · v${data.version}` : ""}
              </Badge>
            ) : (
              <Badge variant="outline" className="h-5 border-amber-500/40 text-[10px] text-amber-600">
                {status === "missing"
                  ? "Not installed"
                  : status === "unauthorized"
                    ? "Credentials rejected"
                    : status === "unreachable"
                      ? "Site unreachable"
                      : "Unknown"}
              </Badge>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {installed
              ? "CSS, JS and design tags are delivered exactly like the preview on this site."
              : (data?.message ||
                (error as Error | null)?.message ||
                "Could not verify the plugin.") +
                " WordPress removes <style>, <link> and <script> tags from page content, so install this free 1-file plugin once (Plugins → Add New → Upload Plugin), activate it, then re-publish."}
          </p>

          <div className="flex flex-wrap gap-2">
            {!installed && (
              <Button asChild size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
                <a href="/wp-plugin/3xvisibility-html-assets.zip" download>
                  <Download className="h-3 w-3" /> Download plugin
                </a>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs"
              disabled={isFetching}
              onClick={() => refetch()}
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} /> Re-check
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
