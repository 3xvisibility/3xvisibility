-- Extend page_status enum with new lifecycle states
ALTER TYPE public.page_status ADD VALUE IF NOT EXISTS 'queued';
ALTER TYPE public.page_status ADD VALUE IF NOT EXISTS 'generating';
ALTER TYPE public.page_status ADD VALUE IF NOT EXISTS 'publishing';
ALTER TYPE public.page_status ADD VALUE IF NOT EXISTS 'done';

-- Enable realtime for live progress in the Generated Pages manager
ALTER TABLE public.generated_pages REPLICA IDENTITY FULL;
ALTER TABLE public.generation_jobs REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'generated_pages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.generated_pages';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'generation_jobs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_jobs';
  END IF;
END $$;