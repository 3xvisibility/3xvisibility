import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Wand2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AnalyzerReport } from "@/lib/analyzer-pdf";
import {
  recommendTemplates,
  totalSuggestedPages,
  type PageRecommendation,
} from "@/lib/analyzer-recommendations";

const priorityStyle: Record<PageRecommendation["priority"], string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  low: "bg-primary/10 text-primary border-primary/30",
};

interface Props {
  report: AnalyzerReport;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnalyzerPageRecommendations({ report, open, onOpenChange }: Props) {
  const recs = recommendTemplates(report);
  const total = totalSuggestedPages(recs);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b text-left">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Wand2 className="h-5 w-5 text-primary" />
            Pages to generate for {report.host}
          </DialogTitle>
          <DialogDescription>
            {recs.length > 0
              ? `Based on ${report.issueCount} analyzer issues, we recommend ${total} new pages across ${recs.length} templates.`
              : "Your page already passes every analyzer check — no new pages are needed right now."}
          </DialogDescription>
        </DialogHeader>

        {recs.length > 0 && (
          <ScrollArea className="max-h-[55vh]">
            <div className="p-6 space-y-4">
              {recs.map((rec) => (
                <div key={rec.id} className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <h4 className="font-semibold">{rec.template}</h4>
                    <Badge variant="outline" className={`text-[10px] uppercase ${priorityStyle[rec.priority]}`}>
                      {rec.priority} priority
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {rec.suggestedPages} pages
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{rec.purpose}</p>
                  <p className="mt-2 text-xs">
                    <span className="font-medium text-foreground">Fixes: </span>
                    <span className="text-muted-foreground">{rec.fixes.join(", ")}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {rec.examples.map((ex) => (
                      <span
                        key={ex}
                        className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="border-t bg-muted/30 p-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-muted-foreground flex-1">
            <Sparkles className="inline h-4 w-4 text-primary mr-1" />
            Create these as a campaign and 3xVisibility writes, scores and publishes each page for you.
          </p>
          <Button asChild className="rounded-xl font-semibold shrink-0">
            <Link to="/auth">
              Generate these pages <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AnalyzerPageRecommendations;
