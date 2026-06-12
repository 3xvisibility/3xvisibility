import { Label } from "@/components/ui/label";
import { Palette, Check } from "lucide-react";
import {
  PLATFORM_SKIN_VARIANTS,
  type TemplatePlatform,
} from "@/lib/marketplace-templates";

interface PlatformSkinPickerProps {
  /** Target CMS platform — controls which theme variants are shown. */
  platform: Exclude<TemplatePlatform, "generic">;
  /** Currently selected variant id. */
  value: string;
  onChange: (variantId: string) => void;
}

const PLATFORM_LABEL: Record<Exclude<TemplatePlatform, "generic">, string> = {
  wordpress: "WordPress",
  shopify: "Shopify",
  prestashop: "PrestaShop",
};

/**
 * Lets the user pick a per-template platform theme skin (e.g. Shopify Dawn vs
 * Studio vs Craft, or WordPress Twenty Twenty-Four vs Astra vs Kadence) before
 * generating pages so the output matches their store's native theme look.
 */
export function PlatformSkinPicker({ platform, value, onChange }: PlatformSkinPickerProps) {
  const variants = PLATFORM_SKIN_VARIANTS[platform] ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-muted-foreground" />
        <div>
          <Label className="text-sm font-semibold">{PLATFORM_LABEL[platform]} theme skin</Label>
          <p className="text-[11px] text-muted-foreground">
            Match the look of your store's theme — applied to every generated page.
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        {variants.map((v) => {
          const selected = v.id === value;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange(v.id)}
              className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                selected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                }`}
              >
                {selected && <Check className="h-2.5 w-2.5" />}
              </span>
              <div>
                <div className="text-sm font-medium">{v.label}</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{v.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
