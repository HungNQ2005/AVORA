'use strict';

const Groq = require('groq-sdk');
const config = require('./chatbot.config');
const { buildSystemPrompt } = require('./chatbot.prompt');
const { TOOL_DEFINITIONS, executeTool, resolveLocationLabel, getUserName } = require('./chatbot.tools');

const groq = config.GROQ_API_KEY
    ? new Groq({ apiKey: config.GROQ_API_KEY, timeout: config.GROQ_TIMEOUT_MS, maxRetries: 1 })
    : null;

const isGptOss = config.GROQ_MODEL.startsWith('openai/gpt-oss');

const FALLBACK_REPLY = 'Xin lỗi, hiện tôi chưa thể trả lời. Bạn vui lòng thử lại sau ít phút nhé.';

const sanitizeHistory = (history) =>
    (Array.isArray(history) ? history : [])
        .filter((m) => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim())
        .slice(-config.MAX_HISTORY)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

const isToolUseFailure = (err) =>
    err?.error?.error?.code === 'tool_use_failed' || String(err?.message || '').includes('tool_use_failed');

const callGroq = (messages, toolChoice, withTools = true) =>
    groq.chat.completions.create({
        model: config.GROQ_MODEL,
        messages,
        ...(withTools ? { tools: TOOL_DEFINITIONS, tool_choice: toolChoice } : {}),
        temperature: config.TEMPERATURE,
        max_tokens: config.MAX_TOKENS,
        ...(isGptOss ? { reasoning_effort: 'low' } : {}),
    });

/**
 * Luồng: prompt theo ngữ cảnh → Groq → tool_calls → Supabase/OSM → Groq render câu trả lời.
 * @returns {Promise<{ reply: string, toolsUsed: string[] }>}
 */
const processChat = async ({ message, history, context = {}, userId }) => {
    if (!groq) {
        const err = new Error('GROQ_API_KEY chưa được cấu hình.');
        err.statusCode = 503;
        throw err;
    }

    const userLocation = context.userLocation || null;
    const [locationLabel, userName] = await Promise.all([
        userLocation ? resolveLocationLabel(userLocation.lat, userLocation.lng) : Promise.resolve(null),
        getUserName(userId),
    ]);

    const ctx = { ...context, userLocation, userId, userName, locationLabel };

    const messages = [
        { role: 'system', content: buildSystemPrompt(ctx) },
        ...sanitizeHistory(history),
        { role: 'user', content: String(message).slice(0, config.MAX_MESSAGE_LENGTH) },
    ];
    const toolsUsed = [];

    for (let round = 0; round < config.MAX_TOOL_ROUNDS; round += 1) {
        let completion;
        try {
            completion = await callGroq(messages, 'auto');
        } catch (err) {
            if (isToolUseFailure(err)) break; // model gọi tool sai định dạng → trả lời không dùng tool
            throw err;
        }

        const assistantMsg = completion.choices?.[0]?.message;
        if (!assistantMsg) break;

        if (!assistantMsg.tool_calls?.length) {
            return { reply: assistantMsg.content || FALLBACK_REPLY, toolsUsed };
        }

        messages.push({ role: 'assistant', content: assistantMsg.content || '', tool_calls: assistantMsg.tool_calls });

        for (const toolCall of assistantMsg.tool_calls) {
            const name = toolCall.function?.name;
            toolsUsed.push(name);
            const result = await executeTool(name, toolCall.function?.arguments, ctx);
            messages.push({ role: 'tool', tool_call_id: toolCall.id, name, content: JSON.stringify(result) });
        }
    }

    // Lượt cuối: ép model viết câu trả lời ngôn ngữ tự nhiên, không truyền tools để tránh lỗi "Tool choice is none, but model called a tool"
    try {
        const final = await callGroq(messages, undefined, false);
        return { reply: final.choices?.[0]?.message?.content || FALLBACK_REPLY, toolsUsed };
    } catch (err) {
        if (isToolUseFailure(err)) {
            const retry = await callGroq(messages, 'auto');
            return { reply: retry.choices?.[0]?.message?.content || FALLBACK_REPLY, toolsUsed };
        }
        throw err;
    }
};

module.exports = { processChat };
