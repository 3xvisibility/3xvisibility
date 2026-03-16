import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Rocket, FileText, Globe, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const statusColors: Record<string, string> = {
  completed: "bg-success/10 text-success",
  processing: "bg-primary/10 text-primary",
  draft: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive",
  queued: "bg-accent text-accent-foreground",
};

export default function DashboardPage() {
  const { data: campaignCount = 0, isLoading: loadingCampaigns } = useQuery({
    queryKey: ["dashboard-campaign-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("campaigns").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: pageCount = 0, isLoading: loadingPages } = useQuery({
    queryKey: ["dashboard-page-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("generated_pages").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: websiteCount = 0, isLoading: loadingWebsites } = useQuery({
    queryKey: ["dashboard-website-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("websites").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: recentCampaigns = [], isLoading: loadingRecent } = useQuery({
    queryKey: ["dashboard-recent-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, status, processed_rows, total_rows, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingCampaigns || loadingPages || loadingWebsites;

  const stats = [
    { label: "Total Campaigns", value: campaignCount, icon: Rocket },
    { label: "Generated Pages", value: pageCount, icon: FileText },
    { label: "Connected Websites", value: websiteCount, icon: Globe },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Deploy data-driven content at scale.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-surface hover:shadow-surface-hover transition-shadow duration-150">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
                {isLoading ? <Skeleton className="h-8 w-16" /> : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-display-sm mb-4">Recent Campaigns</h2>
        <Card className="shadow-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-muted-foreground">Campaign</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Progress</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {loadingRecent ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    </tr>
                  ))
                ) : recentCampaigns.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No campaigns yet.</td></tr>
                ) : (
                  recentCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors duration-150">
                      <td className="p-4 font-medium">{campaign.name}</td>
                      <td className="p-4">
                        <Badge variant="secondary" className={statusColors[campaign.status]}>
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="p-4 tabular-nums">{campaign.processed_rows || 0}/{campaign.total_rows || 0}</td>
                      <td className="p-4 tabular-nums text-muted-foreground">{new Date(campaign.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
