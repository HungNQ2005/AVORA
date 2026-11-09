'use strict';

const express = require('express');
const router = express.Router();
const controller = require('./payment_sharing.controller');
const { authenticate } = require('../../common/middlewares/authMiddleware');

// Trưởng nhóm tạo hoặc cập nhật phân bổ chia tiền cho đơn đặt phòng
router.post('/payment/groups', authenticate, controller.createOrUpdateGroup);

// Trưởng nhóm lấy thông tin nhóm theo booking_id
router.get('/payment/groups/by-booking/:booking_id', authenticate, controller.getGroupByBookingId);

// Trưởng nhóm gộp đóng nốt phần tiền còn thiếu
router.post('/payment/groups/:group_id/pay-remaining', authenticate, controller.createHostPayRemaining);

// Public (không yêu cầu đăng nhập): xem tiến độ nhóm qua link mời
router.get('/payment/groups/share/:invite_hash', controller.getGroupByInviteHash);

// Public (không yêu cầu đăng nhập): bạn bè cập nhật Tên + SĐT cho suất của mình và nhận mã QR
router.post('/payment/groups/share/:invite_hash/members/:member_id/claim', controller.claimMemberSlot);

module.exports = router;

