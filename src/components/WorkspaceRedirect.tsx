import { Navigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Redirects legacy routes (e.g. /dashboard) to the workspace-prefixed version
 * (e.g. /w/my-workspace/dashboard).
 */
export function WorkspaceRedirect({ path }: { path: string }) {
  const { currentWorkspace, workspaces, isLoading } = useWorkspace();

  // Show spinner while workspaces are loading OR if they haven't been fetched yet
  if (isLoading || (!currentWorkspace && workspaces.length === 0)) {
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
