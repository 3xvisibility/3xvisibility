import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { History, RefreshCw, Sparkles } from "lucide-react";
import {
  getMarketplaceUpdateState,
  type VersionedTemplateRow,
} from "@/lib/marketplace-versioning";
import { COMMUNITY_TEMPLATES } from "@/lib/marketplace-templates";

interface Props {
  template: VersionedTemplateRow & { id: string };
  /** Triggered when the user clicks "Re-import latest" — should create a NEW
   *  snapshot row so existing campaigns keep using the current pinned one. */
  onReimport?: (sourceMarketplaceId: string) => void;
  size?: "sm" | "xs";
  showVersion?: boolean;
}

/**
 * Surface the marketplace version state of a stored template snapshot.
 *
 * Why a new snapshot (and not an in-place update)?
 *   Campaigns reference templates by id. Mutating the existing row would
 *   silently change every campaign that uses it — exactly the bug template
 *   versioning is meant to prevent. Instead we create a brand-new pinned
 *   snapshot and let the user attach it to future campaigns at their leisure.
 */
export function TemplateVersionBadge({ template, onReimport, size = "xs", showVersion = false }: Props) {
  const state = useMemo(
    () => getMarketplaceUpdateState(template, COMMUNITY_TEMPLATES),
    [template],
  );

  if (state.kind === "not-marketplace") return null;

  const textSize = size === "xs" ? "text-[10px]" : "text-xs";

  if (state.kind === "up-to-date") {
    if (!showVersion) return null;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`${textSize} gap-1 font-mono`}>
              <History className="h-3 w-3" /> {state.version}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">Pinned snapshot. Campaigns using this template are locked to this exact version.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (state.kind === "missing-source") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`${textSize} gap-1`}>
              <History className="h-3 w-3" /> Legacy snapshot
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">Imported before versioning. Re-import to lock to a tracked version (latest: <code>{state.latestVersion}</code>).</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // update-available
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={`${textSize} gap-1 bg-gradient-to-r from-amber-500/15 to-fuchsia-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300`}
          >
            <Sparkles className="h-3 w-3" /> Update available
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs space-y-2">
            <p className="text-xs">
              The marketplace template was updated.<br />
              Pinned: <code>{state.current}</code><br />
              Latest: <code>{state.latest}</code>
            </p>
            {onReimport && template.source_marketplace_id && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-full gap-1 text-xs"
                onClick={(e) => { e.stopPropagation(); onReimport(template.source_marketplace_id!); }}
              >
                <RefreshCw className="h-3 w-3" /> Import latest as new snapshot
              </Button>
            )}
            <p className="text-[10px] text-muted-foreground">
              Existing campaigns keep using the pinned version.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
