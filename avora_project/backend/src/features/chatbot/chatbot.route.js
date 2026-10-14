'use strict';

const { Router } = require('express');
const { handleChat } = require('./chatbot.controller');
const { authenticate } = require('../../common/middlewares/authMiddleware');
const { sendError } = require('../../utils/responseHelper');

const router = Router();

// Giới hạn tần suất theo người dùng để tránh lạm dụng chi phí AI (in-memory)
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 15;
const hits = new Map();

const rateLimit = (req, res, next) => {
    const key = req.user?.user_id || req.ip;
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_REQUESTS) {
        return sendError(res, 429, 'Bạn gửi tin nhắn quá nhanh, vui lòng thử lại sau ít giây.');
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) hits.delete(hits.keys().next().value);
    return next();
};

// POST /api/chat (yêu cầu đăng nhập)
router.post('/chat', authenticate, rateLimit, handleChat);

module.exports = router;
