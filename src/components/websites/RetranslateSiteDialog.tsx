import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Languages, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  websiteId: string;
  websiteName: string;
  siteLanguage: string | null;
}

interface RetranslateResult {
  success: boolean;
  target_language: string;
  target_language_name?: string;
  retranslated: number;
  republished: number;
  publish_error?: string | null;
  errors?: { page_id: string; error: string }[];
  message?: string;
}

export function RetranslateSiteDialog({ open, onOpenChange, websiteId, websiteName, siteLanguage }: Props) {
  const [count, setCount] = useState("5");
  const [result, setResult] = useState<RetranslateResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const hasLanguage = !!(siteLanguage && siteLanguage.trim());

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("retranslate-site-pages", {
        body: { website_id: websiteId, count: Number(count) },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as RetranslateResult;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["websites"] });
      const lang = data.target_language_name || data.target_language;
      toast({
        title: "Re-translation complete",
        description: `${data.retranslated} page(s) re-translated to ${lang}, ${data.republished} re-published.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Re-translation failed", description: err.message, variant: "destructive" });
    },
  });

  const handleClose = (v: boolean) => {
    if (!mutation.isPending) {
      onOpenChange(v);
      if (!v) setResult(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-4 w-4" /> Re-translate to site language
          </DialogTitle>
          <DialogDescription>
            Take the most recent generated pages of <span className="font-medium">{websiteName}</span>, translate them
            into the site's locked language, and re-publish them to the live CMS.
          </DialogDescription>
        </DialogHeader>

        {!hasLanguage ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 text-destructive flex-shrink-0" />
            <div>
              This website has <strong>no Site Language</strong> set yet. Open the site's settings (pencil icon) and
              choose a Site Language first, then come back.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
              <div className="text-muted-foreground">Locked site language</div>
              <div className="font-medium text-sm mt-0.5">{siteLanguage}</div>
            </div>

            <div>
              <Label htmlFor="retrans-count">How many recent pages to re-translate?</Label>
              <Select value={count} onValueChange={setCount} disabled={mutation.isPending}>
                <SelectTrigger id="retrans-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      Last {n} pages
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Pages are translated in place (no duplicates) and immediately re-published.
              </p>
            </div>

            {result && (
              <div className="rounded-md border border-border p-3 text-sm space-y-1">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">
                    {result.retranslated} re-translated · {result.republished} re-published
                  </span>
                </div>
                {result.message && <p className="text-xs text-muted-foreground">{result.message}</p>}
                {result.publish_error && (
                  <p className="text-xs text-destructive">Publish warning: {result.publish_error}</p>
                )}
                {result.errors && result.errors.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">
                      {result.errors.length} error(s)
                    </summary>
                    <ul className="mt-1 list-disc pl-4 space-y-0.5">
                      {result.errors.slice(0, 5).map((e, i) => (
                        <li key={i} className="text-destructive break-all">{e.error}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={mutation.isPending}>
            Close
          </Button>
          {hasLanguage && (
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Re-translating…</>
              ) : (
                <><Languages className="h-4 w-4 mr-1" /> Re-translate &amp; Republish</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
