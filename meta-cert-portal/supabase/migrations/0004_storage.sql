-- ============================================================
-- 0004_storage.sql — Storage buckets and their policies
-- ============================================================

-- SECURITY: PDFs are private. Reads happen exclusively via signed URLs
-- generated server-side with the service role.
insert into storage.buckets (id, name, public)
  values ('resource-pdfs', 'resource-pdfs', false)
  on conflict (id) do nothing;

-- Public bucket for cover images (low-sensitivity learner-facing assets)
insert into storage.buckets (id, name, public)
  values ('track-covers', 'track-covers', true)
  on conflict (id) do nothing;

-- ----------------------------------------------------------------
-- resource-pdfs policies — admin write, no learner read (signed-URL only)
-- ----------------------------------------------------------------
drop policy if exists "pdfs_admin_write" on storage.objects;
create policy "pdfs_admin_write" on storage.objects
  for insert with check (
    bucket_id = 'resource-pdfs' and public.is_admin()
  );

drop policy if exists "pdfs_admin_update" on storage.objects;
create policy "pdfs_admin_update" on storage.objects
  for update using (bucket_id = 'resource-pdfs' and public.is_admin())
  with check (bucket_id = 'resource-pdfs' and public.is_admin());

drop policy if exists "pdfs_admin_delete" on storage.objects;
create policy "pdfs_admin_delete" on storage.objects
  for delete using (bucket_id = 'resource-pdfs' and public.is_admin());

-- SECURITY: no SELECT policy on resource-pdfs → reads require service role + signed URL.

-- ----------------------------------------------------------------
-- track-covers policies — admin write, public read (bucket is already public)
-- ----------------------------------------------------------------
drop policy if exists "covers_admin_write" on storage.objects;
create policy "covers_admin_write" on storage.objects
  for insert with check (
    bucket_id = 'track-covers' and public.is_admin()
  );

drop policy if exists "covers_admin_update" on storage.objects;
create policy "covers_admin_update" on storage.objects
  for update using (bucket_id = 'track-covers' and public.is_admin())
  with check (bucket_id = 'track-covers' and public.is_admin());

drop policy if exists "covers_admin_delete" on storage.objects;
create policy "covers_admin_delete" on storage.objects
  for delete using (bucket_id = 'track-covers' and public.is_admin());
