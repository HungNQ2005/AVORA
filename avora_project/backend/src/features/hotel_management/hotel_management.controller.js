'use strict';

const hotelService = require('./hotel_management.service');
const { sendSuccess } = require('../../utils/responseHelper');

const getHotels = async (req, res, next) => {
	try {
		const result = await hotelService.getHotels(req.query, req.hotelAccess);
		return sendSuccess(res, 200, 'Hotels fetched successfully.', result);
	} catch (err) {
		return next(err);
	}
};

const getHotel = async (req, res, next) => {
	try {
		const hotel = await hotelService.getHotel(req.params.id, req.hotelAccess);
		return sendSuccess(res, 200, 'Hotel fetched successfully.', hotel);
	} catch (err) {
		return next(err);
	}
};

const createHotel = async (req, res, next) => {
	try {
		const hotel = await hotelService.createHotel(req.body, req.hotelAccess);
		return sendSuccess(res, 201, 'Hotel created successfully as Draft.', hotel);
	} catch (err) {
		return next(err);
	}
};

const updateHotel = async (req, res, next) => {
	try {
		const hotel = await hotelService.updateHotel(req.params.id, req.body, req.hotelAccess);
		return sendSuccess(res, 200, 'Hotel updated successfully.', hotel);
	} catch (err) {
		return next(err);
	}
};

const publishHotel = async (req, res, next) => {
	try {
		const hotel = await hotelService.publishHotel(req.validated.params.id, req.hotelAccess);
		return sendSuccess(res, 200, 'Hotel published successfully.', hotel);
	} catch (err) {
		return next(err);
	}
};

const deleteHotel = async (req, res, next) => {
	try {
		const result = await hotelService.deleteHotel(req.params.id, req.hotelAccess);
		return sendSuccess(res, 200, 'Hotel soft-deleted successfully.', result);
	} catch (err) {
		return next(err);
	}
};

module.exports = { getHotels, getHotel, createHotel, updateHotel, publishHotel, deleteHotel };
