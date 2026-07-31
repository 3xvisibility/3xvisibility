import * as React from "react";
import { useState } from "react";

import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Single source of truth for AI brand icon tooltip behaviour in billing views. */
export const BRAND_TOOLTIP_DELAY = 120;

/** Standardized provider so every billing surface shares the same hover delay. */
export function BrandTooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={BRAND_TOOLTIP_DELAY} skipDelayDuration={300}>
      {children}
    </TooltipProvider>
  );
}

/**
 * Tooltip trigger for AI brand/model icons.
 * Works on touch (tap toggles), stays inside the viewport, closes on Escape,
 * and uses one shared theme, spacing and arrow across all billing views.
 */
export function BrandIconTooltip({
  label,
  title,
  detail,
  className,
  children,
}: {
  label: string;
  title: string;
  detail?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          className={cn(
            "inline-flex cursor-help items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            className,
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        sideOffset={8}
        collisionPadding={12}
        avoidCollisions
        role="tooltip"
        className="z-50 overflow-visible max-w-[min(220px,calc(100vw-2rem))] space-y-0.5 break-words px-3 py-2 text-center"
      >
        <p className="text-xs font-semibold leading-snug text-popover-foreground">{title}</p>
        {detail && (
          <p className="text-[11px] leading-snug text-muted-foreground">{detail}</p>
        )}
        <TooltipArrow />
      </TooltipContent>
    </Tooltip>
  );
}
