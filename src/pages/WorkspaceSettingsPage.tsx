import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useBranding, type BrandingConfig } from "@/contexts/BrandingContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Crown, Shield, User, Trash2, UserPlus, Building2, Palette, ImageIcon, Type,
  Search, Clock, X, Mail, Eye, Globe, Link2, FileText,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import AuditLogViewer from "@/components/workspace/AuditLogViewer";

interface Member {
  id: string;
  user_id: string;
  role: string;
  email: string;
  created_at: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

function callWorkspaceSettings(body: Record<string, unknown>) {
  return supabase.functions.invoke("workspace-settings", { body });
}

export default function WorkspaceSettingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace, refetch: refetchWorkspaces } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const isOwner = currentWorkspace?.role === "owner";
  const isAdminOrOwner = currentWorkspace?.role === "owner" || currentWorkspace?.role === "admin";

  const [workspaceName, setWorkspaceName] = useState(currentWorkspace?.name || "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Sync workspace name when workspace changes
  const displayName = currentWorkspace?.name || "";
  if (workspaceName === "" && displayName) {
    setWorkspaceName(displayName);
  }

  // Fetch members
  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ["workspace-members", wsId],
    queryFn: async () => {
      if (!wsId) return [];
      const { data, error } = await callWorkspaceSettings({
        action: "list_members",
        workspace_id: wsId,
      });
      if (error) throw error;
      return (data as any)?.members as Member[] || [];
    },
    enabled: !!wsId && isAdminOrOwner,
  });

  // Fetch pending invitations
  const { data: pendingInvitations } = useQuery({
    queryKey: ["workspace-invitations", wsId],
    queryFn: async () => {
      if (!wsId) return [];
      const { data, error } = await callWorkspaceSettings({
        action: "list_pending_invitations",
        workspace_id: wsId,
      });
      if (error) throw error;
      return (data as any)?.invitations as PendingInvitation[] || [];
    },
    enabled: !!wsId && isAdminOrOwner,
  });

  // Filter members
  const filteredMembers = useMemo(() => {
    if (!members) return [];
    return members.filter((m) => {
      const matchesSearch = !searchQuery || m.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, roleFilter]);

  // Filter pending invitations
  const filteredInvitations = useMemo(() => {
    if (!pendingInvitations) return [];
    if (roleFilter !== "all" && roleFilter !== "pending") return [];
    return pendingInvitations.filter((i) =>
      !searchQuery || i.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pendingInvitations, searchQuery, roleFilter]);

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await callWorkspaceSettings({
        action: "rename_workspace",
        workspace_id: wsId,
        name: workspaceName,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => {
      refetchWorkspaces();
      toast({ title: "Workspace renamed", description: "Workspace name has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await callWorkspaceSettings({
        action: "invite_member",
        workspace_id: wsId,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
    onSuccess: (data) => {
      const status = data?.status;
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["workspace-members", wsId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-invitations", wsId] });
      if (status === "pending") {
        toast({ title: "Invitation sent", description: `A pending invitation has been created for ${inviteEmail}. They'll see it when they sign up and log in.` });
      } else {
        toast({ title: "Member added", description: `${inviteEmail} has been added to the workspace.` });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Invite failed", description: err.message, variant: "destructive" });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ member_id, role }: { member_id: string; role: string }) => {
      const { data, error } = await callWorkspaceSettings({
        action: "update_role",
        workspace_id: wsId,
        member_id,
        role,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", wsId] });
      toast({ title: "Role updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: async (member_id: string) => {
      const { data, error } = await callWorkspaceSettings({
        action: "remove_member",
        workspace_id: wsId,
        member_id,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-members", wsId] });
      toast({ title: "Member removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitation_id: string) => {
      const { data, error } = await callWorkspaceSettings({
        action: "cancel_invitation",
        workspace_id: wsId,
        invitation_id,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-invitations", wsId] });
      toast({ title: "Invitation cancelled" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const roleIcon = (role: string) => {
    if (role === "owner") return <Crown className="h-3.5 w-3.5" />;
    if (role === "admin") return <Shield className="h-3.5 w-3.5" />;
    if (role === "readonly") return <Eye className="h-3.5 w-3.5" />;
    return <User className="h-3.5 w-3.5" />;
  };

  const roleBadgeVariant = (role: string) => {
    if (role === "owner") return "default" as const;
    if (role === "admin") return "secondary" as const;
    return "outline" as const;
  };

  if (!wsId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No workspace selected.
      </div>
    );
  }

  const totalCount = (members?.length || 0) + (pendingInvitations?.length || 0);
  const showPending = roleFilter === "all" || roleFilter === "pending";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-display">{t("workspaceSettings.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("workspaceSettings.description")}</p>
      </div>

      {/* Rename Workspace */}
      <Card className="shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Workspace Details
          </CardTitle>
          <CardDescription>Update your workspace name. Only workspace owners can rename.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ws-name">Workspace Name</Label>
            <div className="flex gap-2">
              <Input
                id="ws-name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="My Workspace"
                disabled={!isOwner}
              />
              <Button
                onClick={() => renameMutation.mutate()}
                disabled={!isOwner || renameMutation.isPending || workspaceName.trim() === currentWorkspace?.name}
                className="shrink-0"
              >
                {renameMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
            {!isOwner && (
              <p className="text-xs text-muted-foreground">Only workspace owners can rename the workspace.</p>
            )}
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Plan: <Badge variant="outline" className="capitalize ml-1">{currentWorkspace?.plan || "free"}</Badge></span>
            <span>Slug: <code className="text-xs bg-muted px-1.5 py-0.5 rounded ml-1">{currentWorkspace?.slug}</code></span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Invite Members */}
      {isAdminOrOwner && (
        <Card className="shadow-surface">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Invite Member
            </CardTitle>
            <CardDescription>
              Invite users by email. Existing users are added immediately; others receive a pending invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="user@example.com"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="readonly">Read-only</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => inviteMutation.mutate()}
                disabled={inviteMutation.isPending || !inviteEmail.trim()}
                className="shrink-0"
              >
                {inviteMutation.isPending ? "Inviting..." : "Invite"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card className="shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Members
          </CardTitle>
          <CardDescription>
            {members?.length || 0} member{(members?.length || 0) !== 1 ? "s" : ""}
            {(pendingInvitations?.length || 0) > 0 && (
              <> · {pendingInvitations?.length} pending</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="readonly">Read-only</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingMembers ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Active members */}
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      {roleIcon(member.role)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{member.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isAdminOrOwner && member.role !== "owner" ? (
                      <Select
                        value={member.role}
                        onValueChange={(role) =>
                          updateRoleMutation.mutate({ member_id: member.id, role })
                        }
                      >
                        <SelectTrigger className="w-[110px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="readonly">Read-only</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={roleBadgeVariant(member.role)} className="capitalize gap-1">
                        {roleIcon(member.role)}
                        {member.role}
                      </Badge>
                    )}
                    {isAdminOrOwner && member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => removeMutation.mutate(member.id)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {/* Pending invitations */}
              {showPending && filteredInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Invited {new Date(inv.created_at).toLocaleDateString()} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Pending {inv.role}
                    </Badge>
                    {isAdminOrOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => cancelInvitationMutation.mutate(inv.id)}
                        disabled={cancelInvitationMutation.isPending}
                        title="Cancel invitation"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {filteredMembers.length === 0 && filteredInvitations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {searchQuery || roleFilter !== "all" ? "No members match your filters." : "No members yet."}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tenant Settings: Locale, Timezone, SEO Defaults */}
      {isAdminOrOwner && (
        <>
          <Separator />
          <TenantSettingsCard workspaceId={wsId} onSaved={refetchWorkspaces} />
        </>
      )}

      {/* Whitelabel Branding */}
      {isOwner && (
        <>
          <Separator />
          <WhitelabelBrandingCard workspaceId={wsId} onSaved={refetchWorkspaces} />
        </>
      )}

      {/* Audit Log */}
      {isAdminOrOwner && (
        <>
          <Separator />
          <AuditLogViewer workspaceId={wsId} />
        </>
      )}
    </div>
  );
}

// ── Tenant Settings Card ─────────────────────────────
function TenantSettingsCard({ workspaceId, onSaved }: { workspaceId: string; onSaved: () => void }) {
  const { toast } = useToast();
  const [locale, setLocale] = useState("en");
  const [tz, setTz] = useState("UTC");
  const [canonicalBase, setCanonicalBase] = useState("");
  const [defaultTitlePattern, setDefaultTitlePattern] = useState("");
  const [defaultDescPattern, setDefaultDescPattern] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const LOCALE_OPTIONS = [
    { value: "en", label: "English" },
    { value: "fr", label: "Français" },
    { value: "de", label: "Deutsch" },
    { value: "es", label: "Español" },
    { value: "pt", label: "Português" },
    { value: "it", label: "Italiano" },
    { value: "nl", label: "Nederlands" },
    { value: "ja", label: "日本語" },
  ];

  const TZ_OPTIONS = [
    "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
    "Australia/Sydney", "Pacific/Auckland",
  ];

  useQuery({
    queryKey: ["workspace-tenant-settings", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("locale, timezone, seo_defaults")
        .eq("id", workspaceId)
        .single();
      if (error) throw error;
      if (data && !loaded) {
        setLocale((data as any).locale || "en");
        setTz((data as any).timezone || "UTC");
        const seo = (data as any).seo_defaults || {};
        setCanonicalBase(seo.canonical_base || "");
        setDefaultTitlePattern(seo.title_pattern || "");
        setDefaultDescPattern(seo.description_pattern || "");
        setLoaded(true);
      }
      return data;
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const seo_defaults = {
        canonical_base: canonicalBase.trim(),
        title_pattern: defaultTitlePattern.trim(),
        description_pattern: defaultDescPattern.trim(),
      };
      const { error } = await supabase
        .from("workspaces")
        .update({
          locale,
          timezone: tz,
          seo_defaults: seo_defaults as any,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", workspaceId);
      if (error) throw error;
      onSaved();
      toast({ title: "Tenant settings saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="shadow-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Tenant Settings
        </CardTitle>
        <CardDescription>
          Configure locale, timezone, and SEO defaults that apply across all campaigns in this workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Default Locale</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOCALE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Language for new campaigns by default.</p>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={tz} onValueChange={setTz}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TZ_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Used for scheduled jobs and activity timestamps.</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">SEO Defaults</h3>
          </div>

          <div className="space-y-2">
            <Label>Canonical Base URL</Label>
            <Input
              placeholder="https://www.example.com"
              value={canonicalBase}
              onChange={(e) => setCanonicalBase(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Base URL prepended to page slugs for canonical tags.</p>
          </div>

          <div className="space-y-2">
            <Label>Default Meta Title Pattern</Label>
            <Input
              placeholder="{title} | {company} - {service}"
              value={defaultTitlePattern}
              onChange={(e) => setDefaultTitlePattern(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Fallback SEO title pattern for new templates. Use {"{ }"} variables.</p>
          </div>

          <div className="space-y-2">
            <Label>Default Meta Description Pattern</Label>
            <Textarea
              placeholder="{company} offers {service} in {location}. Contact us today!"
              value={defaultDescPattern}
              onChange={(e) => setDefaultDescPattern(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Fallback meta description for new templates.</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? "Saving..." : "Save Tenant Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ... keep existing code (WhitelabelBrandingCard component)
function WhitelabelBrandingCard({ workspaceId, onSaved }: { workspaceId: string; onSaved: () => void }) {
  const { toast } = useToast();
  const { branding } = useBranding();

  const [appName, setAppName] = useState(branding.app_name || "");
  const [logoUrl, setLogoUrl] = useState(branding.logo_url || "");
  const [primaryColor, setPrimaryColor] = useState(branding.primary_color || "");
  const [accentColor, setAccentColor] = useState(branding.accent_color || "");
  const [faviconUrl, setFaviconUrl] = useState(branding.favicon_url || "");
  const [hidePoweredBy, setHidePoweredBy] = useState(branding.hide_powered_by || false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAppName(branding.app_name || "");
    setLogoUrl(branding.logo_url || "");
    setPrimaryColor(branding.primary_color || "");
    setAccentColor(branding.accent_color || "");
    setFaviconUrl(branding.favicon_url || "");
    setHidePoweredBy(branding.hide_powered_by || false);
  }, [branding]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const newBranding: BrandingConfig = {
        app_name: appName.trim() || undefined,
        logo_url: logoUrl.trim() || undefined,
        primary_color: primaryColor.trim() || undefined,
        accent_color: accentColor.trim() || undefined,
        favicon_url: faviconUrl.trim() || undefined,
        hide_powered_by: hidePoweredBy,
      };
      const { error } = await supabase
        .from("workspaces")
        .update({ branding: newBranding as any, updated_at: new Date().toISOString() })
        .eq("id", workspaceId);
      if (error) throw error;
      onSaved();
      toast({ title: "Branding saved", description: "Your whitelabel settings have been updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="shadow-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          Whitelabel / Agency Branding
        </CardTitle>
        <CardDescription>
          Customize the app appearance for your clients. Set a custom name, logo, and color scheme.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* App Name */}
        <div className="space-y-2">
          <Label htmlFor="brand-name" className="flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5" /> App Name
          </Label>
          <Input
            id="brand-name"
            placeholder="e.g., My Agency SEO Tool"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Replaces "PageGen" throughout the dashboard</p>
        </div>

        {/* Logo URL */}
        <div className="space-y-2">
          <Label htmlFor="brand-logo" className="flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" /> Logo URL
          </Label>
          <Input
            id="brand-logo"
            placeholder="https://example.com/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
          {logoUrl && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <img src={logoUrl} alt="Logo preview" className="h-10 w-10 rounded-lg object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
              <span className="text-xs text-muted-foreground">Preview</span>
            </div>
          )}
        </div>

        {/* Colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brand-primary">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="brand-primary"
                placeholder="e.g., 217 91% 60%"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1"
              />
              {primaryColor && (
                <div
                  className="h-10 w-10 rounded-lg border border-border shrink-0"
                  style={{ backgroundColor: `hsl(${primaryColor})` }}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">HSL values (e.g., 217 91% 60%)</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-accent">Accent Color</Label>
            <div className="flex gap-2">
              <Input
                id="brand-accent"
                placeholder="e.g., 262 83% 58%"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="flex-1"
              />
              {accentColor && (
                <div
                  className="h-10 w-10 rounded-lg border border-border shrink-0"
                  style={{ backgroundColor: `hsl(${accentColor})` }}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">HSL values (e.g., 262 83% 58%)</p>
          </div>
        </div>

        {/* Favicon */}
        <div className="space-y-2">
          <Label htmlFor="brand-favicon">Favicon URL</Label>
          <Input
            id="brand-favicon"
            placeholder="https://example.com/favicon.ico"
            value={faviconUrl}
            onChange={(e) => setFaviconUrl(e.target.value)}
          />
        </div>

        {/* Hide powered by */}
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">Hide "Powered by" branding</p>
            <p className="text-xs text-muted-foreground">Remove any platform branding for a fully whitelabeled experience</p>
          </div>
          <Switch checked={hidePoweredBy} onCheckedChange={setHidePoweredBy} />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? "Saving..." : "Save Branding"}
        </Button>
      </CardContent>
    </Card>
  );
}
