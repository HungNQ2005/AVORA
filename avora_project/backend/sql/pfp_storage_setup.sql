-- ============================================================================
-- AVORA - Thiết lập Storage cho ảnh đại diện (bucket `pfp`)
-- Chạy file này 1 lần trong Supabase Dashboard -> SQL Editor.
-- ----------------------------------------------------------------------------
-- Lưu ý bảo mật:
--  * Ứng dụng dùng JWT riêng (không phải Supabase Auth) nên frontend upload bằng
--    anon key. Vì vậy cho phép role anon/authenticated INSERT vào bucket `pfp`.
--  * KHÔNG cấp UPDATE/DELETE cho anon: file cũ do backend (service_role) dọn dẹp.
--  * Giới hạn 2MB + chỉ cho phép ảnh được ép ở mức bucket (server-side).
--  * Backend chỉ chấp nhận URL dạng .../public/pfp/<userId>/... nên người dùng
--    không thể gán ảnh của người khác hay URL bên ngoài.
-- ============================================================================

-- 1. Tạo bucket public (hoặc cập nhật nếu đã tồn tại)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pfp',
  'pfp',
  true,
  2097152, -- 2MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = true,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Policies trên storage.objects
drop policy if exists "pfp_public_read" on storage.objects;
create policy "pfp_public_read"
  on storage.objects for select
  using (bucket_id = 'pfp');

drop policy if exists "pfp_client_insert" on storage.objects;
create policy "pfp_client_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'pfp');
