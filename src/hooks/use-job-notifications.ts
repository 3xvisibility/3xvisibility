import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface NotificationPrefs {
  job_completed?: boolean;
  job_failed?: boolean;
  usage_limit?: boolean;
}

/**
 * Subscribes to generation_jobs realtime changes and fires
 * toast notifications + persists to the notifications table
 * when a job completes or fails.
 * Respects user notification_preferences from the profiles table.
 */
export function useJobNotifications() {
  const { toast } = useToast();
  const handledRef = useRef<Set<string>>(new Set());
  const prefsRef = useRef<NotificationPrefs | null>(null);

  // Load notification preferences once
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      prefsRef.current = (data as any)?.notification_preferences ?? {
        job_completed: true,
        job_failed: true,
        usage_limit: true,
      };
    })();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("job-status-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "generation_jobs",
        },
        async (payload) => {
          const job = payload.new as {
            id: string;
            status: string;
            campaign_id: string;
            success_count: number;
            error_count: number;
            total_rows: number;
            processed_rows: number;
            user_id: string;
          };

          // Only act on terminal statuses
          if (job.status !== "completed" && job.status !== "failed") return;

          // Deduplicate (in case of multiple rapid updates)
          if (handledRef.current.has(job.id)) return;
          handledRef.current.add(job.id);

          const isSuccess = job.status === "completed";

          // Check notification preferences
          const prefs = prefsRef.current ?? { job_completed: true, job_failed: true };
          const prefKey = isSuccess ? "job_completed" : "job_failed";
          const shouldNotify = prefs[prefKey] !== false;

          // Fetch campaign name for a better message
          let campaignName = "Unknown campaign";
          const { data: campaign } = await supabase
            .from("campaigns")
            .select("name")
            .eq("id", job.campaign_id)
            .maybeSingle();
          if (campaign?.name) campaignName = campaign.name;

          const title = isSuccess
            ? `Generation completed`
            : `Generation failed`;
          const message = isSuccess
            ? `"${campaignName}" finished — ${job.success_count} pages generated successfully${job.error_count > 0 ? `, ${job.error_count} errors` : ""}.`
            : `"${campaignName}" failed after processing ${job.processed_rows}/${job.total_rows} rows.`;

          // Show toast only if user preference allows it
          if (shouldNotify) {
            toast({
              title,
              description: message,
              variant: isSuccess ? "default" : "destructive",
            });
          }

          // Always persist to notifications table regardless of toast preference
          await supabase.from("notifications").insert({
            user_id: job.user_id,
            title,
            message,
            type: isSuccess ? "success" : "error",
            campaign_id: job.campaign_id,
          });

          // Fire webhooks for campaign completion events
          try {
            const { data: campaignData } = await supabase
              .from("campaigns")
              .select("workspace_id")
              .eq("id", job.campaign_id)
              .maybeSingle();

            if (campaignData?.workspace_id) {
              await supabase.functions.invoke("fire-webhooks", {
                body: {
                  event: isSuccess ? "campaign.completed" : "campaign.failed",
                  campaign_id: job.campaign_id,
                  workspace_id: campaignData.workspace_id,
                  payload: {
                    campaign_name: campaignName,
                    success_count: job.success_count,
                    error_count: job.error_count,
                    total_rows: job.total_rows,
                    processed_rows: job.processed_rows,
                  },
                },
              });
            }
          } catch (webhookErr) {
            console.warn("Webhook fire failed:", webhookErr);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);
}
