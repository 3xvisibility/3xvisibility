
-- Update handle_new_user to create agency subscription with proper limits
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, company)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'company');
  INSERT INTO public.subscriptions (user_id, plan, pages_limit, ai_generations_limit)
  VALUES (NEW.id, 'agency', 10000, 5000);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

-- Update handle_new_user_workspace to use company name and agency plan
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_workspace_id UUID;
  ws_slug TEXT;
  ws_name TEXT;
  company_val TEXT;
BEGIN
  company_val := NEW.raw_user_meta_data ->> 'company';
  ws_name := COALESCE(NULLIF(TRIM(company_val), ''), split_part(NEW.email, '@', 1) || '''s Workspace');
  ws_slug := LOWER(REPLACE(COALESCE(NULLIF(TRIM(company_val), ''), split_part(NEW.email, '@', 1)), ' ', '-')) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);
  
  INSERT INTO public.workspaces (name, slug, owner_id, plan)
  VALUES (ws_name, ws_slug, NEW.id, 'agency')
  RETURNING id INTO new_workspace_id;
  
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');
  
  RETURN NEW;
END;
$function$;
