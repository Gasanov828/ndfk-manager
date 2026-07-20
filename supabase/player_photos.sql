-- Фото игроков (выполните в Supabase → SQL Editor)

alter table players
  add column if not exists photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'player-photos',
  'player-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "player_photos_public_read" on storage.objects;
create policy "player_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'player-photos');

drop policy if exists "player_photos_anon_insert" on storage.objects;
create policy "player_photos_anon_insert"
  on storage.objects for insert
  with check (bucket_id = 'player-photos');

drop policy if exists "player_photos_anon_update" on storage.objects;
create policy "player_photos_anon_update"
  on storage.objects for update
  using (bucket_id = 'player-photos')
  with check (bucket_id = 'player-photos');

drop policy if exists "player_photos_anon_delete" on storage.objects;
create policy "player_photos_anon_delete"
  on storage.objects for delete
  using (bucket_id = 'player-photos');
