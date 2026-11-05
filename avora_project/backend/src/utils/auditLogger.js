'use strict';

const auditLogService = require('../features/audit_logs/audit_log.service');

/**
 * Centrally records an audit log event without blocking or failing business logic.
 *
 * @param {object} params
 * @param {string|null} [params.actor_user_id]
 * @param {string|number} params.action_cd - '1'/'INS', '2'/'UPD', '3'/'DEL', '4'/'LGN'
 * @param {string} params.entity_name - e.g. 't_booking', 'm_hotel', 'm_room', 'm_coupon', 'm_user', 'auth'
 * @param {string|number} [params.entity_id]
 * @param {object|null} [params.old_data]
 * @param {object|null} [params.new_data]
 * @param {string|null} [params.ip_address]
 * @param {object|null} [params.req]
 * @returns {Promise<object|null>}
 */
const recordAuditLog = (params) => {
  return auditLogService.recordAuditLog(params).catch((err) => {
    console.warn('[AuditLogger] Async error:', err.message);
    return null;
  });
};

module.exports = {
  recordAuditLog,
};

