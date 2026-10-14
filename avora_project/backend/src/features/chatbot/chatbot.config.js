'use strict';

require('../../config/env'); // đảm bảo dotenv đã được nạp

const toInt = (value, fallback) => {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
};

module.exports = {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_MODEL: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    TEMPERATURE: 0.3,
    MAX_TOKENS: toInt(process.env.CHATBOT_MAX_TOKENS, 2048),
    GROQ_TIMEOUT_MS: toInt(process.env.GROQ_TIMEOUT_MS, 25000),

    MAX_TOOL_ROUNDS: toInt(process.env.CHATBOT_MAX_TOOL_ROUNDS, 4),
    MAX_HISTORY: toInt(process.env.CHATBOT_MAX_HISTORY, 12),
    MAX_MESSAGE_LENGTH: toInt(process.env.CHATBOT_MAX_MESSAGE_LENGTH, 1000),

    // Thông tin hỗ trợ khách hàng (cấu hình qua .env; để trống thì AI sẽ không nêu số/email)
    HOTLINE: process.env.AVORA_HOTLINE || '',
    SUPPORT_EMAIL: process.env.AVORA_SUPPORT_EMAIL || '',

    // Tìm kiếm
    RESULT_LIMIT: toInt(process.env.CHATBOT_RESULT_LIMIT, 5),
    DEFAULT_RADIUS_KM: toInt(process.env.CHATBOT_DEFAULT_RADIUS_KM, 10),
    MAX_RADIUS_KM: toInt(process.env.CHATBOT_MAX_RADIUS_KM, 100),
    ATTRACTION_RADIUS_KM: toInt(process.env.CHATBOT_ATTRACTION_RADIUS_KM, 20),

    // Dịch vụ bản đồ miễn phí (OpenStreetMap)
    GEO_USER_AGENT: process.env.GEO_USER_AGENT || 'AVORA-OTA-Chatbot/1.0 (support@avora.vn)',
    NOMINATIM_URL: process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org',
    OVERPASS_URL: process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter',
    GEO_TIMEOUT_MS: toInt(process.env.GEO_TIMEOUT_MS, 8000),
    GEO_CACHE_TTL_MS: toInt(process.env.GEO_CACHE_TTL_MS, 60 * 60 * 1000),
};
