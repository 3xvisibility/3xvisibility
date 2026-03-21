import { useEffect } from "react";
import { useParams, Navigate, Outlet } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Resolves the :workspaceSlug URL param, syncs it with WorkspaceContext,
 * and renders child routes via <Outlet />.
 */
export function WorkspaceRouter() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { workspaces, currentWorkspace, setCurrentWorkspace, isLoading } = useWorkspace();

  useEffect(() => {
    if (!workspaceSlug || isLoading || workspaces.length === 0) return;

    // If the URL slug doesn't match the current workspace, switch to it
    if (currentWorkspace?.slug !== workspaceSlug) {
      const target = workspaces.find((w) => w.slug === workspaceSlug);
      if (target) {
        setCurrentWorkspace(target);
      }
    }
  }, [workspaceSlug, workspaces, currentWorkspace?.slug, isLoading, setCurrentWorkspace]);

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
