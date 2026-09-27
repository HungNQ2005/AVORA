'use strict';

const hotelModel = require('./models/hotel.model');

const HOTEL_STATUS = new Set(['DRAFT', 'ACTIVE', 'MAINTENANCE', 'PENDING_APPROVAL']);

const createError = (message, statusCode) => {
	const err = new Error(message);
	err.statusCode = statusCode;
	return err;
};

const assertHotelStatus = (status) => {
	if (!HOTEL_STATUS.has(status)) {
		throw createError('status_cd must be DRAFT, ACTIVE, MAINTENANCE, or PENDING_APPROVAL.', 400);
	}
};

const getHotels = async (filters, access) => {
	const page = Number(filters.page);
	const result = await hotelModel.listHotels({
		...filters,
		page,
		pageSize: 10,
		ownerId: access.isSystemAdmin ? null : access.userId,
	});

	return {
		items: result.items.map(hotelModel.toHotelDto),
		pagination: {
			page,
			page_size: 10,
			total_items: result.total,
			total_pages: Math.ceil(result.total / 10),
		},
	};
};

const getHotel = async (hotelId, access) => {
	const hotel = await hotelModel.getHotelById(hotelId, access.isSystemAdmin ? null : access.userId);
	if (!hotel) throw createError('Hotel not found.', 404);
	return hotelModel.toHotelDto(hotel);
};

const createHotel = async (input, access) => {
	const hotel = await hotelModel.createHotel({
		owner_id: access.userId,
		name: input.name.trim(),
		description: input.description?.trim() || null,
		address: input.address.trim(),
		city_id: input.city_id || null,
		district_id: input.district_id || null,
		ward_id: input.ward_id || null,
		star_quality: input.star_rating,
		lat: input.lat,
		lng: input.lng,
		status_cd: 'DRAFT',
		is_deleted: false,
	});

	const details = await hotelModel.getHotelById(hotel.hotel_id, access.isSystemAdmin ? null : access.userId);
	return hotelModel.toHotelDto(details || hotel);
};

const publishHotel = async (hotelId, access) => {
	const hotel = await hotelModel.publishHotel(hotelId, access.isSystemAdmin ? null : access.userId);
	if (!hotel) throw createError('Hotel not found or it is not in Draft status.', 404);
	const details = await hotelModel.getHotelById(hotel.hotel_id, access.isSystemAdmin ? null : access.userId);
	return hotelModel.toHotelDto(details || hotel);
};

const updateHotel = async (hotelId, input, access) => {
	const updates = { ...input };
	if (updates.name !== undefined) updates.name = updates.name.trim();
	if (updates.address !== undefined) updates.address = updates.address.trim();
	if (updates.description !== undefined) updates.description = updates.description.trim() || null;
	if (updates.star_rating !== undefined) {
		updates.star_quality = updates.star_rating;
		delete updates.star_rating;
	}

	const hotel = await hotelModel.updateHotel(hotelId, updates, access.isSystemAdmin ? null : access.userId);
	if (!hotel) throw createError('Hotel not found.', 404);
	const details = await hotelModel.getHotelById(hotel.hotel_id, access.isSystemAdmin ? null : access.userId);
	return hotelModel.toHotelDto(details || hotel);
};

const deleteHotel = async (hotelId, access) => {
	const result = await hotelModel.softDeleteHotel({
		hotelId,
		actorUserId: access.userId,
		isSystemAdmin: access.isSystemAdmin,
	});

	if (result?.status === 'not_found') throw createError('Hotel not found.', 404);
	if (result?.status === 'forbidden') throw createError('You are not assigned to this hotel.', 403);
	if (result?.status === 'active_bookings') {
		throw createError('Hotel cannot be deleted while it has Pending or Upcoming bookings, or rooms in an active operational state.', 409);
	}
	if (result?.status !== 'deleted') throw createError('Hotel could not be deleted.', 500);

	return { hotel_id: hotelId, is_deleted: true };
};

module.exports = { getHotels, getHotel, createHotel, updateHotel, publishHotel, deleteHotel };
