-- Lock down internal / privileged routines
DO $$
DECLARE
  keep text[] := ARRAY[
    'has_role','is_workspace_member','get_workspace_role','current_verified_email',
    'get_location_meta','log_security_event','get_campaign_csv_window',
    'get_template_rating_stats','campaign_limit_for_plan','template_limit_for_plan'
  ];
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    IF NOT (r.proname = ANY(keep)) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;
