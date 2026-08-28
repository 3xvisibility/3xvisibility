do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='ai_images_public_read') then
    create policy "ai_images_public_read" on storage.objects for select using (bucket_id = 'ai-images');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='ai_images_user_insert') then
    create policy "ai_images_user_insert" on storage.objects for insert to authenticated
      with check (bucket_id = 'ai-images' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='ai_images_user_update') then
    create policy "ai_images_user_update" on storage.objects for update to authenticated
      using (bucket_id = 'ai-images' and (storage.foldername(name))[1] = auth.uid()::text)
      with check (bucket_id = 'ai-images' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='ai_images_user_delete') then
    create policy "ai_images_user_delete" on storage.objects for delete to authenticated
      using (bucket_id = 'ai-images' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;