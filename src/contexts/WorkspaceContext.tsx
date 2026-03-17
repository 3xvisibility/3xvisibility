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
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  currentWorkspace: null,
  setCurrentWorkspace: () => {},
  isLoading: true,
  refetch: async () => {},
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
      const { data: { user } } = await supabase.auth.getUser();
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

  useEffect(() => {
    fetchWorkspaces();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchWorkspaces();
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
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
