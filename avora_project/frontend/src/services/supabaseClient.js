import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client = null;

/**
 * Trả về Supabase client dùng cho Storage (khởi tạo lười để thiếu cấu hình
 * không làm hỏng toàn bộ ứng dụng — chỉ báo lỗi khi người dùng thật sự upload).
 */
export const getSupabaseClient = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Chưa cấu hình Supabase cho giao diện. Vui lòng khai báo VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong frontend/.env rồi khởi động lại.'
    );
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
};
