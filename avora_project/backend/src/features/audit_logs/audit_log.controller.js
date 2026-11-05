'use strict';

const auditLogService = require('./audit_log.service');
const { sendSuccess, sendError } = require('../../utils/responseHelper');

/**
 * GET /api/admin/audit-logs
 * Retrieves paginated, filtered audit logs joined with actor details.
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const query = req.validated?.query || req.query || {};
    const result = await auditLogService.getAuditLogs(query);

    return sendSuccess(
      res,
      200,
      'Lấy danh sách nhật ký kiểm toán thành công.',
      result
    );
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      return sendError(res, error.statusCode, error.message, null);
    }
    console.error('[AuditLogController] Lỗi lấy danh sách nhật ký:', error.message || error);
    return sendError(
      res,
      500,
      'Không thể tải danh sách nhật ký kiểm toán. Vui lòng thử lại sau.',
      null
    );
  }
};

/**
 * GET /api/admin/audit-logs/:id
 * Retrieves detail of a single audit log with diff calculation.
 */
const getAuditLogById = async (req, res, next) => {
  try {
    const params = req.validated?.params || req.params || {};
    const logId = params.id;

    const log = await auditLogService.getAuditLogById(logId);
    if (!log) {
      return sendError(
        res,
        404,
        'Không tìm thấy bản ghi nhật ký kiểm toán.',
        null
      );
    }

    return sendSuccess(
      res,
      200,
      'Lấy chi tiết nhật ký kiểm toán thành công.',
      log
    );
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      return sendError(res, error.statusCode, error.message, null);
    }
    console.error('[AuditLogController] Lỗi lấy chi tiết nhật ký:', error.message || error);
    return sendError(
      res,
      500,
      'Không thể tải chi tiết nhật ký kiểm toán. Vui lòng thử lại sau.',
      null
    );
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogsHandler: getAuditLogs,
  getAuditLogById,
  getAuditLogByIdHandler: getAuditLogById,
};
