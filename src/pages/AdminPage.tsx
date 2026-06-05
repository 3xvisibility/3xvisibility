import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, Rocket, AlertCircle, CheckCircle2, Search, Pencil, RotateCcw, UserPlus, FileText, Activity, Zap, ShieldAlert, MoreHorizontal, Ban, Trash2, ShieldCheck, ShieldOff, UserCog, BarChart3, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AiCreditsAdminPanel } from "@/components/admin/AiCreditsAdminPanel";
import { AdminConnectionsPanel } from "@/components/admin/AdminConnectionsPanel";
import { SystemSettingsPanel } from "@/components/admin/SystemSettingsPanel";
import { AiAccessAdminPanel } from "@/components/admin/AiAccessAdminPanel";
import { AiUsageReportPanel } from "@/components/admin/AiUsageReportPanel";
import { AdminOverviewPanel } from "@/components/admin/AdminOverviewPanel";
import { UserDetailDialog } from "@/components/admin/UserDetailDialog";

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
  is_banned: boolean;
  banned_reason: string | null;
  role: "admin" | "moderator" | "user";
  credits_total: number | null;
  credits_used: number | null;
  credits_remaining: number | null;
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
  is_paused?: boolean | null;
  user_email?: string | null;
  user_name?: string | null;
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

// AI credit quota per plan — kept in sync with the subscription plan
const PLAN_CREDITS: Record<string, number> = {
  free: 0,
  starter: 100,
  pro: 1000,
  agency: 5000,
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

function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), currentPage, totalPages };
}

