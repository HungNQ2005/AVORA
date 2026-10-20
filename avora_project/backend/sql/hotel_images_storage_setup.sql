-- AVORA - Supabase Storage setup for hotel images.
-- Run in Supabase Dashboard -> SQL Editor.
-- The backend uploads and deletes with SUPABASE_SERVICE_ROLE_KEY. Do not grant
-- anon/authenticated INSERT or DELETE policies for this bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hotel-images',
  'hotel-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];