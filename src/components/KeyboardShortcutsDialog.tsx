import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const shortcuts = [
  { keys: ["Ctrl", "B"], description: "Toggle sidebar" },
  { keys: ["Ctrl", "K"], description: "Open command palette" },
  { keys: ["Ctrl", "⇧", "D"], description: "Go to Dashboard" },
  { keys: ["Ctrl", "⇧", "C"], description: "Go to Campaigns" },
  { keys: ["Ctrl", "⇧", "T"], description: "Go to Templates" },
  { keys: ["Ctrl", "⇧", "A"], description: "Go to Analytics" },
  { keys: ["Ctrl", "⇧", "S"], description: "Go to Settings" },
  { keys: ["Alt", "←/→"], description: "Navigate between pages" },
  { keys: ["?"], description: "Show this help" },
];

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("show-shortcuts-help", handler);
    return () => window.removeEventListener("show-shortcuts-help", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 mt-2">
          {shortcuts.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm text-foreground">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded border border-border bg-muted text-[11px] font-mono text-muted-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          On macOS, use ⌘ instead of Ctrl.
        </p>
      </DialogContent>
    </Dialog>
  );
}
