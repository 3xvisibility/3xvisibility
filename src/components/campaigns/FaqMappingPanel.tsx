import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { HelpCircle, Plus, Trash2, MessageSquareQuote, AlertTriangle } from "lucide-react";

/**
 * One mapping entry: a CSV column name (or empty) for the question and one for the answer.
 * Empty strings mean "not set". The generator skips pairs where either side is missing.
 */
export interface FaqPair {
  question: string; // CSV column name
  answer: string;   // CSV column name
}

interface FaqMappingPanelProps {
  csvHeaders: string[];
  pairs: FaqPair[];
  onChange: (pairs: FaqPair[]) => void;
  /** Optional cap — keeps the auto-generated FAQ block reasonable. */
  maxPairs?: number;
}

const NONE_VALUE = "__none__";

/**
 * UI for mapping CSV columns to FAQ question/answer fields.
 *
 * The auto-FAQ generator (supabase/functions/_shared/seo-meta.ts → buildAutoFaq)
 * already knows how to read normalized keys like `faq_q1` / `faq_a1`. This panel
 * lets users pick which of THEIR CSV columns should fill those slots, so a
 * column called "FAQ_What" can become the first question regardless of naming.
 *
 * Saved shape (campaign.mapping.faq_pairs):
 *   [{ question: "FAQ_What", answer: "FAQ_What_Answer" }, ...]
 */
export function FaqMappingPanel({ csvHeaders, pairs, onChange, maxPairs = 10 }: FaqMappingPanelProps) {
  const id = useId();
  const safePairs = pairs.length > 0 ? pairs : [{ question: "", answer: "" }];

  const update = (idx: number, key: keyof FaqPair, value: string) => {
    const next = [...safePairs];
    next[idx] = { ...next[idx], [key]: value === NONE_VALUE ? "" : value };
    onChange(next.filter((_, i) => i === idx || next[i].question || next[i].answer));
  };

  const addPair = () => {
    if (safePairs.length >= maxPairs) return;
    onChange([...safePairs, { question: "", answer: "" }]);
  };

  const removePair = (idx: number) => {
    const next = safePairs.filter((_, i) => i !== idx);
    onChange(next.length > 0 ? next : []);
  };

  const hasHeaders = csvHeaders.length > 0;
  const configuredCount = safePairs.filter((p) => p.question && p.answer).length;
  // Pairs are "orphaned" if a previously-mapped column is no longer present in
  // the current CSV headers — usually because the user re-uploaded a different CSV.
  const headerSet = new Set(csvHeaders);
  const orphanedPairs = pairs.filter(
    (p) => (p.question && !headerSet.has(p.question)) || (p.answer && !headerSet.has(p.answer)),
  );
  const hasMappingsButNoHeaders = !hasHeaders && pairs.some((p) => p.question || p.answer);

  const clearAll = () => onChange([]);

  return (
    <Card className="p-4 rounded-2xl border border-border bg-card/50 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <MessageSquareQuote className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <Label className="text-sm font-semibold">FAQ Column Mapping</Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pick CSV columns for your FAQ pairs. Mapped pairs become an auto-generated
              FAQ section + FAQPage schema on every page.
            </p>
          </div>
        </div>
        {configuredCount > 0 && (
          <span className="text-[10px] text-muted-foreground whitespace-nowrap pt-0.5">
            {configuredCount} pair{configuredCount === 1 ? "" : "s"} ready
          </span>
        )}
      </div>

      {hasMappingsButNoHeaders && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium text-warning-foreground">
              FAQ mappings saved but no CSV columns are available
            </p>
            <p className="text-[11px] text-muted-foreground">
              You have {pairs.length} saved FAQ pair{pairs.length === 1 ? "" : "s"}, but no CSV is
              loaded right now. Upload (or pick) a CSV to make these columns selectable, or clear
              the saved mappings.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="rounded-lg text-[11px] h-7 mt-1"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear FAQ mappings
            </Button>
          </div>
        </div>
      )}

      {!hasHeaders ? (
        !hasMappingsButNoHeaders && (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3 flex items-start gap-2">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">
              Upload or pick a CSV first to see column options here.
            </p>
          </div>
        )
      ) : (
        <div className="space-y-2">
          {orphanedPairs.length > 0 && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-2.5 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground flex-1">
                {orphanedPairs.length} FAQ pair{orphanedPairs.length === 1 ? "" : "s"} reference{orphanedPairs.length === 1 ? "s" : ""}{" "}
                column{orphanedPairs.length === 1 ? "" : "s"} that no longer exist in this CSV. Re-pick a column or remove the row.
              </p>
            </div>
          )}
          {safePairs.map((pair, i) => (
            <div
              key={`${id}-pair-${i}`}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end rounded-xl border border-border bg-background/50 p-2"
            >
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Question {i + 1} column
                </Label>
                <Select
                  value={pair.question || NONE_VALUE}
                  onValueChange={(v) => update(i, "question", v)}
                >
                  <SelectTrigger className="h-8 text-xs rounded-lg">
                    <SelectValue placeholder="— Select column —" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">
                      — Not set —
                    </SelectItem>
                    {csvHeaders.map((h) => (
                      <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Answer {i + 1} column
                </Label>
                <Select
                  value={pair.answer || NONE_VALUE}
                  onValueChange={(v) => update(i, "answer", v)}
                >
                  <SelectTrigger className="h-8 text-xs rounded-lg">
                    <SelectValue placeholder="— Select column —" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    <SelectItem value={NONE_VALUE} className="text-xs text-muted-foreground">
                      — Not set —
                    </SelectItem>
                    {csvHeaders.map((h) => (
                      <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 self-end text-muted-foreground hover:text-destructive"
                onClick={() => removePair(i)}
                aria-label={`Remove FAQ pair ${i + 1}`}
                disabled={safePairs.length === 1 && !pair.question && !pair.answer}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPair}
            disabled={safePairs.length >= maxPairs}
            className="rounded-xl text-xs h-8"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add FAQ pair
          </Button>
          {safePairs.length >= maxPairs && (
            <p className="text-[10px] text-muted-foreground">Max {maxPairs} pairs.</p>
          )}
        </div>
      )}
    </Card>
  );
}
