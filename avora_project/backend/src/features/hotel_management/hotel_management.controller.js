'use strict';

const hotelService = require('./hotel_management.service');
const { sendSuccess } = require('../../utils/responseHelper');

const getHotels = async (req, res, next) => {
	try {
		const result = await hotelService.getHotels(req.validated.query, req.hotelAccess);
		return sendSuccess(res, 200, 'Lấy danh sách khách sạn thành công.', result);
	} catch (err) {
		return next(err);
	}
};

const getHotel = async (req, res, next) => {
	try {
		const hotel = await hotelService.getHotel(req.validated.params.id, req.hotelAccess);
		return sendSuccess(res, 200, 'Lấy thông tin khách sạn thành công.', hotel);
	} catch (err) {
		return next(err);
	}
};

const createHotel = async (req, res, next) => {
	try {
		const hotel = await hotelService.createHotel(req.validated.body, req.hotelAccess);
		const message = req.hotelAccess.isVendor
			? 'Khách sạn đã được gửi để chờ phê duyệt.'
			: 'Tạo khách sạn thành công.';
		return sendSuccess(res, 201, message, hotel);
	} catch (err) {
		return next(err);
	}
};

const updateHotel = async (req, res, next) => {
	try {
		const hotel = await hotelService.updateHotel(req.validated.params.id, req.validated.body, req.hotelAccess);
		return sendSuccess(res, 200, 'Cập nhật thông tin khách sạn thành công.', hotel);
	} catch (err) {
		return next(err);
	}
};

const approveHotel = async (req, res, next) => {
	try {
		const hotel = await hotelService.approveHotel(req.validated.params.id, req.hotelAccess);
		return sendSuccess(res, 200, 'Phê duyệt khách sạn thành công.', hotel);
	} catch (err) {
		return next(err);
	}
};

const deleteHotel = async (req, res, next) => {
	try {
		const hotel = await hotelService.deleteHotel(req.validated.params.id, req.hotelAccess);
		return sendSuccess(res, 200, 'Ngừng hoạt động khách sạn thành công.', hotel);
	} catch (err) {
		return next(err);
	}
};

const uploadHotelImage = async (req, res, next) => {
	try {
		const image = await hotelService.uploadHotelImage(req.validated.params.id, req.file, req.hotelAccess);
		return sendSuccess(res, 201, 'Tải ảnh khách sạn lên thành công.', image);
	} catch (err) {
		return next(err);
	}
};

const deleteHotelImage = async (req, res, next) => {
	try {
		const result = await hotelService.deleteHotelImage(req.validated.params.id, req.validated.params.imageId, req.hotelAccess);
		return sendSuccess(res, 200, 'Xóa ảnh khách sạn thành công.', result);
	} catch (err) {
		return next(err);
	}
};

const setHotelImageThumbnail = async (req, res, next) => {
	try {
		const result = await hotelService.setHotelImageThumbnail(req.validated.params.id, req.validated.params.imageId, req.hotelAccess);
		return sendSuccess(res, 200, 'Cập nhật ảnh đại diện thành công.', result);
	} catch (err) {
		return next(err);
	}
};

module.exports = { getHotels, getHotel, createHotel, updateHotel, approveHotel, deleteHotel, uploadHotelImage, deleteHotelImage, setHotelImageThumbnail };
