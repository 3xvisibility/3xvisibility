import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Mail, Check, X, Users } from "lucide-react";

interface PendingInvitation {
  id: string;
  workspace_id: string;
  workspace_name: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
}

export function PendingInvitationsBanner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { refetch: refetchWorkspaces } = useWorkspace();

  const { data: invitations } = useQuery({
    queryKey: ["my-pending-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("workspace-settings", {
        body: { action: "my_pending_invitations" },
      });
      if (error) throw error;
      return (data as any)?.invitations as PendingInvitation[] || [];
    },
    refetchInterval: 60_000,
  });

  const acceptMutation = useMutation({
    mutationFn: async (invitation_id: string) => {
      const { data, error } = await supabase.functions.invoke("workspace-settings", {
        body: { action: "accept_invitation", invitation_id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
    onSuccess: (_data, _vars) => {
      queryClient.invalidateQueries({ queryKey: ["my-pending-invitations"] });
      refetchWorkspaces();
      toast({ title: "Invitation accepted", description: "You've been added to the workspace." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (invitation_id: string) => {
      const { data, error } = await supabase.functions.invoke("workspace-settings", {
        body: { action: "decline_invitation", invitation_id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-pending-invitations"] });
      toast({ title: "Invitation declined" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (!invitations?.length) return null;

  return (
    <div className="space-y-2">
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                You've been invited to join{" "}
                <span className="font-semibold">{inv.workspace_name}</span>
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Users className="h-3 w-3" />
                Role: <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0">{inv.role}</Badge>
                <span className="text-border">·</span>
                Expires {new Date(inv.expires_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
              onClick={() => declineMutation.mutate(inv.id)}
              disabled={declineMutation.isPending || acceptMutation.isPending}
            >
              <X className="h-3.5 w-3.5" />
              Decline
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => acceptMutation.mutate(inv.id)}
              disabled={acceptMutation.isPending || declineMutation.isPending}
            >
              <Check className="h-3.5 w-3.5" />
              Accept
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
