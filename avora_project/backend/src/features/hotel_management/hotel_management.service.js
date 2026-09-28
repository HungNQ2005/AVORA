'use strict';

const hotelModel = require('./models/hotel.model');
const otpService = require('../otp/otp.service');

const hotelDeleteOtpPurpose = (hotelId) => `HOTEL_DELETE:${hotelId}`;

const createError = (message, statusCode) => {
	const err = new Error(message);
	err.statusCode = statusCode;
	return err;
};

const getHotels = async (filters, access) => {
	if (filters.status_cd && !['ACTIVE', 'PENDING_APPROVAL'].includes(filters.status_cd)) {
		throw createError('The deployed schema only represents Active and Pending Approval using is_deleted.', 400);
	}
	if (access.isVendor && filters.status_cd === 'PENDING_APPROVAL') {
		return {
			items: [],
			pagination: { page: Number(filters.page), page_size: 10, total_items: 0, total_pages: 0 },
		};
	}
	const page = Number(filters.page);
	const result = await hotelModel.listHotels({
		...filters,
		page,
		pageSize: 10,
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
		is_deleted: access.isVendor,
	});

	return hotelModel.toHotelDto(hotel);
};

const approveHotel = async (hotelId, access) => {
	if (!access.isSystemAdmin && !access.isBusinessManager) {
		throw createError('Only System Admin and Business Manager can approve or restore hotels.', 403);
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
	if (updates.star_rating !== undefined) {
		updates.star_quality = updates.star_rating;
		delete updates.star_rating;
	}

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

const requestDeleteOtp = async (hotelId, access) => {
	if (!access.isVendor) throw createError('OTP verification is only required for Vendor hotel deletion.', 400);
	const hotel = await hotelModel.getHotelById(hotelId, { ownerId: access.userId, includeDeleted: false });
	if (!hotel) throw createError('Approved hotel not found for this Vendor.', 404);
	return otpService.sendOtp({
		identifier: access.userId,
		email: access.email,
		purpose: hotelDeleteOtpPurpose(hotelId),
		expiryMinutes: 5,
	});
};

const deleteHotel = async (hotelId, { otp }, access) => {
	if (access.isVendor) {
		if (!otp) throw createError('A deletion OTP is required.', 400);
		await otpService.verifyOtp({
			identifier: access.userId,
			otp,
			purpose: hotelDeleteOtpPurpose(hotelId),
		});
	} else if (!access.isSystemAdmin && !access.isBusinessManager) {
		throw createError('You do not have permission to delete hotels.', 403);
	}

	const result = await hotelModel.softDeleteHotel({
		hotelId,
		access,
	});

	if (result?.status === 'not_found') throw createError('Hotel not found.', 404);
	if (result?.status === 'forbidden') throw createError('You are not assigned to this hotel.', 403);
	if (result?.status === 'active_bookings') {
		throw createError('Hotel cannot be deleted while it has Pending or Upcoming bookings, or rooms in an active operational state.', 409);
	}
	if (result?.status !== 'deleted') throw createError('Hotel could not be deleted.', 500);

	return { hotel_id: hotelId, is_deleted: true };
};

module.exports = { getHotels, getHotel, getVendors, createHotel, updateHotel, requestDeleteOtp, approveHotel, deleteHotel };
