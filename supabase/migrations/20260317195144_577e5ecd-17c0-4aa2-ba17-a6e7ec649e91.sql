
-- DataSource: tracks CSV uploads or external data sources per campaign
CREATE TABLE public.data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'csv',
  file_name text,
  file_size bigint,
  row_count integer DEFAULT 0,
  headers jsonb DEFAULT '[]'::jsonb,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workspace data_sources"
  ON public.data_sources FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- Mapping: column-to-field mappings with optional transforms
CREATE TABLE public.mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  data_source_id uuid REFERENCES public.data_sources(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id),
  user_id uuid NOT NULL,
  source_column text NOT NULL,
  target_field text NOT NULL,
  transform_expression text,
  is_required boolean NOT NULL DEFAULT false,
  field_category text NOT NULL DEFAULT 'content',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workspace mappings"
  ON public.mappings FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- GenerationJob: tracks batch processing runs
CREATE TYPE public.generation_job_status AS ENUM ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled');

CREATE TABLE public.generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id),
  user_id uuid NOT NULL,
  status public.generation_job_status NOT NULL DEFAULT 'pending',
  total_rows integer NOT NULL DEFAULT 0,
  processed_rows integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  current_batch integer NOT NULL DEFAULT 0,
  batch_size integer NOT NULL DEFAULT 50,
  started_at timestamptz,
  completed_at timestamptz,
  error_log jsonb DEFAULT '[]'::jsonb,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workspace generation_jobs"
  ON public.generation_jobs FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- Enable realtime for generation_jobs progress tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_jobs;
