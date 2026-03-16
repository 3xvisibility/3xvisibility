import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Rocket, FileText, Globe, TrendingUp, AlertCircle, CheckCircle2, Search } from "lucide-react";

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

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: "bg-success/10 text-success border-success/20",
    processing: "bg-primary/10 text-primary border-primary/20",
    queued: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    failed: "bg-destructive/10 text-destructive border-destructive/20",
    draft: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={map[status] || ""}>
      {status}
    </Badge>
  );
}

export default function AdminPage() {
  const [userSearch, setUserSearch] = useState("");
  const [campaignSearch, setCampaignSearch] = useState("");

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
        overview: AdminOverview;
      };
    },
  });

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
        <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Platform overview and management
        </p>
      </div>

      {/* Overview stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={overview?.total_users || 0} icon={Users} />
          <StatCard title="Campaigns" value={overview?.total_campaigns || 0} icon={Rocket} subtitle={`${overview?.active_campaigns || 0} active`} />
          <StatCard title="Published Pages" value={overview?.published_pages || 0} icon={CheckCircle2} variant="success" subtitle={`${overview?.total_pages || 0} total`} />
          <StatCard title="Failed Pages" value={overview?.failed_pages || 0} icon={AlertCircle} variant="destructive" />
        </div>
      )}

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        {/* Users tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="pl-9"
            />
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No users found
                      </TableCell>
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
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{u.plan}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {u.pages_used} / {u.pages_limit || "∞"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{u.campaigns_count}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{u.websites_count}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(u.last_sign_in_at)}</TableCell>
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
            <Input
              placeholder="Search campaigns..."
              value={campaignSearch}
              onChange={(e) => setCampaignSearch(e.target.value)}
              className="pl-9"
            />
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
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No campaigns found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCampaigns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">{c.name}</TableCell>
                        <TableCell>{statusBadge(c.status)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {c.processed_rows ?? 0} / {c.total_rows ?? 0}
                        </TableCell>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.subscriptions || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No subscriptions found
                      </TableCell>
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
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{s.plan}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-sm tabular-nums">{s.pages_used} / {s.pages_limit}</span>
                              <Badge variant="outline" className={`text-xs ${
                                usagePercent >= 90 ? "text-destructive border-destructive/20" :
                                usagePercent >= 70 ? "text-yellow-600 border-yellow-500/20" :
                                "text-success border-success/20"
                              }`}>
                                {usagePercent}%
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(s.current_period_start)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(s.current_period_end)}</TableCell>
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
    </div>
  );
}