function PaginationBar({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground pt-2">
      <div className="tabular-nums">
        Showing {totalItems === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </Button>
        <span className="tabular-nums">Page {page} / {totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
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
  onSave: (data: {
    plan: string;
    pages_limit: number;
    pages_used: number;
    credits_total: number;
    credits_remaining: number;
  }) => void;
  saving: boolean;
}) {
  const [plan, setPlan] = useState(subscription?.plan || user?.plan || "free");
  const [pagesLimit, setPagesLimit] = useState(String(subscription?.pages_limit ?? user?.pages_limit ?? 0));
  const [pagesUsed, setPagesUsed] = useState(String(subscription?.pages_used ?? user?.pages_used ?? 0));
  const [creditsTotal, setCreditsTotal] = useState(String(user?.credits_total ?? 100));
  const [creditsRemaining, setCreditsRemaining] = useState(String(user?.credits_remaining ?? user?.credits_total ?? 100));

  // Sync state when dialog opens with new data
  useEffect(() => {
    if (!open) return;
    setPlan(subscription?.plan || user?.plan || "free");
    setPagesLimit(String(subscription?.pages_limit ?? user?.pages_limit ?? 0));
    setPagesUsed(String(subscription?.pages_used ?? user?.pages_used ?? 0));
    setCreditsTotal(String(user?.credits_total ?? 100));
    setCreditsRemaining(String(user?.credits_remaining ?? user?.credits_total ?? 100));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id, subscription?.id]);

  const handlePlanChange = (newPlan: string) => {
    setPlan(newPlan);
    if (PLAN_LIMITS[newPlan] !== undefined) {
      setPagesLimit(String(PLAN_LIMITS[newPlan]));
    }
    // Keep AI credit quota aligned with the selected subscription plan
    if (PLAN_CREDITS[newPlan] !== undefined) {
      setCreditsTotal(String(PLAN_CREDITS[newPlan]));
      setCreditsRemaining(String(PLAN_CREDITS[newPlan]));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Subscription &amp; Credits</DialogTitle>
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
            <Label>Monthly Pages Quota</Label>
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

          <div className="border-t pt-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Credits</p>
            <div className="space-y-2">
              <Label>Monthly Credit Limit</Label>
              <Input
                type="number"
                min={0}
                value={creditsTotal}
                onChange={(e) => setCreditsTotal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Remaining Credits</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={() => setCreditsRemaining(creditsTotal)}
                >
                  <RotateCcw className="h-3 w-3" /> Refill
                </Button>
              </div>
              <Input
                type="number"
                min={0}
                value={creditsRemaining}
                onChange={(e) => setCreditsRemaining(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Capped to the monthly limit. Used credits are recalculated automatically.
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                plan,
                pages_limit: Number(pagesLimit),
                pages_used: Number(pagesUsed),
                credits_total: Number(creditsTotal),
                credits_remaining: Number(creditsRemaining),
              })
            }
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Per-row actions menu ---
function UserActionsMenu({
  u, onViewDetails, onEditPlan, onSetRole, onToggleBan, onDelete,
}: {
  u: AdminUser;
  onViewDetails: () => void;
  onEditPlan: () => void;
  onSetRole: (role: "admin" | "moderator" | "user") => void;
  onToggleBan: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">Manage user</DropdownMenuLabel>
        <DropdownMenuItem onClick={onViewDetails}>
          <Search className="h-3.5 w-3.5 mr-2" /> View full details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEditPlan}>
          <Pencil className="h-3.5 w-3.5 mr-2" /> Edit plan & quota
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">Set role</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onSetRole("admin")} disabled={u.role === "admin"}>
          <ShieldCheck className="h-3.5 w-3.5 mr-2 text-primary" /> Admin
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSetRole("moderator")} disabled={u.role === "moderator"}>
          <UserCog className="h-3.5 w-3.5 mr-2" /> Moderator
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSetRole("user")} disabled={u.role === "user"}>
          <Users className="h-3.5 w-3.5 mr-2" /> User
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onToggleBan} className={u.is_banned ? "" : "text-destructive focus:text-destructive"}>
          {u.is_banned ? <><ShieldOff className="h-3.5 w-3.5 mr-2" /> Unban user</> : <><Ban className="h-3.5 w-3.5 mr-2" /> Ban user</>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AdminPage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get("section") || "overview";
  const setSection = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("section", value);
    setSearchParams(next);
  };
  const [userSearch, setUserSearch] = useState("");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [confirmDeleteCampaign, setConfirmDeleteCampaign] = useState<Campaign | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Pagination state
  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(25);
  const [campaignPage, setCampaignPage] = useState(1);
  const [campaignPageSize, setCampaignPageSize] = useState(25);
  const [subPage, setSubPage] = useState(1);
  const [subPageSize, setSubPageSize] = useState(25);

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
      target_user_id?: string;
      plan: string;
      pages_limit: number;
      pages_used: number;
      credits_total?: number;
      credits_remaining?: number;
    }) => {
      const { target_user_id, credits_total, credits_remaining, ...subPayload } = payload;
      const { data, error } = await supabase.functions.invoke("admin-panel", {
        body: { action: "update-subscription", ...subPayload },
      });
      if (error) throw error;

      if (target_user_id && (credits_total !== undefined || credits_remaining !== undefined)) {
        const { error: creditError } = await supabase.functions.invoke("admin-panel", {
          body: {
            action: "set-ai-credits",
            target_user_id,
            plan: payload.plan,
            total_credits: credits_total,
            remaining_credits: credits_remaining,
          },
        });
        if (creditError) throw creditError;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Subscription & credits updated");
      queryClient.invalidateQueries({ queryKey: ["admin-panel"] });
      setDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update subscription");
    },
  });

  const callAction = async (payload: Record<string, any>) => {
    const { data, error } = await supabase.functions.invoke("admin-panel", { body: payload });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const banMutation = useMutation({
    mutationFn: (vars: { user_id: string; banned: boolean; reason?: string }) =>
      callAction({ action: "ban-user", target_user_id: vars.user_id, banned: vars.banned, reason: vars.reason }),
    onSuccess: (_d, vars) => {
      toast.success(vars.banned ? "User banned" : "User unbanned");
      queryClient.invalidateQueries({ queryKey: ["admin-panel"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (user_id: string) => callAction({ action: "delete-user", target_user_id: user_id }),
    onSuccess: () => {
      toast.success("User deleted");
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ["admin-panel"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const roleMutation = useMutation({
    mutationFn: (vars: { user_id: string; role: string }) =>
      callAction({ action: "set-role", target_user_id: vars.user_id, role: vars.role }),
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["admin-panel"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const campaignPauseMutation = useMutation({
    mutationFn: (vars: { campaign_id: string; paused: boolean }) =>
      callAction({ action: vars.paused ? "pause-campaign" : "resume-campaign", campaign_id: vars.campaign_id }),
    onSuccess: (_d, vars) => {
      toast.success(vars.paused ? "Campaign paused" : "Campaign resumed");
      queryClient.invalidateQueries({ queryKey: ["admin-panel"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const campaignDeleteMutation = useMutation({
    mutationFn: (campaign_id: string) => callAction({ action: "delete-campaign", campaign_id }),
    onSuccess: () => {
      toast.success("Campaign deleted");
      setConfirmDeleteCampaign(null);
      queryClient.invalidateQueries({ queryKey: ["admin-panel"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
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

  const handleSave = (formData: {
    plan: string;
    pages_limit: number;
    pages_used: number;
    credits_total: number;
    credits_remaining: number;
  }) => {
    const { credits_total, credits_remaining, ...subData } = formData;
    updateMutation.mutate({
      subscription_id: editSub?.id || editUser?.subscription_id || null,
      user_id: editUser?.id,
      target_user_id: editUser?.id,
      credits_total,
      credits_remaining,
      ...subData,
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
  const filteredUsers = (data?.users || []).filter(
    (u) =>
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.company?.toLowerCase().includes(userSearch.toLowerCase())
  );
  const filteredCampaigns = (data?.campaigns || []).filter((c) => {
    const q = campaignSearch.toLowerCase();
    return (
      !q ||
      c.name?.toLowerCase().includes(q) ||
      c.user_email?.toLowerCase().includes(q) ||
      c.user_name?.toLowerCase().includes(q)
    );
  });
  const filteredSubscriptions = (data?.subscriptions || []).filter((s) => {
    const user = data?.users?.find((u) => u.id === s.user_id);
    const q = subSearch.toLowerCase();
    return (
      !q ||
      user?.email?.toLowerCase().includes(q) ||
      user?.full_name?.toLowerCase().includes(q) ||
      s.plan?.toLowerCase().includes(q) ||
      s.user_id?.toLowerCase().includes(q)
    );
  });

  const userPagination = paginate(filteredUsers, userPage, userPageSize);
  const campaignPagination = paginate(filteredCampaigns, campaignPage, campaignPageSize);
  const subPagination = paginate(filteredSubscriptions, subPage, subPageSize);

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
          <StatCard title={t("admin.totalUsers")} value={overview?.total_users || 0} icon={Users} />
          <StatCard title={t("admin.campaigns")} value={overview?.total_campaigns || 0} icon={Rocket} subtitle={`${overview?.active_campaigns || 0} ${t("admin.active")}`} />
          <StatCard title={t("admin.publishedPages")} value={overview?.published_pages || 0} icon={CheckCircle2} variant="success" subtitle={`${overview?.total_pages || 0} ${t("admin.total")}`} />
          <StatCard title={t("admin.failedPages")} value={overview?.failed_pages || 0} icon={AlertCircle} variant="destructive" />
        </div>
      )}

      <Tabs value={section} onValueChange={setSection}>
        <TabsList className="flex-wrap h-auto gap-1 p-1 lg:hidden">
          <TabsTrigger value="overview" className="text-xs gap-1"><BarChart3 className="h-3 w-3" />Overview</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">{t("admin.activity")}</TabsTrigger>
          <TabsTrigger value="users" className="text-xs">{t("admin.users")}</TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs">{t("admin.campaignsTab")}</TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-xs">{t("admin.subscriptions")}</TabsTrigger>
          <TabsTrigger value="ai-credits" className="text-xs gap-1"><Zap className="h-3 w-3" />AI Credits</TabsTrigger>
          <TabsTrigger value="ai-usage" className="text-xs gap-1"><Activity className="h-3 w-3" />Usage Report</TabsTrigger>
          <TabsTrigger value="connections" className="text-xs gap-1"><AlertCircle className="h-3 w-3" />Connections</TabsTrigger>
          <TabsTrigger value="ai-access" className="text-xs gap-1"><ShieldCheck className="h-3 w-3" />AI Access</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs gap-1"><UserCog className="h-3 w-3" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <AdminOverviewPanel
            loading={isLoading}
            overview={overview}
            users={data?.users || []}
            campaigns={data?.campaigns || []}
            subscriptions={data?.subscriptions || []}
          />
        </TabsContent>




        <TabsContent value="ai-access" className="space-y-4">
          <AiAccessAdminPanel />
        </TabsContent>


        <TabsContent value="ai-credits" className="space-y-4">
          <AiCreditsAdminPanel />
        </TabsContent>

        <TabsContent value="ai-usage" className="space-y-4">
          <AiUsageReportPanel />
        </TabsContent>


        <TabsContent value="connections" className="space-y-4">
          <AdminConnectionsPanel />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SystemSettingsPanel />
        </TabsContent>

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
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={String(userPageSize)} onValueChange={(v) => { setUserPageSize(Number(v)); setUserPage(1); }}>
              <SelectTrigger className="w-[110px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <Skeleton className="h-[300px] rounded-xl" />
          ) : (
            <div className="rounded-xl border">
              {/* Mobile card layout */}
              <div className="lg:hidden divide-y divide-border">
                {userPagination.items.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No users found</p>
                ) : (
                  userPagination.items.map((u) => (
                    <div key={u.id} className="p-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium">{u.full_name || "—"}</p>
                          {u.is_banned && <Badge variant="destructive" className="text-[9px] h-4">Banned</Badge>}
                          {u.role !== "user" && <Badge variant="outline" className="text-[9px] h-4 border-primary/40 text-primary capitalize">{u.role}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="capitalize text-[10px]">{u.plan}</Badge>
                          <span className="text-[10px] text-muted-foreground">{u.pages_used}/{u.pages_limit || "∞"} pages</span>
                          <span className="text-[10px] text-muted-foreground">{u.campaigns_count} campaigns</span>
                        </div>
                      </div>
                      <UserActionsMenu
                        u={u}
                        onViewDetails={() => setDetailUserId(u.id)}
                        onEditPlan={() => openEditFromUser(u)}
                        onSetRole={(role) => roleMutation.mutate({ user_id: u.id, role })}
                        onToggleBan={() => banMutation.mutate({ user_id: u.id, banned: !u.is_banned })}
                        onDelete={() => setConfirmDelete(u)}
                      />
                    </div>
                  ))
                )}
              </div>
              {/* Desktop table */}
              <div className="hidden lg:block overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Pages</TableHead>
                      <TableHead className="text-right hidden xl:table-cell">Campaigns</TableHead>
                      <TableHead className="text-right hidden xl:table-cell">Sites</TableHead>
                      <TableHead className="hidden xl:table-cell">Joined</TableHead>
                      <TableHead className="hidden 2xl:table-cell">Last Active</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userPagination.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No users found</TableCell>
                      </TableRow>
                    ) : (
                      userPagination.items.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <button type="button" onClick={() => setDetailUserId(u.id)} className="text-left hover:underline">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-medium text-sm">{u.full_name || "—"}</p>
                                {u.is_banned && <Badge variant="destructive" className="text-[10px] h-4">Banned</Badge>}
                                {u.role !== "user" && <Badge variant="outline" className="text-[10px] h-4 border-primary/40 text-primary capitalize">{u.role}</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </button>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{u.plan}</Badge></TableCell>
                          <TableCell className="text-right tabular-nums text-sm">{u.pages_used} / {u.pages_limit || "∞"}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm hidden xl:table-cell">{u.campaigns_count}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm hidden xl:table-cell">{u.websites_count}</TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden xl:table-cell">{formatDate(u.created_at)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden 2xl:table-cell">{formatDate(u.last_sign_in_at)}</TableCell>
                          <TableCell>
                            <UserActionsMenu
                              u={u}
                              onViewDetails={() => setDetailUserId(u.id)}
                              onEditPlan={() => openEditFromUser(u)}
                              onSetRole={(role) => roleMutation.mutate({ user_id: u.id, role })}
                              onToggleBan={() => banMutation.mutate({ user_id: u.id, banned: !u.is_banned })}
                              onDelete={() => setConfirmDelete(u)}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="p-2 border-t">
                <PaginationBar
                  page={userPagination.currentPage}
                  totalPages={userPagination.totalPages}
                  pageSize={userPageSize}
                  totalItems={filteredUsers.length}
                  onPageChange={setUserPage}
                  onPageSizeChange={(s) => { setUserPageSize(s); setUserPage(1); }}
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Campaigns tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by campaign or user email..."
                value={campaignSearch}
                onChange={(e) => { setCampaignSearch(e.target.value); setCampaignPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={String(campaignPageSize)} onValueChange={(v) => { setCampaignPageSize(Number(v)); setCampaignPage(1); }}>
              <SelectTrigger className="w-[110px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <Skeleton className="h-[300px] rounded-xl" />
          ) : (
            <div className="rounded-xl border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Progress</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignPagination.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No campaigns found</TableCell>
                    </TableRow>
                  ) : (
                    campaignPagination.items.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {c.name}
                            {c.is_paused && <Badge variant="outline" className="text-[9px] h-4 text-yellow-600 border-yellow-500/30">Paused</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {c.user_id ? (
                            <button
                              type="button"
                              onClick={() => setDetailUserId(c.user_id)}
                              className="text-left hover:underline"
                            >
                              <p className="text-sm font-medium">{c.user_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{c.user_email || c.user_id}</p>
                            </button>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(c.status)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{c.processed_rows ?? 0} / {c.total_rows ?? 0}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-xs">Manage campaign</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setDetailUserId(c.user_id)}>
                                <Search className="h-3.5 w-3.5 mr-2" /> View owner details
                              </DropdownMenuItem>
                              {c.is_paused ? (
                                <DropdownMenuItem onClick={() => campaignPauseMutation.mutate({ campaign_id: c.id, paused: false })}>
                                  <Play className="h-3.5 w-3.5 mr-2" /> Resume campaign
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => campaignPauseMutation.mutate({ campaign_id: c.id, paused: true })}>
                                  <Pause className="h-3.5 w-3.5 mr-2" /> Pause campaign
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setConfirmDeleteCampaign(c)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete campaign
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="p-2 border-t">
                <PaginationBar
                  page={campaignPagination.currentPage}
                  totalPages={campaignPagination.totalPages}
                  pageSize={campaignPageSize}
                  totalItems={filteredCampaigns.length}
                  onPageChange={setCampaignPage}
                  onPageSizeChange={(s) => { setCampaignPageSize(s); setCampaignPage(1); }}
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Subscriptions tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, email, or plan..."
                value={subSearch}
                onChange={(e) => { setSubSearch(e.target.value); setSubPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={String(subPageSize)} onValueChange={(v) => { setSubPageSize(Number(v)); setSubPage(1); }}>
              <SelectTrigger className="w-[110px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <Skeleton className="h-[300px] rounded-xl" />
          ) : (
            <div className="rounded-xl border">
              {/* Mobile card layout */}
              <div className="lg:hidden divide-y divide-border">
                {subPagination.items.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No subscriptions found</p>
                ) : (
                  subPagination.items.map((s) => {
                    const user = data?.users?.find((u) => u.id === s.user_id);
                    const usagePercent = s.pages_limit > 0 ? Math.round((s.pages_used / s.pages_limit) * 100) : 0;
                    return (
                      <div key={s.id} className="p-3 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{user?.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">{user?.email || s.user_id}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="capitalize text-[10px]">{s.plan}</Badge>
                            <span className="text-[10px] tabular-nums">{s.pages_used}/{s.pages_limit}</span>
                            <Badge variant="outline" className={`text-[10px] ${
                              usagePercent >= 90 ? "text-destructive border-destructive/20" :
                              usagePercent >= 70 ? "text-yellow-600 border-yellow-500/20" :
                              "text-success border-success/20"
                            }`}>{usagePercent}%</Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEditFromSub(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
              {/* Desktop table */}
              <div className="hidden lg:block overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Usage</TableHead>
                      <TableHead className="hidden xl:table-cell">Period Start</TableHead>
                      <TableHead className="hidden xl:table-cell">Period End</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subPagination.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No subscriptions found</TableCell>
                      </TableRow>
                    ) : (
                      subPagination.items.map((s) => {
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
                            <TableCell className="text-sm text-muted-foreground hidden xl:table-cell">{formatDate(s.current_period_start)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden xl:table-cell">{formatDate(s.current_period_end)}</TableCell>
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
              <div className="p-2 border-t">
                <PaginationBar
                  page={subPagination.currentPage}
                  totalPages={subPagination.totalPages}
                  pageSize={subPageSize}
                  totalItems={filteredSubscriptions.length}
                  onPageChange={setSubPage}
                  onPageSizeChange={(s) => { setSubPageSize(s); setSubPage(1); }}
                />
              </div>
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

      <UserDetailDialog
        userId={detailUserId}
        open={!!detailUserId}
        onOpenChange={(o) => !o && setDetailUserId(null)}
      />



      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <span className="font-medium text-foreground">{confirmDelete?.email}</span> and all of their data.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => { e.preventDefault(); if (confirmDelete) deleteMutation.mutate(confirmDelete.id); }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDeleteCampaign} onOpenChange={(o) => !o && setConfirmDeleteCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes <span className="font-medium text-foreground">{confirmDeleteCampaign?.name}</span> along with its generated pages, logs and generation jobs. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={campaignDeleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={campaignDeleteMutation.isPending}
              onClick={(e) => { e.preventDefault(); if (confirmDeleteCampaign) campaignDeleteMutation.mutate(confirmDeleteCampaign.id); }}
            >
              {campaignDeleteMutation.isPending ? "Deleting…" : "Delete campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
