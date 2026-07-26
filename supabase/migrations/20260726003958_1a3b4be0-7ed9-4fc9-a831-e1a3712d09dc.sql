WITH stuck_campaigns AS (
  SELECT c.id,
         c.total_rows,
         c.failed_rows,
         COALESCE(count(gp.id) FILTER (WHERE gp.status <> 'failed'), 0) AS saved_pages
  FROM public.campaigns c
  LEFT JOIN public.generated_pages gp ON gp.campaign_id = c.id
  WHERE c.status IN ('processing', 'queued')
    AND c.generation_started_at IS NOT NULL
    AND c.created_at >= now() - interval '2 days'
  GROUP BY c.id, c.total_rows, c.failed_rows
  HAVING COALESCE(count(gp.id) FILTER (WHERE gp.status <> 'failed'), 0) >= COALESCE(c.total_rows, 0)
), fixed_campaigns AS (
  UPDATE public.campaigns c
  SET status = (CASE WHEN COALESCE(sc.failed_rows, 0) >= COALESCE(sc.total_rows, 0) THEN 'failed' ELSE 'completed' END)::public.campaign_status,
      processed_rows = COALESCE(sc.total_rows, sc.saved_pages),
      failed_rows = COALESCE(sc.failed_rows, 0),
      generation_completed_at = COALESCE(c.generation_completed_at, now()),
      is_paused = false
  FROM stuck_campaigns sc
  WHERE c.id = sc.id
  RETURNING c.id, c.total_rows, c.failed_rows
)
UPDATE public.generation_jobs gj
SET status = (CASE WHEN COALESCE(fc.failed_rows, 0) >= COALESCE(fc.total_rows, 0) THEN 'failed' ELSE 'completed' END)::public.generation_job_status,
    processed_rows = COALESCE(fc.total_rows, gj.processed_rows),
    success_count = GREATEST(0, COALESCE(fc.total_rows, gj.total_rows, 0) - COALESCE(fc.failed_rows, 0)),
    error_count = COALESCE(fc.failed_rows, 0),
    completed_at = COALESCE(gj.completed_at, now()),
    updated_at = now()
FROM fixed_campaigns fc
WHERE gj.campaign_id = fc.id
  AND gj.status IN ('running', 'pending', 'paused');