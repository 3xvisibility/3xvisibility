CREATE POLICY "Authenticated read render-checks"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'render-checks');

CREATE POLICY "Authenticated write render-checks"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'render-checks');

CREATE POLICY "Authenticated update render-checks"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'render-checks');

CREATE POLICY "Authenticated delete render-checks"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'render-checks');