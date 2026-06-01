import { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Redirects legacy routes (e.g. /dashboard) to the workspace-prefixed version
 * (e.g. /w/my-workspace/dashboard).
 */
export function WorkspaceRedirect({ path }: { path: string }) {
  const { currentWorkspace, workspaces, isLoading, refetch } = useWorkspace();
  const retriedRef = useRef(false);

  const hasWorkspace = !!(currentWorkspace || workspaces[0]);

  // If loading finished but no workspace was found (e.g. a transient fetch
  // failure right after login), retry once before giving up. This prevents the
  // dashboard from getting permanently stuck on a loading spinner.
  useEffect(() => {
    if (!isLoading && !hasWorkspace && !retriedRef.current) {
      retriedRef.current = true;
      refetch();
    }
  }, [isLoading, hasWorkspace, refetch]);

  // Show spinner while workspaces are loading, or while the one-shot retry is
  // still in flight.
  if (isLoading || (!hasWorkspace && !retriedRef.current)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const ws = currentWorkspace || workspaces[0];
  if (!ws) return <Navigate to="/auth" replace />;

  return <Navigate to={`/w/${ws.slug}/${path}`} replace />;
}
