'use strict';

const hotelModel = require('./models/hotel.model');

const createError = (message, statusCode) => {
	const err = new Error(message);
	err.statusCode = statusCode;
	return err;
};

const getHotels = async (filters, access) => {
	const page = Number(filters.page);
	const result = await hotelModel.listHotels({
		...filters,
		page,
		pageSize: 10,
		ownerId: access.isVendor ? access.userId : null,
		includeDeleted: Boolean(access.isSystemAdmin),
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
		includeDeleted: Boolean(access.isSystemAdmin),
	});
	if (!hotel) throw createError('Không tìm thấy khách sạn.', 404);
	return hotelModel.toHotelDto(hotel);
};

const createHotel = async (input, access) => {
	if (!access?.isVendor) {
		throw createError('Chỉ Nhà cung cấp mới có quyền tạo khách sạn.', 403);
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
		hotel_status: 'PENDING',
		is_deleted: false,
	});

	return hotelModel.toHotelDto(hotel);
};

const approveHotel = async (hotelId, access) => {
	if (!access.isSystemAdmin && !access.isBusinessManager) {
		throw createError('Chỉ Quản trị viên hệ thống và Quản lý doanh nghiệp mới có quyền phê duyệt khách sạn.', 403);
	}
	const hotel = await hotelModel.approveHotel(hotelId);
	if (!hotel) throw createError('Không tìm thấy khách sạn, khách sạn đã hoạt động hoặc đã bị xóa.', 404);
	return hotelModel.toHotelDto(hotel);
};

const updateHotel = async (hotelId, input, access) => {
	const updates = { ...input };
	const isStaff = access.isSystemAdmin || access.isBusinessManager;
	if (!access.isVendor && !isStaff) {
		throw createError('Bạn không có quyền cập nhật khách sạn.', 403);
	}
	if (updates.owner_id !== undefined) {
		throw createError('Không thể thay đổi chủ sở hữu khách sạn.', 403);
	}
	const hotel = await hotelModel.getHotelById(hotelId, {
		ownerId: access.isVendor ? access.userId : null,
		includeDeleted: Boolean(access.isSystemAdmin),
	});
	if (!hotel) throw createError('Không tìm thấy khách sạn.', 404);

	const informationFields = ['name', 'description', 'address', 'city_id', 'district_id', 'ward_id', 'star_quality', 'lat', 'lng'];
	if (isStaff && informationFields.some((field) => updates[field] !== undefined)) {
		throw createError('Nhân viên chỉ được phép cập nhật trạng thái khách sạn.', 403);
	}
	if (updates.hotel_status !== undefined) {
		if (access.isVendor && (updates.hotel_status !== 'PENDING' || hotel.hotel_status !== 'INACTIVE')) {
			throw createError('Nhà cung cấp chỉ có thể yêu cầu mở lại khách sạn đang ngừng hoạt động.', 403);
		}
		if (access.isVendor && Object.keys(updates).length !== 1) {
			throw createError('Vui lòng gửi yêu cầu mở lại riêng, không kèm thông tin cập nhật.', 400);
		}
		if (isStaff && updates.hotel_status === 'ACTIVE' && hotel.hotel_status !== 'PENDING') {
			throw createError('Chỉ khách sạn đang chờ duyệt mới có thể được phê duyệt.', 403);
		}
		if (isStaff && updates.hotel_status === 'PENDING') {
			throw createError('Chỉ Nhà cung cấp mới có thể yêu cầu mở lại khách sạn.', 403);
		}
	}
	if (updates.name !== undefined) updates.name = updates.name.trim();
	if (updates.address !== undefined) updates.address = updates.address.trim();
	if (updates.description !== undefined) updates.description = updates.description.trim() || null;
	const updateOptions = {
		ownerId: access.isVendor ? access.userId : null,
		includeDeleted: Boolean(access.isSystemAdmin),
		expectedStatus: updates.hotel_status !== undefined ? hotel.hotel_status : null,
	};
	const updatedHotel = updates.hotel_status === 'INACTIVE'
		? await hotelModel.deactivateHotel({ hotelId, access, options: updateOptions })
		: await hotelModel.updateHotel(hotelId, updates, updateOptions);
	if (updatedHotel?.status === 'active_bookings') {
		throw createError('Không thể ngừng hoạt động khách sạn khi còn đặt phòng đang chờ, sắp diễn ra hoặc phòng đang được sử dụng.', 409);
	}
	if (!updatedHotel) throw createError('Không tìm thấy khách sạn hoặc trạng thái đã thay đổi. Vui lòng tải lại trang và thử lại.', 404);
	const details = await hotelModel.getHotelById(hotelId, updateOptions);
	return hotelModel.toHotelDto(details || updatedHotel);
};

const deleteHotel = async (hotelId, access) => {
	if (!access.isVendor) throw createError('Chỉ Nhà cung cấp mới có thể ngừng hoạt động khách sạn bằng thao tác này.', 403);
	const hotel = await hotelModel.deactivateHotel({
		hotelId,
		access,
		options: { ownerId: access.userId, includeDeleted: false },
	});
	if (!hotel) throw createError('Không tìm thấy khách sạn hoặc bạn không được phân công quản lý khách sạn này.', 404);
	if (hotel.status === 'active_bookings') {
		throw createError('Không thể ngừng hoạt động khách sạn khi còn đặt phòng đang chờ, sắp diễn ra hoặc phòng đang được sử dụng.', 409);
	}
	const details = await hotelModel.getHotelById(hotelId, { ownerId: access.userId });
	return hotelModel.toHotelDto(details || hotel);
};

const uploadHotelImage = async (hotelId, file, access) => {
	if (!access.isVendor) throw createError('Chỉ Nhà cung cấp sở hữu khách sạn mới được quản lý hình ảnh.', 403);
	if (!file) throw createError('Vui lòng chọn tệp hình ảnh.', 400);
	if (!file.mimetype?.startsWith('image/')) throw createError('Chỉ chấp nhận tệp hình ảnh.', 400);

	const image = await hotelModel.addHotelImage(hotelId, {
		buffer: file.buffer,
		mimeType: file.mimetype,
		originalName: file.originalname,
		isThumbnail: false,
	}, access);
	if (!image) throw createError('Không tìm thấy khách sạn hoặc bạn không được phân công quản lý khách sạn này.', 404);
	return image;
};

const deleteHotelImage = async (hotelId, imageId, access) => {
	if (!access.isVendor) throw createError('Chỉ Nhà cung cấp sở hữu khách sạn mới được quản lý hình ảnh.', 403);
	const result = await hotelModel.deleteHotelImage(hotelId, imageId, access);
	if (result?.status === 'forbidden') throw createError('Bạn không được phân công quản lý khách sạn này.', 403);
	if (result?.status === 'not_found') throw createError('Không tìm thấy hình ảnh.', 404);
	return { image_id: imageId };
};

const setHotelImageThumbnail = async (hotelId, imageId, access) => {
	if (!access.isVendor) throw createError('Chỉ Nhà cung cấp sở hữu khách sạn mới được quản lý hình ảnh.', 403);
	const result = await hotelModel.setHotelImageThumbnail(hotelId, imageId, access);
	if (result?.status === 'forbidden') throw createError('Bạn không được phân công quản lý khách sạn này.', 403);
	if (result?.status === 'not_found') throw createError('Không tìm thấy hình ảnh.', 404);
	return { image_id: imageId, is_thumbnail: true };
};

module.exports = { getHotels, getHotel, createHotel, updateHotel, approveHotel, deleteHotel, uploadHotelImage, deleteHotelImage, setHotelImageThumbnail };
