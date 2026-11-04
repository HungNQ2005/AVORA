'use strict';

const supportService = require('./support.service');
const { sendSuccess } = require('../../utils/responseHelper');

const send = (res, status, message, data) => sendSuccess(res, status, message, data);

const getCategories = async (req, res, next) => {
  try {
    return send(res, 200, 'Lấy danh mục hỗ trợ thành công.', await supportService.listCategories(req.user));
  } catch (error) {
    return next(error);
  }
};

const listTickets = async (req, res, next) => {
  try {
    return send(res, 200, 'Lấy danh sách phiếu hỗ trợ thành công.', await supportService.listTickets(req.user, req.validated.query));
  } catch (error) {
    return next(error);
  }
};

const getTicket = async (req, res, next) => {
  try {
    return send(res, 200, 'Lấy phiếu hỗ trợ thành công.', await supportService.getTicket(req.validated.params.ticketId, req.user));
  } catch (error) {
    return next(error);
  }
};

const createTicket = async (req, res, next) => {
  try {
    const body = req.validated.body;
    const ticket = await supportService.createTicket(req.user, body, req.files || []);
    return send(res, 201, 'Tạo phiếu hỗ trợ thành công.', ticket);
  } catch (error) {
    return next(error);
  }
};

const claimTicket = async (req, res, next) => {
  try {
    return send(res, 200, 'Đã nhận xử lý phiếu hỗ trợ.', await supportService.claimTicket(req.validated.params.ticketId, req.user));
  } catch (error) {
    return next(error);
  }
};

const createReply = async (req, res, next) => {
  try {
    const body = req.validated.body;
    if (!body.message && !(req.files || []).length) {
      return res.status(400).json({ status: 'error', message: 'Vui lòng nhập tin nhắn hoặc đính kèm ảnh.' });
    }
    return send(res, 201, 'Gửi tin nhắn thành công.', await supportService.createReply(
      req.validated.params.ticketId,
      req.user,
      body,
      req.files || []
    ));
  } catch (error) {
    return next(error);
  }
};

const updateTicketStatus = async (req, res, next) => {
  try {
    return send(res, 200, 'Cập nhật trạng thái phiếu hỗ trợ thành công.', await supportService.updateTicketStatus(
      req.validated.params.ticketId,
      req.user,
      req.validated.body
    ));
  } catch (error) {
    return next(error);
  }
};

const deleteTicket = async (req, res, next) => {
  try {
    return send(res, 200, 'Đã xóa phiếu hỗ trợ.', await supportService.softDeleteTicket(req.validated.params.ticketId, req.user));
  } catch (error) {
    return next(error);
  }
};

const deleteAttachment = async (req, res, next) => {
  try {
    return send(res, 200, 'Đã xóa ảnh đính kèm.', await supportService.deleteAttachment(
      req.validated.params.ticketId,
      req.validated.params.key,
      req.user
    ));
  } catch (error) {
    return next(error);
  }
};

const downloadAttachment = async (req, res, next) => {
  try {
    const file = await supportService.downloadAttachment(
      req.validated.params.ticketId,
      req.validated.params.key,
      req.user
    );
    const buffer = Buffer.from(await file.data.arrayBuffer());
    const safeName = String(file.filename || 'support-image.webp').replace(/["\r\n]/g, '_');
    res.set({
      'Content-Type': 'image/webp',
      'Content-Length': String(buffer.length),
      'Content-Disposition': `inline; filename="${safeName}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    return res.status(200).send(buffer);
  } catch (error) {
    return next(error);
  }
};

const streamTicketEvents = async (req, res, next) => {
  try {
    await supportService.getTicket(req.validated.params.ticketId, req.user);
    const ticketId = req.validated.params.ticketId;
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();
    res.write('event: ready\ndata: connected\n\n');
    const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 20000);
    const unsubscribe = supportService.subscribeToTicket(ticketId, () => {
      if (!res.writableEnded) res.write('event: update\ndata: refresh\n\n');
    });
    res.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  } catch (error) {
    return next(error);
  }
};

const chatWithAI = async (req, res, next) => {
  try {
    return send(res, 200, 'Trợ lý AI đã phản hồi.', await supportService.chatWithAI(
      req.validated.params.ticketId,
      req.user,
      req.validated.body
    ));
  } catch (error) {
    return next(error);
  }
};

const getCounts = async (req, res, next) => {
  try {
    return send(res, 200, 'Lấy thông báo hỗ trợ thành công.', await supportService.getSupportCounts(req.user));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCategories,
  listTickets,
  getTicket,
  createTicket,
  claimTicket,
  createReply,
  updateTicketStatus,
  deleteTicket,
  deleteAttachment,
  downloadAttachment,
  streamTicketEvents,
  chatWithAI,
  getCounts,
};
