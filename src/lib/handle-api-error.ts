import { toast } from "sonner";
import { friendlyError, isCreditError } from "@/lib/friendly-errors";

/**
 * Centralised handler for edge function / API errors.
 * - Detects AI credit exhaustion and shows a toast with a "Top up" action.
 * - Falls back to friendly error mapping for everything else.
 *
 * Usage:
 *   const { data, error } = await supabase.functions.invoke("...");
 *   if (error || data?.error) {
 *     handleApiError(error || data.error);
 *     return;
 *   }
 */
export function handleApiError(err: unknown, opts?: { title?: string }): void {
  const raw = err instanceof Error ? err.message : (err as any)?.message ?? String(err ?? "");

  if (isCreditError(raw)) {
    toast.error("AI credits exhausted", {
      description: "Your workspace AI balance is empty. Top up to continue generating.",
      action: {
        label: "Top up",
        onClick: () => {
          // Workspace-aware billing route
          const match = window.location.pathname.match(/^\/w\/([^/]+)/);
          const base = match ? `/w/${match[1]}` : "";
          window.location.href = `${base}/billing`;
        },
      },
      duration: 8000,
    });
    return;
  }

  toast.error(opts?.title ?? "Something went wrong", {
    description: friendlyError(raw),
  });
}
