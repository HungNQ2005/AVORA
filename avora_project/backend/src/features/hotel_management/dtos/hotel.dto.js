'use strict';

const { z } = require('zod');

const optionalId = z.string().trim().min(1).max(100).nullable().optional();
const hotelIdParamsSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

const hotelListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  keyword: z.string().trim().max(120).optional(),
  search: z.string().trim().max(120).optional(),
  city_id: optionalId,
  district_id: optionalId,
  star_rating: z.coerce.number().int().min(1).max(5).optional(),
  status_cd: z.enum(['DRAFT', 'ACTIVE', 'MAINTENANCE', 'PENDING_APPROVAL']).optional(),
});

const hotelFields = {
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10000).nullable().optional(),
  address: z.string().trim().min(1).max(500),
  city_id: optionalId,
  district_id: optionalId,
  ward_id: optionalId,
  star_rating: z.coerce.number().int().min(1).max(5),
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180),
};

const createHotelSchema = z.object(hotelFields).superRefine((hotel, ctx) => {
  if (hotel.district_id && !hotel.city_id) {
    ctx.addIssue({ code: 'custom', path: ['city_id'], message: 'city_id is required when district_id is provided.' });
  }
  if (hotel.ward_id && !hotel.district_id) {
    ctx.addIssue({ code: 'custom', path: ['district_id'], message: 'district_id is required when ward_id is provided.' });
  }
});

const updateHotelSchema = z.object({
  name: hotelFields.name.optional(),
  description: hotelFields.description,
  address: hotelFields.address.optional(),
  city_id: optionalId,
  district_id: optionalId,
  ward_id: optionalId,
  star_rating: hotelFields.star_rating.optional(),
  lat: hotelFields.lat.optional(),
  lng: hotelFields.lng.optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided.',
});

module.exports = {
  hotelIdParamsSchema,
  hotelListQuerySchema,
  createHotelSchema,
  updateHotelSchema,
};
