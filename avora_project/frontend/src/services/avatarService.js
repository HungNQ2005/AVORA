import { getSupabaseClient } from './supabaseClient';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

export const AVATAR_BUCKET = 'pfp';
export const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const AVATAR_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Kiểm tra file ảnh trước khi upload.
 * @param {File} file
 * @returns {string|null} thông báo lỗi tiếng Việt, hoặc null nếu hợp lệ
 */
export const validateAvatarFile = (file) => {
  if (!file) return 'Vui lòng chọn một ảnh.';
  if (!AVATAR_ACCEPTED_TYPES.includes(file.type)) {
    return 'Chỉ chấp nhận ảnh định dạng JPG, PNG, WEBP hoặc GIF.';
  }
  if (file.size > AVATAR_MAX_SIZE_BYTES) {
    return 'Ảnh quá lớn. Dung lượng tối đa là 2MB.';
  }
  return null;
};

/**
 * Upload ảnh lên Supabase Storage (bucket `pfp`) và trả về publicUrl.
 * Tên file duy nhất: <userId>/<userId>_<timestamp>.<ext> để không bị ghi đè.
 * @param {File} file
 * @param {string} userId
 * @returns {Promise<string>} publicUrl
 */
export const uploadAvatarToStorage = async (file, userId) => {
  const validationError = validateAvatarFile(file);
  if (validationError) throw new Error(validationError);
  if (!userId) throw new Error('Không xác định được người dùng. Vui lòng đăng nhập lại.');

  const supabase = getSupabaseClient();
  const ext = MIME_TO_EXT[file.type] || 'jpg';
  const filePath = `${userId}/${userId}_${Date.now()}.${ext}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type });

    if (uploadError) {
      throw new Error(uploadError.message || 'Tải ảnh lên thất bại.');
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
    if (!data?.publicUrl) {
      throw new Error('Không lấy được đường dẫn ảnh sau khi tải lên.');
    }
    return data.publicUrl;
  } catch (err) {
    console.error('[Avatar] Upload thất bại:', err);
    throw new Error(err?.message ? `Tải ảnh lên thất bại: ${err.message}` : 'Tải ảnh lên thất bại.');
  }
};

/**
 * Gửi avatarUrl lên backend: PUT /api/users/avatar. Truyền null để xóa ảnh.
 * @param {string|null} avatarUrl
 * @returns {Promise<{ avatar_url: string|null }>}
 */
export const saveAvatarUrl = async (avatarUrl) => {
  try {
    const response = await authenticatedFetch(`${API_ENDPOINTS.USERS}/avatar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: avatarUrl }),
    });
    const json = await response.json().catch(() => ({}));

    if (!response.ok || json.status === 'error') {
      throw new Error(json.message || 'Không thể cập nhật ảnh đại diện.');
    }
    return json.data;
  } catch (err) {
    console.error('[Avatar] Lưu avatar_url thất bại:', err);
    throw new Error(err?.message || 'Không thể kết nối máy chủ để lưu ảnh đại diện.');
  }
};

/**
 * Upload ảnh mới rồi lưu URL vào hệ thống.
 */
export const updateAvatar = async (file, userId) => {
  const publicUrl = await uploadAvatarToStorage(file, userId);
  return saveAvatarUrl(publicUrl);
};

/**
 * Xóa ảnh đại diện (về lại ảnh chữ cái).
 */
export const removeAvatar = () => saveAvatarUrl(null);

