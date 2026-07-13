-- 1. affiliate_links: add missing DELETE policy so users can remove their own links
CREATE POLICY "Users can delete own affiliate links"
ON public.affiliate_links
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2. template_ratings: restrict row visibility to the rating's owner
DROP POLICY IF EXISTS "Anyone can view template ratings" ON public.template_ratings;

CREATE POLICY "Users can view own ratings"
ON public.template_ratings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Aggregate ratings exposed without user identity so the marketplace can still
-- display average score + review count per template.
CREATE OR REPLACE FUNCTION public.get_template_rating_stats()
RETURNS TABLE (shared_template_id uuid, avg_rating numeric, rating_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shared_template_id,
         round(avg(rating)::numeric, 1) AS avg_rating,
         count(*) AS rating_count
  FROM public.template_ratings
  GROUP BY shared_template_id
$$;

GRANT EXECUTE ON FUNCTION public.get_template_rating_stats() TO authenticated, anon;