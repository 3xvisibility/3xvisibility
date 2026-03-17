import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Subscribes to generation_jobs realtime changes and fires
 * toast notifications + persists to the notifications table
 * when a job completes or fails.
 */
export function useJobNotifications() {
  const { toast } = useToast();
  const handledRef = useRef<Set<string>>(new Set());

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

          // Fetch campaign name for a better message
          let campaignName = "Unknown campaign";
          const { data: campaign } = await supabase
            .from("campaigns")
            .select("name")
            .eq("id", job.campaign_id)
            .maybeSingle();
          if (campaign?.name) campaignName = campaign.name;

          const isSuccess = job.status === "completed";
          const title = isSuccess
            ? `Generation completed`
            : `Generation failed`;
          const message = isSuccess
            ? `"${campaignName}" finished — ${job.success_count} pages generated successfully${job.error_count > 0 ? `, ${job.error_count} errors` : ""}.`
            : `"${campaignName}" failed after processing ${job.processed_rows}/${job.total_rows} rows.`;

          // Show toast
          toast({
            title,
            description: message,
            variant: isSuccess ? "default" : "destructive",
          });

          // Persist to notifications table
          await supabase.from("notifications").insert({
            user_id: job.user_id,
            title,
            message,
            type: isSuccess ? "success" : "error",
            campaign_id: job.campaign_id,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);
}
