import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Sparkles, X } from "lucide-react";

export interface AiDraftField {
  /** Stable key returned in onApply */
  key: string;
  /** Human label shown above the field */
  label: string;
  /** AI-proposed value (editable in the draft) */
  value: string;
  /** Existing value, shown for comparison when different */
  original?: string;
  /** Render a textarea instead of an input */
  multiline?: boolean;
}

interface AiDraftReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  fields: AiDraftField[];
  applyLabel?: string;
  discardLabel?: string;
  onApply: (values: Record<string, string>) => void;
  onDiscard?: () => void;
}

/**
 * Draft / preview step shown after an AI run and before anything is written
 * back into the editor or published. Values stay editable so the user can
 * tweak the AI output, then Apply (keeps it as a draft) or Discard.
 */
export function AiDraftReviewDialog({
  open,
  onOpenChange,
  title = "Review AI draft",
  description = "Nothing is saved or published yet — edit anything you want, then apply the draft.",
  fields,
  applyLabel = "Apply draft",
  discardLabel = "Discard",
  onApply,
  onDiscard,
}: AiDraftReviewDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const f of fields) next[f.key] = f.value ?? "";
    setValues(next);
  }, [open, fields]);

  const handleApply = () => {
    onApply(values);
    onOpenChange(false);
  };

  const handleDiscard = () => {
    onDiscard?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-3">
          <div className="space-y-4 py-1">
            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">The AI did not return anything to review.</p>
            )}
            {fields.map((f) => {
              const changed = f.original !== undefined && f.original.trim() !== (values[f.key] ?? "").trim();
              return (
                <div key={f.key} className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="text-xs font-medium">{f.label}</Label>
                    <Badge variant={changed ? "default" : "outline"} className="text-[10px]">
                      {changed ? "changed" : "draft"}
                    </Badge>
                  </div>
                  {f.original !== undefined && changed && (
                    <p className="text-[11px] text-muted-foreground line-through break-words max-h-24 overflow-y-auto">
                      {f.original || "(empty)"}
                    </p>
                  )}
                  {f.multiline ? (
                    <Textarea
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                      rows={8}
                      className="text-xs font-mono"
                    />
                  ) : (
                    <Input
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="text-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleDiscard} className="gap-1">
            <X className="h-4 w-4" /> {discardLabel}
          </Button>
          <Button onClick={handleApply} disabled={fields.length === 0} className="gap-1">
            <Check className="h-4 w-4" /> {applyLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
