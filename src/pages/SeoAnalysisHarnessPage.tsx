import { useState } from "react";
import { SeoAnalysisDialog } from "@/components/SeoAnalysisDialog";
import { Button } from "@/components/ui/button";

/**
 * Dev-only harness used by the Playwright e2e test for the SEO Analysis
 * dialog. It renders the real {@link SeoAnalysisDialog} with a deliberately
 * low-scoring page so that the "AI Fix All Issues" gate is triggered and the
 * pinned footer button is rendered. The test then verifies that the footer
 * button stays visible while the dialog body is scrolled.
 */

const LOW_SCORE_PAGE = {
  id: "harness-page-1",
  workspace_id: null,
  campaign_id: null,
  title: "x",
  slug: "x",
  content: "<p>short</p>",
  seo_title: "",
  seo_description: "",
  seo_keywords: [],
  canonical_url: null,
  external_url: null,
  status: "draft",
  external_id: null,
  website_id: null,
};

export default function SeoAnalysisHarnessPage() {
  const [open, setOpen] = useState(true);

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-4">SEO Analysis Harness</h1>
      <Button data-testid="open-seo" onClick={() => setOpen(true)}>
        Open analysis
      </Button>
      <SeoAnalysisDialog open={open} onOpenChange={setOpen} page={LOW_SCORE_PAGE} />
    </div>
  );
}
