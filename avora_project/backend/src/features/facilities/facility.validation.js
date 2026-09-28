'use strict';

const allowedFields = new Set(['facility_name', 'name_vi', 'type', 'icon']);
const facilityTypeIcons = Object.freeze({
  INTERNET: 'wifi-icon',
  POOL: 'pool-icon',
  FOOD: 'food-icon',
  PARKING: 'parking-icon',
  SERVICE: 'service-icon',
  GYM: 'gym-icon',
  RESTAURANT: 'restaurant-icon',
  SPA: 'spa-icon',
});
const allowedFacilityTypes = new Set(Object.keys(facilityTypeIcons));
const allowedFacilityIcons = new Set(Object.values(facilityTypeIcons));

const hasControlCharacters = (value) => [...value].some((character) => {
  const code = character.charCodeAt(0);
  return code <= 0x1f || code === 0x7f;
});

const validateTextField = (value, field, maxLength) => {
  if (typeof value !== 'string') {
    return `${field} phải là chuỗi ký tự.`;
  }

  const normalized = value.trim();
  if (!normalized) {
    return `${field} không được để trống.`;
  }
  if (normalized.length > maxLength) {
    return `${field} không được vượt quá ${maxLength} ký tự.`;
  }
  if (hasControlCharacters(normalized)) {
    return `${field} chứa ký tự không hợp lệ.`;
  }

  return null;
};

const validateFacilityPayload = (body, { partial = false } = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Dữ liệu tiện ích không hợp lệ.' };
  }

  const unsupportedFields = Object.keys(body).filter((field) => !allowedFields.has(field));
  if (unsupportedFields.length) {
    return { error: `Trường dữ liệu không được hỗ trợ: ${unsupportedFields.join(', ')}.` };
  }

  const hasName = body.facility_name !== undefined || body.name_vi !== undefined;
  const hasType = body.type !== undefined;
  const hasIcon = body.icon !== undefined;
  if (partial && !hasName && !hasType && !hasIcon) {
    return { error: 'Vui lòng cung cấp ít nhất một thông tin cần cập nhật.' };
  }
  if (!partial && !hasName) {
    return { error: 'Tên tiện ích không được để trống.' };
  }

  const payload = {};
  if (hasName) {
    const facilityNameError = body.facility_name === undefined
      ? null
      : validateTextField(body.facility_name, 'Tên tiện ích', 255);
    const localizedNameError = body.name_vi === undefined
      ? null
      : validateTextField(body.name_vi, 'Tên tiện ích', 255);
    if (facilityNameError || localizedNameError) {
      return { error: facilityNameError || localizedNameError };
    }

    const facilityName = (body.facility_name ?? body.name_vi).trim();
    const localizedName = body.name_vi?.trim();
    if (localizedName && body.facility_name && localizedName !== facilityName) {
      return { error: 'Tên tiện ích và tên tiếng Việt phải thống nhất.' };
    }
    payload.facility_name = facilityName;
  }

  if (hasType) {
    const error = validateTextField(body.type, 'Loại tiện ích', 100);
    if (error) return { error };
    payload.type = body.type.trim().toUpperCase();
    if (!allowedFacilityTypes.has(payload.type)) {
      return { error: 'Loại tiện ích không nằm trong danh mục được hỗ trợ.' };
    }
  }

  if (hasIcon) {
    const error = validateTextField(body.icon, 'Biểu tượng', 100);
    if (error) return { error };
    payload.icon = body.icon.trim();
    if (!allowedFacilityIcons.has(payload.icon)) {
      return { error: 'Biểu tượng tiện ích không nằm trong danh mục được hỗ trợ.' };
    }
  }

  if (!partial && !hasType) {
    payload.type = 'SERVICE';
  }
  if (payload.type && payload.icon && facilityTypeIcons[payload.type] !== payload.icon) {
    return { error: 'Loại tiện ích và biểu tượng không tương ứng.' };
  }
  if (partial && hasIcon && !hasType) {
    return { error: 'Khi thay đổi biểu tượng, phải cung cấp loại tiện ích tương ứng.' };
  }
  if (payload.type) {
    payload.icon = facilityTypeIcons[payload.type];
  }

  return { payload };
};

module.exports = {
  allowedFacilityTypes,
  facilityTypeIcons,
  validateFacilityPayload,
};
