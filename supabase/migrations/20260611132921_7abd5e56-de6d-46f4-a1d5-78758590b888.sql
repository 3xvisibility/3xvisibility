CREATE OR REPLACE FUNCTION public.template_limit_for_plan(_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _plan
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 10
    WHEN 'pro' THEN -1
    WHEN 'agency' THEN -1
    ELSE 1
  END
$$;

CREATE OR REPLACE FUNCTION public.enforce_template_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_limit integer;
  v_count integer;
BEGIN
  SELECT plan INTO v_plan
  FROM public.subscriptions
  WHERE user_id = NEW.user_id
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  v_plan := COALESCE(v_plan, 'free');
  v_limit := public.template_limit_for_plan(v_plan);

  IF v_limit >= 0 THEN
    SELECT count(*) INTO v_count
    FROM public.templates
    WHERE user_id = NEW.user_id;

    IF v_count >= v_limit THEN
      RAISE EXCEPTION 'Plan limit reached: your % plan allows % template(s). Upgrade to add more.', v_plan, v_limit
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_template_limit_trigger ON public.templates;
CREATE TRIGGER enforce_template_limit_trigger
BEFORE INSERT ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.enforce_template_limit();