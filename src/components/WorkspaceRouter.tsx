import { useEffect, useRef } from "react";
import { useParams, Navigate, Outlet } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { logSecurityEvent } from "@/lib/security-audit";

/**
 * Resolves the :workspaceSlug URL param, syncs it with WorkspaceContext,
 * and renders child routes via <Outlet />.
 */
export function WorkspaceRouter() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { workspaces, currentWorkspace, setCurrentWorkspace, isLoading } = useWorkspace();
  const reportedSlug = useRef<string | null>(null);

  useEffect(() => {
    if (!workspaceSlug || isLoading || workspaces.length === 0) return;

    // If the URL slug doesn't match the current workspace, switch to it
    if (currentWorkspace?.slug !== workspaceSlug) {
      const target = workspaces.find((w) => w.slug === workspaceSlug);
      if (target) {
        setCurrentWorkspace(target);
      } else if (reportedSlug.current !== workspaceSlug) {
        // The user navigated to a workspace they are not a member of.
        reportedSlug.current = workspaceSlug;
        const home = currentWorkspace || workspaces[0];
        void logSecurityEvent({
          workspaceId: home.id,
          action: "security_cross_workspace_blocked",
          entityType: "workspace",
          details: {
            attempted_workspace_slug: workspaceSlug,
            reason: "not_a_workspace_member",
          },
        });
      }
    }
  }, [workspaceSlug, workspaces, currentWorkspace, isLoading, setCurrentWorkspace]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // If no workspaces exist yet, redirect to landing
  if (workspaces.length === 0) {
    return <Navigate to="/" replace />;
  }

  // If the slug doesn't match any workspace, redirect to the current workspace
  const matchedWorkspace = workspaces.find((w) => w.slug === workspaceSlug);
  if (!matchedWorkspace) {
    const fallback = currentWorkspace || workspaces[0];
    return <Navigate to={`/w/${fallback.slug}/dashboard`} replace />;
  }

  return <Outlet />;
}
