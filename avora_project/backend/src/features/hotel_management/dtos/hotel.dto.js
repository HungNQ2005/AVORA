'use strict';

const { z } = require('zod');

const optionalId = z.string({ error: 'Mã dữ liệu phải là chuỗi.' })
  .trim()
  .min(1, { error: 'Mã dữ liệu không được để trống.' })
  .max(100, { error: 'Mã dữ liệu không được vượt quá 100 ký tự.' })
  .nullable()
  .optional();

const hotelName = z.string({ error: 'Tên khách sạn phải là chuỗi.' })
  .trim()
  .min(1, { error: 'Tên khách sạn không được để trống.' })
  .max(200, { error: 'Tên khách sạn không được vượt quá 200 ký tự.' });
const hotelDescription = z.string({ error: 'Mô tả phải là chuỗi.' })
  .trim()
  .max(10000, { error: 'Mô tả không được vượt quá 10.000 ký tự.' })
  .nullable()
  .optional();
const hotelAddress = z.string({ error: 'Địa chỉ phải là chuỗi.' })
  .trim()
  .min(1, { error: 'Địa chỉ không được để trống.' })
  .max(500, { error: 'Địa chỉ không được vượt quá 500 ký tự.' });
const hotelStarQuality = z.coerce.number({ error: 'Hạng sao phải là số hợp lệ.' })
  .int({ error: 'Hạng sao phải là số nguyên.' })
  .min(1, { error: 'Hạng sao phải từ 1 đến 5.' })
  .max(5, { error: 'Hạng sao phải từ 1 đến 5.' });
const latitude = z.coerce.number({ error: 'Vĩ độ phải là số hợp lệ.' })
  .finite({ error: 'Vĩ độ phải là số hữu hạn.' })
  .min(-90, { error: 'Vĩ độ phải trong khoảng từ -90 đến 90.' })
  .max(90, { error: 'Vĩ độ phải trong khoảng từ -90 đến 90.' });
const longitude = z.coerce.number({ error: 'Kinh độ phải là số hợp lệ.' })
  .finite({ error: 'Kinh độ phải là số hữu hạn.' })
  .min(-180, { error: 'Kinh độ phải trong khoảng từ -180 đến 180.' })
  .max(180, { error: 'Kinh độ phải trong khoảng từ -180 đến 180.' });

const hotelIdParamsSchema = z.object({
  id: z.string({ error: 'Mã khách sạn phải là chuỗi.' })
    .trim()
    .min(1, { error: 'Mã khách sạn không được để trống.' })
    .max(100, { error: 'Mã khách sạn không được vượt quá 100 ký tự.' }),
});

const hotelImageParamsSchema = z.object({
  id: z.string({ error: 'Mã khách sạn phải là chuỗi.' })
    .trim()
    .min(1, { error: 'Mã khách sạn không được để trống.' })
    .max(100, { error: 'Mã khách sạn không được vượt quá 100 ký tự.' }),
  imageId: z.string({ error: 'Mã hình ảnh phải là chuỗi.' })
    .trim()
    .min(1, { error: 'Mã hình ảnh không được để trống.' })
    .max(100, { error: 'Mã hình ảnh không được vượt quá 100 ký tự.' }),
});

const hotelListQuerySchema = z.object({
  page: z.coerce.number({ error: 'Số trang phải là số hợp lệ.' })
    .int({ error: 'Số trang phải là số nguyên.' })
    .min(1, { error: 'Số trang phải từ 1 trở lên.' })
    .default(1),
  keyword: z.string({ error: 'Từ khóa phải là chuỗi.' })
    .trim()
    .max(120, { error: 'Từ khóa không được vượt quá 120 ký tự.' })
    .optional(),
  search: z.string({ error: 'Từ khóa phải là chuỗi.' })
    .trim()
    .max(120, { error: 'Từ khóa không được vượt quá 120 ký tự.' })
    .optional(),
  city_id: optionalId,
  district_id: optionalId,
  star_quality: hotelStarQuality.optional(),
  status_cd: z.enum(['PENDING', 'ACTIVE', 'INACTIVE'], { error: 'Trạng thái khách sạn không hợp lệ.' }).optional(),
});

const hotelFields = {
  name: hotelName,
  description: hotelDescription,
  address: hotelAddress,
  city_id: optionalId,
  district_id: optionalId,
  ward_id: optionalId,
  star_quality: hotelStarQuality,
  lat: latitude,
  lng: longitude,
};

const createHotelSchema = z.object(hotelFields).superRefine((hotel, ctx) => {
  if (hotel.district_id && !hotel.city_id) {
    ctx.addIssue({ code: 'custom', path: ['city_id'], message: 'Vui lòng chọn tỉnh/thành phố khi đã chọn quận/huyện.' });
  }
  if (hotel.ward_id && !hotel.district_id) {
    ctx.addIssue({ code: 'custom', path: ['district_id'], message: 'Vui lòng chọn quận/huyện khi đã chọn phường/xã.' });
  }
});

const updateHotelSchema = z.object({
  name: hotelFields.name.optional(),
  description: hotelFields.description,
  address: hotelFields.address.optional(),
  city_id: optionalId,
  district_id: optionalId,
  ward_id: optionalId,
  star_quality: hotelFields.star_quality.optional(),
  lat: hotelFields.lat.optional(),
  lng: hotelFields.lng.optional(),
  hotel_status: z.enum(['PENDING', 'ACTIVE', 'INACTIVE'], { error: 'Trạng thái khách sạn không hợp lệ.' }).optional(),
}, {
  error: (issue) => issue.code === 'unrecognized_keys'
    ? 'Trường dữ liệu không được hỗ trợ.'
    : undefined,
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'Vui lòng cung cấp ít nhất một thông tin cần cập nhật.',
});

module.exports = {
  hotelIdParamsSchema,
  hotelImageParamsSchema,
  hotelListQuerySchema,
  createHotelSchema,
  updateHotelSchema,
};
