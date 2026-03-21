import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSubscription } from "@/hooks/use-subscription";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function WorkspaceSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { workspaces, currentWorkspace, setCurrentWorkspace, refetch } = useWorkspace();
  const { plan } = useSubscription();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + crypto.randomUUID().slice(0, 8);

      const { data: ws, error } = await supabase
        .from("workspaces")
        .insert({ name: newName, slug, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("workspace_members").insert({
        workspace_id: ws.id,
        user_id: user.id,
        role: "owner",
      });

      await refetch();
      setCurrentWorkspace({ ...ws, role: "owner" });
      setCreateOpen(false);
      setNewName("");
      toast({ title: "Workspace created", description: `"${newName}" is ready.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (!currentWorkspace) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 px-3 py-2 h-auto ${collapsed ? "justify-center" : ""}`}
          >
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-3.5 w-3.5 text-primary" />
            </div>
            {!collapsed && (
              <>
                <div className="flex flex-col items-start text-left min-w-0 flex-1">
                  <span className="text-sm font-medium truncate w-full">{currentWorkspace.name}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{plan} plan</span>
                </div>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => setCurrentWorkspace(ws)}
              className="flex items-center gap-2 py-2"
            >
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm truncate">{ws.name}</span>
                <span className="text-[10px] text-muted-foreground capitalize">{ws.role}</span>
              </div>
              {ws.id === currentWorkspace.id && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="ws-name">Workspace Name</Label>
              <Input
                id="ws-name"
                placeholder="e.g., My Agency"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
