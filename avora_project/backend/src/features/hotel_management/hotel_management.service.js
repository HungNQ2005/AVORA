'use strict';

const hotelModel = require('./models/hotel.model');

const createError = (message, statusCode) => {
	const err = new Error(message);
	err.statusCode = statusCode;
	return err;
};

const getHotels = async (filters, access) => {
	if (filters.status_cd && !['ACTIVE', 'PENDING'].includes(filters.status_cd)) {
		throw createError('status_cd must be either PENDING or ACTIVE.', 400);
	}

	const page = Number(filters.page);
	const result = await hotelModel.listHotels({
		...filters,
		page,
		pageSize: 10,
		// Vendors only ever see their own, non-deleted hotels (both PENDING and ACTIVE).
		// System Admin / Business Manager see every hotel, including soft-deleted ones.
		ownerId: access.isVendor ? access.userId : null,
		includeDeleted: !access.isVendor,
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
	const hotel = await hotelModel.getHotelById(hotelId, {
		ownerId: access.isVendor ? access.userId : null,
		includeDeleted: !access.isVendor,
	});
	if (!hotel) throw createError('Hotel not found.', 404);
	return hotelModel.toHotelDto(hotel);
};

const getVendors = async (access) => {
	if (!access.isSystemAdmin && !access.isBusinessManager) {
		throw createError('Only System Admin and Business Manager can assign hotel owners.', 403);
	}
	return hotelModel.listActiveVendors();
};

const createHotel = async (input, access) => {
	if (!access?.isVendor) {
		throw createError('Only Vendors can create hotels.', 403);
	}

	const hotel = await hotelModel.createHotel({
		owner_id: access.userId,
		name: input.name.trim(),
		description: input.description?.trim() || null,
		address: input.address.trim(),
		city_id: input.city_id || null,
		district_id: input.district_id || null,
		ward_id: input.ward_id || null,
		star_quality: input.star_quality,
		lat: input.lat,
		lng: input.lng,
		// Vendor submissions always start as PENDING and require staff approval.
		hotel_status: access.isVendor ? 'PENDING' : 'ACTIVE',
		is_deleted: false,
	});

	return hotelModel.toHotelDto(hotel);
};

const approveHotel = async (hotelId, access) => {
	if (!access.isSystemAdmin && !access.isBusinessManager) {
		throw createError('Only System Admin and Business Manager can approve hotels.', 403);
	}
	const hotel = await hotelModel.approveHotel(hotelId);
	if (!hotel) throw createError('Hotel not found, already active, or has been deleted.', 404);
	return hotelModel.toHotelDto(hotel);
};

const restoreHotel = async (hotelId, access) => {
	if (!access.isSystemAdmin && !access.isBusinessManager) {
		throw createError('Only System Admin and Business Manager can restore deleted hotels.', 403);
	}
	const hotel = await hotelModel.restoreHotel(hotelId);
	if (!hotel) throw createError('Deleted hotel not found.', 404);
	return hotelModel.toHotelDto(hotel);
};

const updateHotel = async (hotelId, input, access) => {
	const updates = { ...input };
	if (updates.owner_id !== undefined) {
		if (!access.isSystemAdmin && !access.isBusinessManager) {
			throw createError('Only System Admin and Business Manager can change hotel ownership.', 403);
		}
		if (!(await hotelModel.isActiveVendor(updates.owner_id))) {
			throw createError('owner_id must belong to an active Vendor account.', 400);
		}
	}
	if (updates.name !== undefined) updates.name = updates.name.trim();
	if (updates.address !== undefined) updates.address = updates.address.trim();
	if (updates.description !== undefined) updates.description = updates.description.trim() || null;
	const hotel = await hotelModel.updateHotel(hotelId, updates, {
		ownerId: access.isVendor ? access.userId : null,
		includeDeleted: !access.isVendor,
	});
	if (!hotel) throw createError('Hotel not found.', 404);
	const details = await hotelModel.getHotelById(hotel.hotel_id, {
		ownerId: access.isVendor ? access.userId : null,
		includeDeleted: !access.isVendor,
	});
	return hotelModel.toHotelDto(details || hotel);
};

const deleteHotel = async (hotelId, access) => {
	if (!access.isVendor && !access.isSystemAdmin && !access.isBusinessManager) {
		throw createError('You do not have permission to delete hotels.', 403);
	}

	const result = await hotelModel.softDeleteHotel({ hotelId, access });

	if (result?.status === 'not_found') throw createError('Hotel not found.', 404);
	if (result?.status === 'forbidden') throw createError('You are not assigned to this hotel.', 403);
	if (result?.status === 'active_hotel_locked') {
		throw createError('Only PENDING hotels can be self-deleted by a Vendor. Active hotels must be handled by System Admin or Business Manager.', 403);
	}
	if (result?.status === 'active_bookings') {
		throw createError('Hotel cannot be deleted while it has Pending or Upcoming bookings, or rooms in an active operational state.', 409);
	}
	if (result?.status !== 'deleted') throw createError('Hotel could not be deleted.', 500);

	return { hotel_id: hotelId, is_deleted: true };
};

const uploadHotelImage = async (hotelId, file, access) => {
	if (!access.isVendor && !access.isSystemAdmin && !access.isBusinessManager) {
		throw createError('You do not have permission to manage hotel images.', 403);
	}
	if (!file) throw createError('An image file is required.', 400);
	if (!file.mimetype?.startsWith('image/')) throw createError('Only image files are allowed.', 400);

	const image = await hotelModel.addHotelImage(hotelId, {
		buffer: file.buffer,
		mimeType: file.mimetype,
		originalName: file.originalname,
		isThumbnail: false,
	}, access);
	if (!image) throw createError('Hotel not found or you are not assigned to it.', 404);
	return image;
};

const deleteHotelImage = async (hotelId, imageId, access) => {
	if (!access.isVendor && !access.isSystemAdmin && !access.isBusinessManager) {
		throw createError('You do not have permission to manage hotel images.', 403);
	}
	const result = await hotelModel.deleteHotelImage(hotelId, imageId, access);
	if (result?.status === 'forbidden') throw createError('You are not assigned to this hotel.', 403);
	if (result?.status === 'not_found') throw createError('Image not found.', 404);
	return { image_id: imageId };
};

const setHotelImageThumbnail = async (hotelId, imageId, access) => {
	if (!access.isVendor && !access.isSystemAdmin && !access.isBusinessManager) {
		throw createError('You do not have permission to manage hotel images.', 403);
	}
	const result = await hotelModel.setHotelImageThumbnail(hotelId, imageId, access);
	if (result?.status === 'forbidden') throw createError('You are not assigned to this hotel.', 403);
	if (result?.status === 'not_found') throw createError('Image not found.', 404);
	return { image_id: imageId, is_thumbnail: true };
};

module.exports = { getHotels, getHotel, getVendors, createHotel, updateHotel, approveHotel, restoreHotel, deleteHotel, uploadHotelImage, deleteHotelImage, setHotelImageThumbnail };
