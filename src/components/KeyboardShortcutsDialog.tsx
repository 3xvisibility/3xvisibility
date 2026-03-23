import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  const shortcuts = [
    { keys: ["Ctrl", "B"], description: t("shortcuts.toggleSidebar") },
    { keys: ["Ctrl", "K"], description: t("shortcuts.openCommandPalette") },
    { keys: ["Ctrl", "⇧", "D"], description: t("shortcuts.goDashboard") },
    { keys: ["Ctrl", "⇧", "C"], description: t("shortcuts.goCampaigns") },
    { keys: ["Ctrl", "⇧", "T"], description: t("shortcuts.goTemplates") },
    { keys: ["Ctrl", "⇧", "A"], description: t("shortcuts.goAnalytics") },
    { keys: ["Ctrl", "⇧", "S"], description: t("shortcuts.goSettings") },
    { keys: ["Alt", "←/→"], description: t("shortcuts.navigateBetweenPages") },
    { keys: ["?"], description: t("shortcuts.showThisHelp") },
  ];

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
            {t("common.keyboardShortcuts")}
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
          {t("shortcuts.macHint")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
