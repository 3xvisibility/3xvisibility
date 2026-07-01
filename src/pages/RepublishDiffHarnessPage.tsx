import { useMemo, useState } from "react";
import { RepublishDiffDialog, type RepublishSnapshot } from "@/components/generated-pages/RepublishDiffDialog";
import { Button } from "@/components/ui/button";

/**
 * Dev-only harness used by the Playwright e2e test for the Republish
 * Before/After diff view. It renders the real {@link RepublishDiffDialog}
 * with deterministic fixture snapshots so the diff rendering can be verified
 * end-to-end without needing a live publish/backend session.
 *
 * Snapshots can be overridden via `?before=<b64>&after=<b64>` (base64 of the
 * snapshot JSON) but sensible defaults are provided.
 */

const DEFAULT_BEFORE: RepublishSnapshot = {
  title: "Verodab Shop",
  external_url: "https://example.com/clone/verodab-shop",
  content:
    "<section class=\"hero\"><h1>Old Heading</h1><p>Original paragraph that stays the same.</p></section>",
};

const DEFAULT_AFTER: RepublishSnapshot = {
  title: "Verodab Shop",
  external_url: "https://example.com/clone/verodab-shop",
  content:
    "<section class=\"hero\"><h1>New Heading</h1><p>Original paragraph that stays the same.</p><p>Freshly added line after republish.</p></section>",
};

function decodeParam(value: string | null): RepublishSnapshot | null {
  if (!value) return null;
  try {
    return JSON.parse(atob(value)) as RepublishSnapshot;
  } catch {
    return null;
  }
}

export default function RepublishDiffHarnessPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const before = decodeParam(params.get("before")) ?? DEFAULT_BEFORE;
  const after = decodeParam(params.get("after")) ?? DEFAULT_AFTER;
  const autoOpen = params.get("open") !== "0";

  const [open, setOpen] = useState(autoOpen);

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-4">Republish Diff Harness</h1>
      <Button data-testid="open-diff" onClick={() => setOpen(true)}>
        Open diff
      </Button>
      <RepublishDiffDialog open={open} onOpenChange={setOpen} before={before} after={after} />
    </div>
  );
}
