import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Database,
  FileText,
  Globe,
  Play,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "campaign-howitworks-dismissed-v1";

interface Step {
  num: number;
  icon: React.ElementType;
  title: string;
  desc: string;
  tip?: string;
}

const STEPS: Step[] = [
  {
    num: 1,
    icon: Database,
    title: "Add your data",
    desc: "Upload a CSV, let AI generate rows, or pick locations. Each row becomes one page.",
    tip: "Example: 100 cities × 1 service = 100 unique pages",
  },
  {
    num: 2,
    icon: FileText,
    title: "Pick a template",
    desc: "Choose a design from the marketplace or build one with AI. The template is the layout for every page.",
    tip: "Template variables like {city}, {service} get filled from your data",
  },
  {
    num: 3,
    icon: Globe,
    title: "Connect a website",
    desc: "Link the WordPress, Shopify or PrestaShop site where pages should be published. Optional — you can also keep them as drafts.",
  },
  {
    num: 4,
    icon: Play,
    title: "Run the campaign",
    desc: "Click Run. We generate every page, optimise SEO, and publish (or save as drafts) automatically.",
    tip: "Use Test mode first to preview 1 page before generating all of them",
  },
];

interface Props {
  onCreateClick?: () => void;
  /** When true, render compact (only header strip, no expanded steps). */
  compact?: boolean;
}

export function CampaignHowItWorks({ onCreateClick, compact = false }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [expanded, setExpanded] = useState(!compact);

  if (dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setDismissed(true);
  };

  return (
    <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-surface overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-primary/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">
              How a campaign works
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              4 simple steps — Data → Template → Website → Run
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="h-8 text-xs gap-1"
          >
            {expanded ? (
              <>
                Hide <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Show <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8"
            title="Don't show again"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded steps */}
      {expanded && (
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="relative rounded-xl border border-border bg-background/60 p-3.5 hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  {/* Step number bubble */}
                  <div className="flex items-start gap-3 mb-2">
                    <div className="relative shrink-0">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <Badge
                        variant="default"
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] font-bold rounded-full"
                      >
                        {step.num}
                      </Badge>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm leading-tight">{step.title}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>

                  {step.tip && (
                    <div className="mt-2.5 pt-2.5 border-t border-dashed border-border flex gap-1.5">
                      <Lightbulb className="h-3 w-3 text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-foreground/80 leading-snug">{step.tip}</p>
                      </div>
                    </div>
                  )}

                  {/* Arrow connector (desktop only) */}
                  {idx < STEPS.length - 1 && (
                    <div className="hidden xl:block absolute -right-[18px] top-1/2 -translate-y-1/2 z-10">
                      <div className="h-6 w-6 rounded-full bg-card border border-primary/20 flex items-center justify-center">
                        <span className="text-primary text-xs">→</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              <span>
                Tip: Start with <strong className="text-foreground">10–20 rows</strong> to test, then scale up.
                <span className="block sm:inline sm:ml-1 italic">
                  শুরুতে ১০–২০টি সারি দিয়ে টেস্ট করুন, পরে বাড়ান।
                </span>
              </span>
            </div>
            {onCreateClick && (
              <Button
                size="sm"
                onClick={onCreateClick}
                className="rounded-xl bg-gradient-primary hover:brightness-110 gap-1.5 shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Start a campaign
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
