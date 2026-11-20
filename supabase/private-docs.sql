-- Run once in Supabase > SQL Editor (after access-control.sql). Creates a PRIVATE storage bucket
-- that only the admin can read. Then upload the two PDFs in Storage > private-docs.
insert into storage.buckets (id, name, public) values ('private-docs', 'private-docs', false)
on conflict (id) do update set public = false;

drop policy if exists "admin reads private docs" on storage.objects;
create policy "admin reads private docs" on storage.objects for select to authenticated
  using (bucket_id = 'private-docs' and public.is_admin());
