'use strict';

const chatbotService = require('./chatbot.service');
const config = require('./chatbot.config');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

const parseLocation = (loc) => {
    const lat = Number(loc?.lat);
    const lng = Number(loc?.lng);
    const valid = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    return valid ? { lat, lng } : null;
};

/**
 * POST /api/chat
 * Body: { message, history, context: { userLocation: {lat,lng}, currentPage, currentHotelId } }
 */
const handleChat = async (req, res) => {
    try {
        const { message, history = [], context = {} } = req.body || {};

        if (typeof message !== 'string' || !message.trim()) {
            return sendError(res, 400, 'Vui lòng nhập nội dung tin nhắn.');
        }
        if (message.length > config.MAX_MESSAGE_LENGTH) {
            return sendError(res, 400, `Tin nhắn tối đa ${config.MAX_MESSAGE_LENGTH} ký tự.`);
        }

        const safeContext = {
            userLocation: parseLocation(context?.userLocation),
            currentPage: typeof context?.currentPage === 'string' ? context.currentPage.slice(0, 200) : '',
            currentHotelId: typeof context?.currentHotelId === 'string' ? context.currentHotelId.slice(0, 64) : '',
        };

        const result = await chatbotService.processChat({
            message,
            history,
            context: safeContext,
            userId: req.user?.user_id,
        });
        return sendSuccess(res, 200, 'OK', result);
    } catch (err) {
        console.error('[Chatbot] handleChat lỗi:', err);
        const status = err.statusCode || 500;
        return sendError(
            res,
            status,
            status === 503 ? 'Trợ lý AI chưa sẵn sàng.' : 'Trợ lý AI đang gặp sự cố, vui lòng thử lại sau.'
        );
    }
};

module.exports = { handleChat };
