CREATE OR REPLACE VIEW public.user_page_counts AS
SELECT user_id, count(*)::bigint AS pages_count
FROM public.generated_pages
WHERE user_id IS NOT NULL
GROUP BY user_id;

GRANT SELECT ON public.user_page_counts TO service_role;