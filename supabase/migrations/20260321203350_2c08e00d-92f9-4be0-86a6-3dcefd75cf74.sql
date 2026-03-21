
-- Add 'readonly' value to the workspace_role enum
ALTER TYPE public.workspace_role ADD VALUE IF NOT EXISTS 'readonly';
