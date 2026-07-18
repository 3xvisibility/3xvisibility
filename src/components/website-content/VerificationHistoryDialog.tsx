import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";

interface VerificationRow {
  id: string;
  created_at: string;
  verified_all: boolean;
  force_republish: boolean;
  attempts: number;
  page_id: string;
  page_slug: string | null;
  page_url: string | null;
  matches: Record<string, boolean> | null;
  error: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId?: string | null;
  websiteId?: string | null;
  campaignId?: string | null;
  pageIds?: string[];
  title?: string;
}

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  content: "Content",
  seoTitle: "SEO title",
  seoDescription: "Meta description",
};

export function VerificationHistoryDialog({
  open, onOpenChange, workspaceId, websiteId, campaignId, pageIds, title,
}: Props) {
  const [rows, setRows] = useState<VerificationRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      let q = supabase
        .from("seo_apply_verifications")
        .select("id, created_at, verified_all, force_republish, attempts, page_id, page_slug, page_url, matches, error")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (websiteId) q = q.eq("website_id", websiteId);
      if (pageIds && pageIds.length) q = q.in("page_id", pageIds.map(String));
      const { data, error } = await q;
      if (error) throw error;
      setRows((data || []) as VerificationRow[]);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workspaceId, websiteId, campaignId, JSON.stringify(pageIds || [])]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            {title || "SEO Apply — Verification history"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground">
            Last 100 Apply-to-site verifications for this scope.
          </p>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading && !rows && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        )}

        {rows && rows.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground border border-dashed rounded-lg">
            No verification runs yet. They appear after you use <b>Apply to site</b> in the SEO optimize dialog.
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="space-y-2">
            {rows.map((r) => {
              const matched = r.matches ? Object.entries(r.matches).filter(([, v]) => v).map(([k]) => k) : [];
              const missed = r.matches ? Object.entries(r.matches).filter(([, v]) => !v).map(([k]) => k) : [];
              return (
                <div key={r.id} className="rounded-lg border p-3 bg-card/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.verified_all ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Verified
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                            <XCircle className="h-3 w-3" /> Partial
                          </Badge>
                        )}
                        {r.force_republish && (
                          <Badge variant="outline" className="text-xs">Force republish</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">{r.attempts} attempt(s)</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1.5 text-sm font-medium truncate">
                        {r.page_slug || r.page_id}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {matched.map((k) => (
                          <Badge key={k} variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            ✓ {FIELD_LABELS[k] || k}
                          </Badge>
                        ))}
                        {missed.map((k) => (
                          <Badge key={k} variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                            ✗ {FIELD_LABELS[k] || k}
                          </Badge>
                        ))}
                      </div>
                      {r.error && (
                        <div className="mt-2 text-xs text-destructive line-clamp-2">{r.error}</div>
                      )}
                    </div>
                    {r.page_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={r.page_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
