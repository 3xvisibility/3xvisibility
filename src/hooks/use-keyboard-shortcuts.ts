import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function useKeyboardShortcuts(onOpenCommandPalette?: () => void) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { basePath } = useWorkspace();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      const mod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+K → open command palette (works even in inputs)
      if (mod && e.key === "k") {
        e.preventDefault();
        onOpenCommandPalette?.();
        return;
      }

      if (isInput) return;

      const bp = basePath || "";

      // Cmd/Ctrl+Shift+C → navigate to campaigns
      if (mod && e.shiftKey && e.key === "C") {
        e.preventDefault();
        navigate(`${bp}/campaigns`);
        toast({ title: "⌨️ Campaigns", description: "Ctrl+Shift+C", duration: 1500 });
        return;
      }

      // Cmd/Ctrl+Shift+D → dashboard
      if (mod && e.shiftKey && e.key === "D") {
        e.preventDefault();
        navigate(`${bp}/dashboard`);
        toast({ title: "⌨️ Dashboard", description: "Ctrl+Shift+D", duration: 1500 });
        return;
      }

      // Cmd/Ctrl+Shift+T → templates
      if (mod && e.shiftKey && e.key === "T") {
        e.preventDefault();
        navigate(`${bp}/templates`);
        toast({ title: "⌨️ Templates", description: "Ctrl+Shift+T", duration: 1500 });
        return;
      }

      // Cmd/Ctrl+Shift+A → analytics
      if (mod && e.shiftKey && e.key === "A") {
        e.preventDefault();
        navigate(`${bp}/analytics`);
        toast({ title: "⌨️ Analytics", description: "Ctrl+Shift+A", duration: 1500 });
        return;
      }

      // Cmd/Ctrl+Shift+S → settings
      if (mod && e.shiftKey && e.key === "S") {
        e.preventDefault();
        navigate(`${bp}/settings`);
        toast({ title: "⌨️ Settings", description: "Ctrl+Shift+S", duration: 1500 });
        return;
      }

      // Alt+Arrow → navigate between pages
      if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        const navRoutes = [
          "dashboard", "campaigns", "pages", "templates", "data",
          "scanner", "discovery", "analytics", "indexing",
          "websites", "billing", "settings", "workspace-settings",
        ].map(r => `${bp}/${r}`);
        const currentIdx = navRoutes.indexOf(location.pathname);
        if (currentIdx === -1) return;
        const nextIdx = e.key === "ArrowRight"
          ? (currentIdx + 1) % navRoutes.length
          : (currentIdx - 1 + navRoutes.length) % navRoutes.length;
        navigate(navRoutes[nextIdx]);
        return;
      }

      // ? → show shortcuts help
      if (e.key === "?" && !mod) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("show-shortcuts-help"));
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, location.pathname, toast, onOpenCommandPalette, basePath]);
}
