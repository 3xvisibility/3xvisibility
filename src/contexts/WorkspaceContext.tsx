import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  role?: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (ws: Workspace) => void;
  isLoading: boolean;
  refetch: () => Promise<void>;
  /** Returns the base path for the current workspace, e.g. "/w/my-workspace" */
  basePath: string;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  currentWorkspace: null,
  setCurrentWorkspace: () => {},
  isLoading: true,
  refetch: async () => {},
  basePath: "",
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    try {
      // Use the locally-stored session (no network round-trip) to identify the
      // user. getUser() hits /auth/v1/user over the network and can transiently
      // return 403 "session_not_found" right after login or on flaky networks,
      // which previously left the dashboard stuck on an infinite spinner.
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      if (!user) {
        setWorkspaces([]);
        setCurrentWorkspaceState(null);
        setIsLoading(false);
        return;
      }

      // Get all workspaces the user is a member of
      const { data: memberships, error } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", user.id);

      if (error || !memberships?.length) {
        setWorkspaces([]);
        setCurrentWorkspaceState(null);
        setIsLoading(false);
        return;
      }

      const wsIds = memberships.map((m: any) => m.workspace_id);
      const { data: wsData } = await supabase
        .from("workspaces")
        .select("*")
        .in("id", wsIds);

      if (wsData) {
        const enriched = wsData.map((ws: any) => ({
          ...ws,
          role: memberships.find((m: any) => m.workspace_id === ws.id)?.role,
        }));
        setWorkspaces(enriched);

        // Restore last used workspace from localStorage or pick first
        const savedId = localStorage.getItem("current_workspace_id");
        const saved = enriched.find((w: Workspace) => w.id === savedId);
        if (!currentWorkspace || !enriched.find((w: Workspace) => w.id === currentWorkspace.id)) {
          setCurrentWorkspaceState(saved || enriched[0]);
        }
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setCurrentWorkspace = useCallback((ws: Workspace) => {
    setCurrentWorkspaceState(ws);
    localStorage.setItem("current_workspace_id", ws.id);
  }, []);

  const basePath = currentWorkspace ? `/w/${currentWorkspace.slug}` : "";

  useEffect(() => {
    fetchWorkspaces();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event) => {
      // Only refetch on actual sign-in/out — NOT on TOKEN_REFRESHED (fires on tab focus
      // and would cause forms to unmount and lose user input).
      if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT') {
        setIsLoading(true);
        fetchWorkspaces();
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchWorkspaces]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        isLoading,
        refetch: fetchWorkspaces,
        basePath,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
