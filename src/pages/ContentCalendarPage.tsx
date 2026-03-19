import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, getDay, isToday } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, CalendarIcon, Rocket, Clock, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Campaign = Tables<"campaigns">;

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  queued: "bg-amber-500/15 text-amber-600",
  processing: "bg-primary/15 text-primary",
  completed: "bg-emerald-500/15 text-emerald-600",
  failed: "bg-destructive/15 text-destructive",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ContentCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns-calendar", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month
  const startPadding = getDay(monthStart);
  const paddedDays: (Date | null)[] = [
    ...Array(startPadding).fill(null),
    ...daysInMonth,
  ];
  // Pad end to fill last row
  while (paddedDays.length % 7 !== 0) paddedDays.push(null);

  // Map campaigns to dates
  const campaignsByDate = useMemo(() => {
    const map = new Map<string, Campaign[]>();
    const filtered = typeFilter === "all" ? campaigns : campaigns.filter(c => c.campaign_type === typeFilter);

    filtered.forEach((c) => {
      const dates: string[] = [];
      // Show on created_at
      dates.push(format(new Date(c.created_at), "yyyy-MM-dd"));
      // Show on scheduled_at if present
      if (c.scheduled_at) dates.push(format(new Date(c.scheduled_at), "yyyy-MM-dd"));
      // Show on generation_started_at
      if (c.generation_started_at) dates.push(format(new Date(c.generation_started_at), "yyyy-MM-dd"));
      // Show on generation_completed_at
      if (c.generation_completed_at) dates.push(format(new Date(c.generation_completed_at), "yyyy-MM-dd"));

      const uniqueDates = [...new Set(dates)];
      uniqueDates.forEach((d) => {
        if (!map.has(d)) map.set(d, []);
        const arr = map.get(d)!;
        if (!arr.find(existing => existing.id === c.id)) arr.push(c);
      });
    });
    return map;
  }, [campaigns, typeFilter]);

  // Summary stats
  const thisMonthCampaigns = campaigns.filter((c) => {
    const d = new Date(c.created_at);
    return isSameMonth(d, currentMonth);
  });
  const scheduledCount = campaigns.filter(c => c.scheduled_at && new Date(c.scheduled_at) > new Date()).length;
  const recurringCount = campaigns.filter(c => c.recurring_schedule).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">Visualize your campaign schedule and timelines</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "This Month", value: thisMonthCampaigns.length, icon: CalendarIcon },
          { label: "Total Campaigns", value: campaigns.length, icon: Rocket },
          { label: "Scheduled", value: scheduledCount, icon: Clock },
          { label: "Recurring", value: recurringCount, icon: RotateCcw },
        ].map((s) => (
          <Card key={s.label} className="shadow-surface">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold tabular-nums">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar Controls */}
      <Card className="shadow-surface">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[180px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-xs ml-2" onClick={() => setCurrentMonth(new Date())}>
                Today
              </Button>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="seo">SEO</SelectItem>
                <SelectItem value="sea">SEA</SelectItem>
                <SelectItem value="geo">GEO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <Skeleton className="h-[500px] w-full rounded-lg" />
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-7 bg-muted/50">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="p-2 text-center text-xs font-semibold text-muted-foreground border-b border-border">
                    {day}
                  </div>
                ))}
              </div>

              {/* Cells */}
              <div className="grid grid-cols-7">
                {paddedDays.map((day, i) => {
                  if (!day) {
                    return <div key={`pad-${i}`} className="min-h-[100px] bg-muted/20 border-b border-r border-border" />;
                  }

                  const dateKey = format(day, "yyyy-MM-dd");
                  const dayCampaigns = campaignsByDate.get(dateKey) || [];
                  const today = isToday(day);

                  return (
                    <div
                      key={dateKey}
                      className={cn(
                        "min-h-[100px] p-1.5 border-b border-r border-border transition-colors",
                        today && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                        !isSameMonth(day, currentMonth) && "opacity-40"
                      )}
                    >
                      <div className={cn(
                        "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                        today && "bg-primary text-primary-foreground"
                      )}>
                        {format(day, "d")}
                      </div>
                      <div className="space-y-0.5 max-h-[70px] overflow-y-auto">
                        {dayCampaigns.slice(0, 3).map((c) => {
                          const isScheduled = c.scheduled_at && isSameDay(new Date(c.scheduled_at), day);
                          const isCompleted = c.generation_completed_at && isSameDay(new Date(c.generation_completed_at), day);
                          const eventLabel = isCompleted ? "✓" : isScheduled ? "⏰" : "•";

                          return (
                            <TooltipProvider key={c.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={cn(
                                    "text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-default",
                                    statusColors[c.status] || "bg-muted text-muted-foreground"
                                  )}>
                                    {eventLabel} {c.name}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-[200px]">
                                  <p className="font-medium text-xs">{c.name}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Type: {((c as any).campaign_types?.length ? (c as any).campaign_types : [c.campaign_type]).join("+").toUpperCase()} · Status: {c.status}
                                  </p>
                                  {c.scheduled_at && (
                                    <p className="text-[10px] text-muted-foreground">
                                      Scheduled: {format(new Date(c.scheduled_at), "PPp")}
                                    </p>
                                  )}
                                  {c.recurring_schedule && (
                                    <p className="text-[10px] text-primary">🔁 Recurring</p>
                                  )}
                                  <p className="text-[10px] text-muted-foreground">
                                    Rows: {c.processed_rows}/{c.total_rows}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                        {dayCampaigns.length > 3 && (
                          <div className="text-[9px] text-muted-foreground text-center">
                            +{dayCampaigns.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming scheduled */}
      {(() => {
        const upcoming = campaigns
          .filter(c => c.scheduled_at && new Date(c.scheduled_at) > new Date())
          .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
          .slice(0, 5);

        if (!upcoming.length) return null;

        return (
          <Card className="shadow-surface">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Upcoming Scheduled Campaigns</h3>
              <div className="space-y-2">
                {upcoming.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(c.scheduled_at!), "PPp")}
                          {c.recurring_schedule && " · 🔁 Recurring"}
                        </p>
                      </div>
                    </div>
                    {((c as any).campaign_types?.length ? (c as any).campaign_types : [c.campaign_type]).map((t: string) => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t.toUpperCase()}</Badge>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
