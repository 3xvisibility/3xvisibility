import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, Rocket, AlertCircle, CheckCircle2, Search, Pencil, RotateCcw, UserPlus, FileText, Activity } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  full_name: string | null;
  company: string | null;
  plan: string;
  pages_used: number;
  pages_limit: number;
  subscription_id: string | null;
  campaigns_count: number;
  pages_count: number;
  websites_count: number;
}

interface AdminOverview {
  total_users: number;
  total_campaigns: number;
  active_campaigns: number;
  completed_campaigns: number;
  total_pages: number;
  published_pages: number;
  failed_pages: number;
  total_websites: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  user_id: string;
  total_rows: number | null;
  processed_rows: number | null;
  created_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  pages_used: number;
  pages_limit: number;
  current_period_start: string | null;
  current_period_end: string | null;
}

interface ActivityItem {
  type: "signup" | "campaign" | "page";
  message: string;
  timestamp: string;
  user_email?: string;
}

const PLAN_LIMITS: Record<string, number> = {
  free: 0,
  starter: 100,
  pro: 2000,
  agency: 10000,
};

function StatCard({ title, value, icon: Icon, subtitle, variant }: {
  title: string;
  value: string | number;
  icon: any;
  subtitle?: string;
  variant?: "default" | "success" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1 tabular-nums">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
            variant === "success" ? "bg-success/10 text-success" :
            variant === "destructive" ? "bg-destructive/10 text-destructive" :
            "bg-primary/10 text-primary"
          }`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeTime(d: string) {
  const now = Date.now();
  const diff = now - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: "bg-success/10 text-success border-success/20",
    processing: "bg-primary/10 text-primary border-primary/20",
    queued: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    failed: "bg-destructive/10 text-destructive border-destructive/20",
    draft: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={map[status] || ""}>{status}</Badge>;
}

// --- Edit Subscription Dialog ---
function EditSubscriptionDialog({
  open,
  onOpenChange,
  user,
  subscription,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: AdminUser | null;
  subscription: Subscription | null;
  onSave: (data: { plan: string; pages_limit: number; pages_used: number }) => void;
  saving: boolean;
}) {
  const [plan, setPlan] = useState(subscription?.plan || user?.plan || "free");
  const [pagesLimit, setPagesLimit] = useState(String(subscription?.pages_limit ?? user?.pages_limit ?? 0));
  const [pagesUsed, setPagesUsed] = useState(String(subscription?.pages_used ?? user?.pages_used ?? 0));

  // Sync state when dialog opens with new data
  const key = user?.id || subscription?.id || "";
  useState(() => {
    setPlan(subscription?.plan || user?.plan || "free");
    setPagesLimit(String(subscription?.pages_limit ?? user?.pages_limit ?? 0));
    setPagesUsed(String(subscription?.pages_used ?? user?.pages_used ?? 0));
  });

  const handlePlanChange = (newPlan: string) => {
    setPlan(newPlan);
    if (PLAN_LIMITS[newPlan] !== undefined) {
      setPagesLimit(String(PLAN_LIMITS[newPlan]));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 mb-4">
          <p className="text-sm font-medium">{user?.full_name || "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={plan} onValueChange={handlePlanChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Pages Limit</Label>
            <Input
              type="number"
              min={0}
              value={pagesLimit}
              onChange={(e) => setPagesLimit(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Pages Used</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={() => setPagesUsed("0")}
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </Button>
            </div>
            <Input
              type="number"
              min={0}
              value={pagesUsed}
              onChange={(e) => setPagesUsed(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave({ plan, pages_limit: Number(pagesLimit), pages_used: Number(pagesUsed) })}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPage() {
  const { t } = useLanguage();
  const [userSearch, setUserSearch] = useState("");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-panel"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-panel", {
        body: { action: "get-stats" },
      });
      if (error) throw error;
      return data as {
        users: AdminUser[];
        campaigns: Campaign[];
        subscriptions: Subscription[];
        activity: ActivityItem[];
        overview: AdminOverview;
      };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      subscription_id?: string | null;
      user_id?: string;
      plan: string;
      pages_limit: number;
      pages_used: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("admin-panel", {
        body: { action: "update-subscription", ...payload },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Subscription updated");
      queryClient.invalidateQueries({ queryKey: ["admin-panel"] });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update subscription");
    },
  });

  const openEditFromUser = (user: AdminUser) => {
    const sub = data?.subscriptions?.find((s) => s.user_id === user.id) || null;
    setEditUser(user);
    setEditSub(sub);
    setDialogOpen(true);
  };

  const openEditFromSub = (sub: Subscription) => {
    const user = data?.users?.find((u) => u.id === sub.user_id) || null;
    setEditUser(user);
    setEditSub(sub);
    setDialogOpen(true);
  };

  const handleSave = (formData: { plan: string; pages_limit: number; pages_used: number }) => {
    updateMutation.mutate({
      subscription_id: editSub?.id || editUser?.subscription_id || null,
      user_id: editUser?.id,
      ...formData,
    });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-sm max-w-md text-center">
          {(error as any)?.message?.includes("Forbidden")
            ? "You don't have admin privileges. Contact the platform owner to get admin access."
            : `Error: ${(error as any)?.message || "Failed to load admin data"}`}
        </p>
      </div>
    );
  }

  const overview = data?.overview;
  const filteredUsers = data?.users?.filter(
    (u) =>
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.company?.toLowerCase().includes(userSearch.toLowerCase())
  ) || [];
  const filteredCampaigns = data?.campaigns?.filter(
    (c) => c.name?.toLowerCase().includes(campaignSearch.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("admin.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("admin.description")}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={overview?.total_users || 0} icon={Users} />
          <StatCard title="Campaigns" value={overview?.total_campaigns || 0} icon={Rocket} subtitle={`${overview?.active_campaigns || 0} active`} />
          <StatCard title="Published Pages" value={overview?.published_pages || 0} icon={CheckCircle2} variant="success" subtitle={`${overview?.total_pages || 0} total`} />
          <StatCard title="Failed Pages" value={overview?.failed_pages || 0} icon={AlertCircle} variant="destructive" />
        </div>
      )}

      <Tabs defaultValue="activity">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
          <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs">Campaigns</TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-xs">Subs</TabsTrigger>
        </TabsList>

        {/* Activity feed tab */}
        <TabsContent value="activity" className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-[400px] rounded-xl" />
          ) : (
            <Card>
              <CardContent className="pt-6 px-0">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-0 divide-y divide-border">
                    {(data?.activity || []).length === 0 ? (
                      <p className="text-center text-muted-foreground py-12">No activity yet</p>
                    ) : (
                      data!.activity.map((item, i) => {
                        const Icon = item.type === "signup" ? UserPlus : item.type === "campaign" ? Rocket : FileText;
                        const iconClass = item.type === "signup" ? "text-primary bg-primary/10" : item.type === "campaign" ? "text-accent-foreground bg-accent" : "text-success bg-success/10";
                        return (
                          <div key={i} className="flex items-start gap-3 px-6 py-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${iconClass}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm">{item.message}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {item.user_email && <span className="text-xs text-muted-foreground truncate">{item.user_email}</span>}
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatRelativeTime(item.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Users tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-9" />
          </div>
          {isLoading ? (
            <Skeleton className="h-[300px] rounded-xl" />
          ) : (
            <div className="rounded-xl border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Pages</TableHead>
                    <TableHead className="text-right">Campaigns</TableHead>
                    <TableHead className="text-right">Sites</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No users found</TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{u.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{u.plan}</Badge></TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{u.pages_used} / {u.pages_limit || "∞"}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{u.campaigns_count}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{u.websites_count}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(u.last_sign_in_at)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditFromUser(u)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Campaigns tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search campaigns..." value={campaignSearch} onChange={(e) => setCampaignSearch(e.target.value)} className="pl-9" />
          </div>
          {isLoading ? (
            <Skeleton className="h-[300px] rounded-xl" />
          ) : (
            <div className="rounded-xl border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Progress</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No campaigns found</TableCell>
                    </TableRow>
                  ) : (
                    filteredCampaigns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">{c.name}</TableCell>
                        <TableCell>{statusBadge(c.status)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{c.processed_rows ?? 0} / {c.total_rows ?? 0}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Subscriptions tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-[300px] rounded-xl" />
          ) : (
            <div className="rounded-xl border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Usage</TableHead>
                    <TableHead>Period Start</TableHead>
                    <TableHead>Period End</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.subscriptions || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No subscriptions found</TableCell>
                    </TableRow>
                  ) : (
                    data!.subscriptions.map((s) => {
                      const user = data?.users?.find((u) => u.id === s.user_id);
                      const usagePercent = s.pages_limit > 0 ? Math.round((s.pages_used / s.pages_limit) * 100) : 0;
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{user?.full_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{user?.email || s.user_id}</p>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{s.plan}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-sm tabular-nums">{s.pages_used} / {s.pages_limit}</span>
                              <Badge variant="outline" className={`text-xs ${
                                usagePercent >= 90 ? "text-destructive border-destructive/20" :
                                usagePercent >= 70 ? "text-yellow-600 border-yellow-500/20" :
                                "text-success border-success/20"
                              }`}>{usagePercent}%</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(s.current_period_start)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(s.current_period_end)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditFromSub(s)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EditSubscriptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editUser}
        subscription={editSub}
        onSave={handleSave}
        saving={updateMutation.isPending}
      />
    </div>
  );
}
