'use strict';

const hotelService = require('./hotel_management.service');
const { sendSuccess } = require('../../utils/responseHelper');

const getHotels = async (req, res, next) => {
	try {
		const result = await hotelService.getHotels(req.validated.query, req.hotelAccess);
		return sendSuccess(res, 200, 'Hotels fetched successfully.', result);
	} catch (err) {
		return next(err);
	}
};

const getHotel = async (req, res, next) => {
	try {
		const hotel = await hotelService.getHotel(req.validated.params.id, req.hotelAccess);
		return sendSuccess(res, 200, 'Hotel fetched successfully.', hotel);
	} catch (err) {
		return next(err);
	}
};

const getVendors = async (req, res, next) => {
	try {
		const vendors = await hotelService.getVendors(req.hotelAccess);
		return sendSuccess(res, 200, 'Active Vendors fetched successfully.', vendors);
	} catch (err) {
		return next(err);
	}
};

const createHotel = async (req, res, next) => {
	try {
		const hotel = await hotelService.createHotel(req.validated.body, req.hotelAccess);
		const message = req.hotelAccess.isVendor
			? 'Hotel submitted for approval.'
			: 'Hotel created successfully.';
		return sendSuccess(res, 201, message, hotel);
	} catch (err) {
		return next(err);
	}
};

const updateHotel = async (req, res, next) => {
	try {
		const hotel = await hotelService.updateHotel(req.validated.params.id, req.validated.body, req.hotelAccess);
		return sendSuccess(res, 200, 'Hotel updated successfully.', hotel);
	} catch (err) {
		return next(err);
	}
};

const approveHotel = async (req, res, next) => {
	try {
		const hotel = await hotelService.approveHotel(req.validated.params.id, req.hotelAccess);
		return sendSuccess(res, 200, 'Hotel approved successfully.', hotel);
	} catch (err) {
		return next(err);
	}
};

const restoreHotel = async (req, res, next) => {
	try {
		const hotel = await hotelService.restoreHotel(req.validated.params.id, req.hotelAccess);
		return sendSuccess(res, 200, 'Hotel restored successfully.', hotel);
	} catch (err) {
		return next(err);
	}
};

const deleteHotel = async (req, res, next) => {
	try {
		const result = await hotelService.deleteHotel(req.validated.params.id, req.hotelAccess);
		return sendSuccess(res, 200, 'Hotel soft-deleted successfully.', result);
	} catch (err) {
		return next(err);
	}
};

const uploadHotelImage = async (req, res, next) => {
	try {
		const image = await hotelService.uploadHotelImage(req.validated.params.id, req.file, req.hotelAccess);
		return sendSuccess(res, 201, 'Hotel image uploaded successfully.', image);
	} catch (err) {
		return next(err);
	}
};

const deleteHotelImage = async (req, res, next) => {
	try {
		const result = await hotelService.deleteHotelImage(req.validated.params.id, req.validated.params.imageId, req.hotelAccess);
		return sendSuccess(res, 200, 'Hotel image deleted successfully.', result);
	} catch (err) {
		return next(err);
	}
};

const setHotelImageThumbnail = async (req, res, next) => {
	try {
		const result = await hotelService.setHotelImageThumbnail(req.validated.params.id, req.validated.params.imageId, req.hotelAccess);
		return sendSuccess(res, 200, 'Thumbnail updated successfully.', result);
	} catch (err) {
		return next(err);
	}
};

module.exports = { getHotels, getHotel, getVendors, createHotel, updateHotel, approveHotel, restoreHotel, deleteHotel, uploadHotelImage, deleteHotelImage, setHotelImageThumbnail };
