import { Monitor, Tablet, Smartphone } from "lucide-react";
import { CANVAS, type DeviceKey } from "@/lib/box-settings-validation";

const ICON: Record<DeviceKey, typeof Monitor> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

/**
 * Side-by-side live preview of boxed content at desktop / tablet / mobile
 * breakpoints simultaneously. Section backgrounds always span the full band;
 * the inner content is boxed to `width` (or fluid when null) with `gutter`
 * horizontal spacing.
 */
export default function BoxPreview({
  boxingEnabled,
  widths,
  gutters,
}: {
  boxingEnabled: boolean;
  widths: Record<DeviceKey, number | null>;
  gutters: Record<DeviceKey, number | null>;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(Object.keys(CANVAS) as DeviceKey[]).map((d) => {
        const Icon = ICON[d];
        const canvas = CANVAS[d];
        const w = widths[d];
        const g = gutters[d] ?? 0;
        const boxPct = !boxingEnabled ? 100 : w == null ? 100 : Math.min((w / canvas) * 100, 100);
        // Inner content inset from the box edges by the gutter.
        const basis = boxingEnabled && w != null ? w : canvas;
        const insetPct = Math.min((g / basis) * 100, 45);
        return (
          <div key={d} className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Icon className="h-3 w-3" /> <span className="capitalize">{d}</span>
              <span className="text-[9px]">({canvas}px)</span>
            </div>
            <div className="overflow-hidden rounded-md border bg-muted/30">
              {/* Hero band */}
              <div className="w-full bg-primary/10 py-2">
                <div
                  className="mx-auto rounded bg-primary/40 transition-all duration-300"
                  style={{ width: `${boxPct}%` }}
                >
                  <div
                    className="rounded-sm bg-primary/60 py-1.5 text-center text-[8px] font-medium text-primary-foreground"
                    style={{ marginLeft: `${insetPct}%`, marginRight: `${insetPct}%` }}
                  >
                    Hero
                  </div>
                </div>
              </div>
              {/* Columns band */}
              <div className="w-full bg-secondary/40 py-2">
                <div
                  className="mx-auto transition-all duration-300"
                  style={{ width: `${boxPct}%` }}
                >
                  <div className="flex gap-1" style={{ marginLeft: `${insetPct}%`, marginRight: `${insetPct}%` }}>
                    <div className="h-5 flex-1 rounded bg-foreground/15" />
                    <div className="h-5 flex-1 rounded bg-foreground/15" />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-center text-[9px] text-muted-foreground">
              {!boxingEnabled ? "Full width" : w == null ? `Fluid · ${g}px gutter` : `${w}px · ${g}px gutter`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
