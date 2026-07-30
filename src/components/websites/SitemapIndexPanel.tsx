import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Map, RefreshCw, Download, Loader2, Zap, ShieldCheck, AlertTriangle, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { extractEdgeError } from "@/lib/edge-function-error";

const ALL_CAMPAIGNS = "__site__";

interface Props {
  websiteId: string;
  websiteName: string;
}

type SitemapRow = {
  id: string;
  content: string;
  page_count: number;
  last_generated_at: string;
  campaign_id: string | null;
  sitemap_url: string | null;
  indexnow_key: string | null;
  last_ping_at: string | null;
  last_ping_result: any;
  robots_checked_at: string | null;
  robots_result: any;
};

type EventRow = {
  id: string;
  kind: string;
  status: string;
  url_count: number;
  message: string | null;
  created_at: string;
};

export function SitemapIndexPanel({ websiteId, websiteName }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<string>(ALL_CAMPAIGNS);
  const campaignId = scope === ALL_CAMPAIGNS ? null : scope;

  const { data: campaigns = [] } = useQuery({
    queryKey: ["site-campaigns", websiteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("website_id", websiteId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: sitemaps = [] } = useQuery({
    queryKey: ["sitemaps", websiteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sitemaps")
        .select("*")
        .eq("website_id", websiteId);
      if (error) throw error;
      return (data || []) as unknown as SitemapRow[];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["site-index-events", websiteId, campaignId],
    queryFn: async () => {
      let q = supabase
        .from("site_index_events")
        .select("id, kind, status, url_count, message, created_at")
        .eq("website_id", websiteId)
        .order("created_at", { ascending: false })
        .limit(5);
      q = campaignId ? q.eq("campaign_id", campaignId) : q.is("campaign_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as EventRow[];
    },
  });

  const sitemap = useMemo(
    () => sitemaps.find((s) => (s.campaign_id ?? null) === campaignId) || null,
    [sitemaps, campaignId],
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["sitemaps"] });
    queryClient.invalidateQueries({ queryKey: ["site-index-events", websiteId] });
  };

  const invoke = async (fn: string) => {
    const { data, error } = await supabase.functions.invoke(fn, {
      body: { website_id: websiteId, campaign_id: campaignId },
    });
    if (error) throw new Error(await extractEdgeError(error));
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const generateMutation = useMutation({
    mutationFn: () => invoke("generate-sitemap"),
    onSuccess: (data: any) => {
      refresh();
      toast({ title: "Sitemap generated", description: `${data.page_count} URL(s) included.` });
    },
    onError: (e: Error) =>
      toast({ title: "Sitemap generation failed", description: e.message, variant: "destructive" }),
  });

  const pingMutation = useMutation({
    mutationFn: () => invoke("indexnow-ping"),
    onSuccess: (data: any) => {
      refresh();
      toast({
        title: data.status === "success" ? "IndexNow ping sent" : "IndexNow partially sent",
        description: `${data.url_count} URL(s) submitted. Host the key file at ${data.key_location}`,
        variant: data.status === "failed" ? "destructive" : "default",
      });
    },
    onError: (e: Error) =>
      toast({ title: "IndexNow ping failed", description: e.message, variant: "destructive" }),
  });

  const robotsMutation = useMutation({
    mutationFn: () => invoke("robots-validate"),
    onSuccess: (data: any) => {
      refresh();
      toast({
        title: `robots.txt score ${data.score}/100`,
        description: data.issues?.length
          ? data.issues[0].message
          : "No issues detected.",
        variant: data.status === "failed" ? "destructive" : "default",
      });
    },
    onError: (e: Error) =>
      toast({ title: "robots.txt check failed", description: e.message, variant: "destructive" }),
  });

  const busy = generateMutation.isPending || pingMutation.isPending || robotsMutation.isPending;

  const handleDownload = () => {
    if (!sitemap) return;
    const blob = new Blob([sitemap.content], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sitemap-${(websiteName || "site").toLowerCase().replace(/\s+/g, "-")}${campaignId ? `-${campaignId.slice(0, 8)}` : ""}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const robots = sitemap?.robots_result;
  const ping = sitemap?.last_ping_result;

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Map className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">Sitemap &amp; Indexing</span>
        </div>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger className="h-7 w-[170px] text-xs">
            <SelectValue placeholder="Whole website" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CAMPAIGNS}>Whole website</SelectItem>
            {campaigns.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sitemap ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span className="tabular-nums">{sitemap.page_count} pages</span>
          <span>•</span>
          <span className="tabular-nums">{new Date(sitemap.last_generated_at).toLocaleDateString()}</span>
          {sitemap.last_ping_at && (
            <>
              <span>•</span>
              <span>IndexNow {new Date(sitemap.last_ping_at).toLocaleDateString()}</span>
            </>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mb-2">
          No sitemap yet for this scope.
        </p>
      )}

      <div className="flex items-center gap-1 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={busy}
          onClick={() => generateMutation.mutate()}
        >
          {generateMutation.isPending ? (
            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating</>
          ) : sitemap ? (
            <><RefreshCw className="h-3 w-3 mr-1" /> Regenerate</>
          ) : (
            <><Map className="h-3 w-3 mr-1" /> Generate sitemap</>
          )}
        </Button>

        {sitemap && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleDownload}>
            <Download className="h-3 w-3 mr-1" /> XML
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={busy || !sitemap}
          onClick={() => pingMutation.mutate()}
        >
          {pingMutation.isPending ? (
            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Pinging</>
          ) : (
            <><Zap className="h-3 w-3 mr-1" /> IndexNow ping</>
          )}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={busy}
          onClick={() => robotsMutation.mutate()}
        >
          {robotsMutation.isPending ? (
            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Checking</>
          ) : (
            <><ShieldCheck className="h-3 w-3 mr-1" /> Check robots.txt</>
          )}
        </Button>
      </div>

      {(robots || ping) && (
        <div className="mt-2 space-y-1">
          {robots && (
            <div className="flex items-start gap-2 text-xs">
              <Badge variant={robots.score >= 80 ? "default" : "destructive"} className="h-5 text-[10px]">
                robots {robots.score}/100
              </Badge>
              <span className="text-muted-foreground line-clamp-2">
                {robots.issues?.length ? robots.issues[0].message : "No issues detected."}
              </span>
            </div>
          )}
          {ping?.key_location && (
            <p className="text-[11px] text-muted-foreground break-all">
              IndexNow key file required at <span className="font-mono">{ping.key_location}</span>{" "}
              (content: <span className="font-mono">{sitemap?.indexnow_key}</span>)
            </p>
          )}
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-3 space-y-1">
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              {e.status === "success" ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
              ) : e.status === "partial" ? (
                <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
              ) : (
                <XCircle className="h-3 w-3 text-destructive shrink-0" />
              )}
              <span className="uppercase font-medium">{e.kind}</span>
              <span className="truncate">{e.message}</span>
              <span className="ml-auto shrink-0 tabular-nums">
                {new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
