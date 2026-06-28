import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanEye } from "lucide-react";
import {
  VisualValidationPanel,
  type ValidationSide,
} from "@/components/generated-pages/VisualValidationPanel";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** The expected/template render (baseline). */
  baselineHtml?: string | null;
  /** The generated page HTML, used when there is no live URL yet. */
  targetHtml?: string | null;
  /** The live published page URL to compare against (preferred target). */
  publishedUrl?: string | null;
  workspaceId?: string | null;
  generatedPageId?: string | null;
  templateId?: string | null;
}

export function VisualFidelityDialog({
  open, onOpenChange, baselineHtml, targetHtml, publishedUrl, workspaceId, generatedPageId, templateId,
}: Props) {
  const baseline: ValidationSide = baselineHtml ? { html: baselineHtml } : {};
  const target: ValidationSide = publishedUrl
    ? { url: publishedUrl }
    : (targetHtml ? { html: targetHtml } : {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ScanEye className="h-4 w-4" /> Visual fidelity check</DialogTitle>
          <DialogDescription>
            Compares the published page against the original template and reports the visual similarity score.
          </DialogDescription>
        </DialogHeader>

        <VisualValidationPanel
          workspaceId={workspaceId}
          generatedPageId={generatedPageId}
          templateId={templateId}
          baseline={baseline}
          target={target}
          threshold={0.98}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
