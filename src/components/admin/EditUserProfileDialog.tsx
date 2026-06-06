import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { UserCog, KeyRound, Copy, RefreshCw, Mail, Save } from "lucide-react";

export interface EditableUser {
  id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
}

interface Props {
  user: EditableUser | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}

async function callAction(payload: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke("admin-panel", { body: payload });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const j = await ctx.json();
        if (j?.error) msg = j.error;
      }
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function EditUserProfileDialog({ user, open, onOpenChange, onSaved }: Props) {
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setCompany(user.company || "");
      setEmail(user.email || "");
      setNewPassword("");
      setRecoveryLink(null);
    }
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: () =>
      callAction({
        action: "update-user-profile",
        target_user_id: user?.id,
        full_name: fullName.trim() || null,
        company: company.trim() || null,
        email: email.trim() !== (user?.email || "") ? email.trim() : undefined,
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      onSaved?.();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to update profile"),
  });

  const setPasswordMutation = useMutation({
    mutationFn: () =>
      callAction({
        action: "reset-user-password",
        target_user_id: user?.id,
        new_password: newPassword,
      }),
    onSuccess: () => {
      toast.success("Password updated");
      setNewPassword("");
    },
    onError: (e: any) => toast.error(e.message || "Failed to set password"),
  });

  const recoveryMutation = useMutation({
    mutationFn: () =>
      callAction({
        action: "reset-user-password",
        target_user_id: user?.id,
      }),
    onSuccess: (d: any) => {
      if (d?.action_link) {
        setRecoveryLink(d.action_link);
        toast.success("Recovery link generated");
      } else {
        toast.success("Reset link sent");
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to generate reset link"),
  });

  const genRandom = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pw = "";
    for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    setNewPassword(pw);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" /> Manage user account
          </DialogTitle>
          <DialogDescription>
            Edit {user?.full_name || user?.email || "this user"}'s profile or reset their password.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="mt-1">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="profile" className="text-xs gap-1.5"><UserCog className="h-3.5 w-3.5" /> Profile</TabsTrigger>
            <TabsTrigger value="password" className="text-xs gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Password</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="eu-name">Full name</Label>
              <Input id="eu-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eu-company">Company</Label>
              <Input id="eu-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eu-email">Email address</Label>
              <Input id="eu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
              <p className="text-[11px] text-muted-foreground">Changing the email confirms it immediately for the user.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}>
                <Save className="h-4 w-4 mr-1.5" />
                {profileMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="password" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="eu-pass">Set a new password</Label>
              <div className="flex gap-2">
                <Input id="eu-pass" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" />
                <Button type="button" variant="outline" size="icon" onClick={genRandom} title="Generate">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <Button
                className="w-full mt-1"
                onClick={() => setPasswordMutation.mutate()}
                disabled={setPasswordMutation.isPending || newPassword.length < 6}
              >
                <KeyRound className="h-4 w-4 mr-1.5" />
                {setPasswordMutation.isPending ? "Updating…" : "Update password"}
              </Button>
            </div>

            <div className="relative py-1">
              <Separator />
              <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-background px-2 text-[10px] uppercase text-muted-foreground">or</span>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Generate a password recovery link to share with the user.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => recoveryMutation.mutate()}
                disabled={recoveryMutation.isPending}
              >
                {recoveryMutation.isPending ? "Generating…" : "Generate recovery link"}
              </Button>
              {recoveryLink && (
                <div className="flex gap-2 items-center">
                  <Input readOnly value={recoveryLink} className="text-xs font-mono" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => { navigator.clipboard.writeText(recoveryLink); toast.success("Link copied"); }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
