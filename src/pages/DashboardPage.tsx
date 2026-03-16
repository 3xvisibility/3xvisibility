import { Card, CardContent } from "@/components/ui/card";
import { Rocket, FileText, Globe, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const stats = [
  { label: "Total Campaigns", value: "12", icon: Rocket, change: "+2 this week" },
  { label: "Generated Pages", value: "1,284", icon: FileText, change: "+142 this week" },
  { label: "Connected Websites", value: "3", icon: Globe, change: "" },
  { label: "Success Rate", value: "98.2%", icon: TrendingUp, change: "+0.5%" },
];

const recentCampaigns = [
  { name: "Python Training Cities", status: "completed", pages: 42, date: "2026-03-14" },
  { name: "SEO Landing Pages", status: "processing", pages: 18, date: "2026-03-15" },
  { name: "Product Pages Batch", status: "draft", pages: 0, date: "2026-03-16" },
  { name: "Local Service Pages", status: "completed", pages: 156, date: "2026-03-12" },
];

const statusColors: Record<string, string> = {
  completed: "bg-success/10 text-success",
  processing: "bg-primary/10 text-primary",
  draft: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive",
  queued: "bg-accent text-accent-foreground",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Deploy data-driven content at scale.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="shadow-surface hover:shadow-surface-hover transition-shadow duration-150">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{stat.value}</div>
              {stat.change && (
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              )}
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
                  <th className="text-left p-4 font-medium text-muted-foreground">Pages</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map((campaign) => (
                  <tr key={campaign.name} className="border-b last:border-0 hover:bg-muted/50 transition-colors duration-150">
                    <td className="p-4 font-medium">{campaign.name}</td>
                    <td className="p-4">
                      <Badge variant="secondary" className={statusColors[campaign.status]}>
                        {campaign.status}
                      </Badge>
                    </td>
                    <td className="p-4 tabular-nums">{campaign.pages}</td>
                    <td className="p-4 tabular-nums text-muted-foreground">{campaign.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
