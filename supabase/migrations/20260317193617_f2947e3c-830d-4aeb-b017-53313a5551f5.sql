
-- 1. Create workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create workspace_members table
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- 3. Add workspace_id to all tenant-scoped tables
ALTER TABLE public.websites ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.templates ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.campaigns ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.generated_pages ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_logs ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.sitemaps ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.indexing_requests ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.internal_link_settings ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.internal_links ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.store_generations ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.subscriptions ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 4. Migrate existing data: create a workspace per unique user_id
INSERT INTO public.workspaces (id, name, slug, owner_id)
SELECT DISTINCT ON (user_id)
  gen_random_uuid(),
  COALESCE(p.full_name, split_part(u.email, '@', 1), 'My Workspace') || '''s Workspace',
  LOWER(REPLACE(COALESCE(p.full_name, split_part(u.email, '@', 1), gen_random_uuid()::text), ' ', '-')) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8),
  u.id
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id;

-- 5. Create workspace_members for each owner
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT w.id, w.owner_id, 'owner'::workspace_role
FROM public.workspaces w;

-- 6. Update all existing records with their workspace_id
UPDATE public.websites SET workspace_id = w.id FROM public.workspaces w WHERE websites.user_id = w.owner_id;
UPDATE public.templates SET workspace_id = w.id FROM public.workspaces w WHERE templates.user_id = w.owner_id;
UPDATE public.campaigns SET workspace_id = w.id FROM public.workspaces w WHERE campaigns.user_id = w.owner_id;
UPDATE public.generated_pages SET workspace_id = w.id FROM public.workspaces w WHERE generated_pages.user_id = w.owner_id;
UPDATE public.campaign_logs SET workspace_id = w.id FROM public.workspaces w WHERE campaign_logs.user_id = w.owner_id;
UPDATE public.sitemaps SET workspace_id = w.id FROM public.workspaces w WHERE sitemaps.user_id = w.owner_id;
UPDATE public.indexing_requests SET workspace_id = w.id FROM public.workspaces w WHERE indexing_requests.user_id = w.owner_id;
UPDATE public.internal_link_settings SET workspace_id = w.id FROM public.workspaces w WHERE internal_link_settings.user_id = w.owner_id;
UPDATE public.store_generations SET workspace_id = w.id FROM public.workspaces w WHERE store_generations.user_id = w.owner_id;
UPDATE public.subscriptions SET workspace_id = w.id FROM public.workspaces w WHERE subscriptions.user_id = w.owner_id;
UPDATE public.profiles SET workspace_id = w.id FROM public.workspaces w WHERE profiles.user_id = w.owner_id;

-- 7. Enable RLS on new tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 8. Security definer function for workspace membership check
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_role(_user_id UUID, _workspace_id UUID)
RETURNS workspace_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.workspace_members
  WHERE user_id = _user_id AND workspace_id = _workspace_id
  LIMIT 1
$$;

-- 9. RLS policies for workspaces
CREATE POLICY "Users can view workspaces they belong to" ON public.workspaces
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), id));

CREATE POLICY "Owners can update their workspaces" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (public.get_workspace_role(auth.uid(), id) IN ('owner', 'admin'));

CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- 10. RLS policies for workspace_members
CREATE POLICY "Members can view workspace members" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can manage workspace members" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can update workspace members" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can delete workspace members" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (public.get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin'));

-- 11. Auto-create workspace on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id UUID;
  ws_slug TEXT;
BEGIN
  ws_slug := LOWER(REPLACE(COALESCE(split_part(NEW.email, '@', 1), 'workspace'), ' ', '-')) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);
  
  INSERT INTO public.workspaces (name, slug, owner_id)
  VALUES (
    COALESCE(split_part(NEW.email, '@', 1), 'My Workspace') || '''s Workspace',
    ws_slug,
    NEW.id
  )
  RETURNING id INTO new_workspace_id;
  
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_workspace
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_workspace();

-- 12. Create indexes for performance
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX idx_websites_workspace ON public.websites(workspace_id);
CREATE INDEX idx_templates_workspace ON public.templates(workspace_id);
CREATE INDEX idx_campaigns_workspace ON public.campaigns(workspace_id);
CREATE INDEX idx_generated_pages_workspace ON public.generated_pages(workspace_id);
