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
import { Badge } from "@/components/ui/badge";
import { Code2, LayoutTemplate, ShoppingBag, Check } from "lucide-react";

export type PublishFormat = "html" | "elementor" | "shopify";

const OPTIONS: {
  value: PublishFormat;
  label: string;
  icon: typeof Code2;
  description: string;
  badge?: string;
}[] = [
  {
    value: "html",
    label: "Real code (HTML / CSS)",
    icon: Code2,
    description:
      "Publishes the exact generated HTML + CSS. Design stays 1:1 with the preview — best for verifying design and content fidelity.",
    badge: "Design 1:1",
  },
  {
    value: "elementor",
    label: "Elementor (native widgets)",
    icon: LayoutTemplate,
    description:
      "Converts the page into native Elementor containers and widgets so it stays editable in Elementor. Small design shifts are possible.",
    badge: "Editable",
  },
  {
    value: "shopify",
    label: "Shopify (theme sections)",
    icon: ShoppingBag,
    description:
      "Publishes as a native Shopify Online Store 2.0 section template, editable in the theme customizer. Theme styles may alter the design.",
    badge: "Theme-native",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Number of pages that will be published with the chosen format. */
  pageCount: number;
  /** Format pre-selected when the dialog opens. */
  defaultFormat?: PublishFormat;
  /** Whether "apply to every publish" is currently remembered. */
  rememberDefault?: boolean;
  onConfirm: (format: PublishFormat, remember: boolean) => void;
}

export function PublishFormatDialog({
  open,
  onOpenChange,
  pageCount,
  defaultFormat = "html",
  rememberDefault = false,
  onConfirm,
}: Props) {
  const [format, setFormat] = useState<PublishFormat>(defaultFormat);
  const [remember, setRemember] = useState(rememberDefault);

  // Re-sync with the caller's current defaults each time the dialog opens.
  useEffect(() => {
    if (open) {
      setFormat(defaultFormat);
      setRemember(rememberDefault);
    }
  }, [open, defaultFormat, rememberDefault]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>How should this be published?</DialogTitle>
          <DialogDescription>
            Choose the output format for {pageCount === 1 ? "this page" : `these ${pageCount} pages`}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = format === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFormat(opt.value)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{opt.label}</span>
                      {opt.badge && (
                        <Badge variant="outline" className="text-[10px]">
                          {opt.badge}
                        </Badge>
                      )}
                      {active && <Check className="ml-auto h-4 w-4 text-primary" />}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(format)}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
