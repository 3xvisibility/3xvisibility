
-- Create storage bucket for AI-generated images
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-images', 'ai-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to ai-images bucket
CREATE POLICY "Authenticated users can upload AI images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ai-images');

-- Allow public read access to AI images
CREATE POLICY "Public read access for AI images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ai-images');
