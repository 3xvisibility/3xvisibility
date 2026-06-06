import { toast } from "sonner";
import { friendlyError, isCreditError, isUnauthorizedError, isForbiddenError, isSubscriptionLimitError } from "@/lib/friendly-errors";

/**
 * Centralised handler for edge function / API errors.
 * - Detects AI credit exhaustion and shows a toast with a "Top up" action.
 * - Detects Unauthorized (401) and shows a "Sign in" action.
 * - Detects Forbidden (403) and explains the missing permission.
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

  // Unauthorized — not signed in / token missing or expired. Guide the user to sign in.
  if (isUnauthorizedError(raw)) {
    toast.error("Sign-in required", {
      description: friendlyError(raw),
      action: {
        label: "Sign in",
        onClick: () => {
          const redirect = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/auth?redirect=${redirect}`;
        },
      },
      duration: 8000,
    });
    return;
  }

  // Subscription / plan limit — show upgrade prompt
  if (isSubscriptionLimitError(raw)) {
    const usage = getUsageSnapshot();
    let description = friendlyError(raw);
    if (usage && usage.pagesLimit > 0) {
      description += ` You've used ${usage.pagesUsed} of ${usage.pagesLimit} pages (${usage.pagesRemaining} remaining).`;
    }
    toast.error("Plan limit reached", {
      description,
      action: {
        label: "Upgrade plan",
        onClick: () => {
          const match = window.location.pathname.match(/^\/w\/([^/]+)/);
          const base = match ? `/w/${match[1]}` : "";
          window.location.href = `${base}/billing`;
        },
      },
      duration: 10000,
    });
    return;
  }


  // Forbidden — signed in but lacking permission. Explain clearly with admin-only guidance.
  if (isForbiddenError(raw)) {
    const msg = friendlyError(raw);
    const isAdminOnly = msg.toLowerCase().includes("admin-only");
    toast.error("Access denied", {
      description: msg,
      action: isAdminOnly
        ? {
            label: "Contact admin",
            onClick: () => {
              const match = window.location.pathname.match(/^\/w\/([^/]+)/);
              const base = match ? `/w/${match[1]}` : "";
              window.location.href = `${base}/settings/team`;
            },
          }
        : undefined,
      duration: 10000,
    });
    return;
  }

  toast.error(opts?.title ?? "Something went wrong", {
    description: friendlyError(raw),
  });
}
