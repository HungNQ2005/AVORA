'use strict';

const defaultSupabase = require('../../config/supabaseClient');
const { codeNameParser } = require('../../utils/codeNameParser');
const { matchesSearch } = require('../../utils/textSearchHelper');

let customClient = null;

/**
 * Hook to inject a custom or mock Supabase client for testing / isolation.
 * @param {object|null} client
 */
const setCustomClient = (client) => {
  customClient = client;
};

/**
 * Returns the currently active database client (custom mock or default Supabase).
 * @returns {object}
 */
const getClient = () => customClient || defaultSupabase;

/**
 * Standard audit action configuration aligned with m_system_code (business_cd = 'AUDIT_ACTION').
 */
const ACTION_MAP = {
  '1': { code_cd: '1', code_name: 'INS', label: 'Insert', name: 'Insert' },
  '2': { code_cd: '2', code_name: 'UPD', label: 'Update', name: 'Update' },
  '3': { code_cd: '3', code_name: 'DEL', label: 'Delete', name: 'Delete' },
  '4': { code_cd: '4', code_name: 'LGN', label: 'Login', name: 'Login' },
  INS: { code_cd: '1', code_name: 'INS', label: 'Insert', name: 'Insert' },
  UPD: { code_cd: '2', code_name: 'UPD', label: 'Update', name: 'Update' },
  DEL: { code_cd: '3', code_name: 'DEL', label: 'Delete', name: 'Delete' },
  LGN: { code_cd: '4', code_name: 'LGN', label: 'Login', name: 'Login' },
};

/**
 * Resolves action code into numeric code_cd, standard code_name, and human-readable label.
 * @param {string|number} code
 * @returns {{ action_cd: string, action_code_name: string, action_name: string, action_code: string, action_label: string }}
 */
const resolveAuditAction = (code) => {
  if (!code) {
    return {
      action_cd: '',
      action_code_name: 'UNKNOWN',
      action_name: 'Unknown',
      action_code: 'UNKNOWN',
      action_label: 'Unknown',
    };
  }
  const str = String(code).trim().toUpperCase();
  const matched = ACTION_MAP[str];
  if (matched) {
    return {
      action_cd: matched.code_cd,
      action_code_name: matched.code_name,
      action_name: matched.label,
      action_code: matched.code_name,
      action_label: matched.label,
    };
  }
  const label = codeNameParser(str) || str;
  return {
    action_cd: String(code),
    action_code_name: str,
    action_name: label,
    action_code: str,
    action_label: label,
  };
};

/**
 * Computes deep key-level diff between old_data and new_data objects.
 * Categorizes differences into added, removed, modified, and unchanged keys.
 * @param {object|null} oldData 
 * @param {object|null} newData 
 * @returns {{ added: object, removed: object, modified: object, unchanged: object }}
 */
const computeDiff = (oldData, newData) => {
  const oldObj = oldData && typeof oldData === 'object' && !Array.isArray(oldData) ? oldData : {};
  const newObj = newData && typeof newData === 'object' && !Array.isArray(newData) ? newData : {};

  const added = {};
  const removed = {};
  const modified = {};
  const unchanged = {};

  const oldKeys = Object.keys(oldObj);
  const newKeys = Object.keys(newObj);
  const allKeys = Array.from(new Set([...oldKeys, ...newKeys]));

  for (const key of allKeys) {
    const hasOld = Object.prototype.hasOwnProperty.call(oldObj, key);
    const hasNew = Object.prototype.hasOwnProperty.call(newObj, key);

    if (hasNew && !hasOld) {
      added[key] = newObj[key];
    } else if (hasOld && !hasNew) {
      removed[key] = oldObj[key];
    } else {
      const oldVal = oldObj[key];
      const newVal = newObj[key];
      const isSame = JSON.stringify(oldVal) === JSON.stringify(newVal);
      if (isSame) {
        unchanged[key] = newVal;
      } else {
        modified[key] = {
          old: oldVal,
          new: newVal,
        };
      }
    }
  }

  return { added, removed, modified, unchanged };
};

/**
 * Normalizes raw actor relation into standard structure conforming to PROJECT.md § Interface Contracts.
 * @param {object|array|null} rawActor
 * @returns {object|null}
 */
const normalizeActor = (rawActor) => {
  if (!rawActor) return null;
  const a = Array.isArray(rawActor) ? rawActor[0] : rawActor;
  if (!a || !a.user_id) return null;
  return {
    user_id: a.user_id,
    full_name: a.full_name || '',
    email: a.email || '',
    role_cd: a.role_cd || '',
    avatar_url: a.avatar_url || null,
  };
};

/**
 * Resilient batch actor enrichment for logs where relational join was not auto-resolved.
 * @param {object} client - Database client
 * @param {Array<object>} logs - Audit log records
 * @returns {Promise<Array<object>>}
 */
const enrichActors = async (client, logs) => {
  if (!Array.isArray(logs) || logs.length === 0) return logs;

  const missingActorIds = Array.from(
    new Set(
      logs
        .filter((l) => l.actor_user_id && !l.actor)
        .map((l) => l.actor_user_id)
    )
  );

  if (missingActorIds.length === 0) {
    return logs;
  }

  try {
    const { data: users, error } = await client
      .from('m_user')
      .select('user_id, email, full_name, role_cd, avatar_url')
      .in('user_id', missingActorIds);

    if (!error && Array.isArray(users)) {
      const userMap = new Map();
      users.forEach((u) => {
        userMap.set(String(u.user_id), u);
      });

      logs.forEach((log) => {
        if (log.actor_user_id && !log.actor) {
          log.actor = userMap.get(String(log.actor_user_id)) || null;
        }
      });
    }
  } catch (err) {
    console.warn('[AuditLogService] Cảnh báo khi làm giàu dữ liệu người dùng:', err.message);
  }

  return logs;
};

/**
 * Formats a raw database log row into the client-facing audit log contract.
 * @param {object} log
 * @returns {object}
 */
const formatAuditLogItem = (log) => {
  const actionInfo = resolveAuditAction(log.action_cd);
  const actor = normalizeActor(log.actor);

  return {
    log_id: log.log_id,
    actor_user_id: log.actor_user_id || null,
    action_cd: actionInfo.action_cd,
    action_name: actionInfo.action_name,
    action_code_name: actionInfo.action_code_name,
    action_code: actionInfo.action_code_name,
    action_label: actionInfo.action_name,
    entity_name: log.entity_name || '',
    entity_id: log.entity_id ? String(log.entity_id) : '',
    old_data: log.old_data || null,
    new_data: log.new_data || null,
    ip_address: log.ip_address || null,
    created_at: log.created_at ? new Date(log.created_at).toISOString() : new Date().toISOString(),
    actor,
  };
};

/**
 * Retrieves paginated and filtered list of audit log records.
 * Supports filtering by action_cd, entity_name, actor_id, ip_address, start_date, end_date, search.
 *
 * @param {object} params
 * @returns {Promise<object>}
 */
const getAuditLogs = async ({
  page = 1,
  limit = 10,
  action_cd,
  entity_name,
  actor_id,
  ip_address,
  start_date,
  end_date,
  search,
  sort_order = 'DESC',
} = {}) => {
  const client = getClient();
  if (!client) {
    const err = new Error('Không thể kết nối đến cơ sở dữ liệu. Vui lòng thử lại sau.');
    err.statusCode = 503;
    throw err;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;
  const isAsc = String(sort_order).toUpperCase() === 'ASC';

  let query = client
    .from('h_system_audit_log')
    .select(
      `
      log_id,
      actor_user_id,
      action_cd,
      entity_name,
      entity_id,
      old_data,
      new_data,
      ip_address,
      created_at,
      actor:m_user!actor_user_id (
        user_id,
        email,
        full_name,
        role_cd,
        avatar_url
      )
    `,
      { count: 'exact' }
    );

  // Filter: action_cd (matches both numeric code_cd and code_name)
  if (action_cd && action_cd !== 'ALL') {
    const resolved = resolveAuditAction(action_cd);
    if (resolved.action_cd && resolved.action_code_name && typeof query.in === 'function') {
      query = query.in('action_cd', [resolved.action_cd, resolved.action_code_name]);
    } else if (typeof query.eq === 'function') {
      query = query.eq('action_cd', action_cd);
    }
  }

  // Filter: entity_name
  if (entity_name && entity_name !== 'ALL' && typeof query.eq === 'function') {
    query = query.eq('entity_name', entity_name.trim());
  }

  // Filter: actor_id
  if (actor_id && actor_id.trim() && typeof query.eq === 'function') {
    query = query.eq('actor_user_id', actor_id.trim());
  }

  // Filter: ip_address
  if (ip_address && ip_address.trim() && typeof query.eq === 'function') {
    query = query.eq('ip_address', ip_address.trim());
  }

  // Filter: start_date
  if (start_date && typeof query.gte === 'function') {
    query = query.gte('created_at', `${start_date}T00:00:00.000Z`);
  }

  // Filter: end_date
  if (end_date && typeof query.lte === 'function') {
    query = query.lte('created_at', `${end_date}T23:59:59.999Z`);
  }

  // Order by created_at
  if (typeof query.order === 'function') {
    query = query.order('created_at', { ascending: isAsc });
  }

  const hasSearch = Boolean(search && String(search).trim());

  // Apply DB-level pagination if no cross-table in-memory search is required
  if (!hasSearch && typeof query.range === 'function') {
    query = query.range(offset, offset + limitNum - 1);
  } else if (!hasSearch && typeof query.limit === 'function') {
    query = query.limit(limitNum);
  }

  const { data: rawRows, count: totalCount, error } = await query;

  if (error) {
    console.error('[AuditLogService] Lỗi truy vấn danh sách nhật ký:', error.message);
    const err = new Error('Không thể tải danh sách nhật ký kiểm toán. Vui lòng thử lại sau.');
    err.statusCode = 500;
    throw err;
  }

  let rows = Array.isArray(rawRows) ? [...rawRows] : [];

  // In-memory date filter fallback for mock environments where gte/lte might be absent
  if (start_date) {
    const startIso = `${start_date}T00:00:00.000Z`;
    rows = rows.filter((r) => r.created_at && new Date(r.created_at).toISOString() >= startIso);
  }
  if (end_date) {
    const endIso = `${end_date}T23:59:59.999Z`;
    rows = rows.filter((r) => r.created_at && new Date(r.created_at).toISOString() <= endIso);
  }

  // Resiliently enrich actors if relational join did not populate actor
  rows = await enrichActors(client, rows);

  // Multi-field Vietnamese accent-insensitive search
  if (hasSearch) {
    const term = String(search).trim();
    rows = rows.filter((log) => {
      const actorName = log.actor?.full_name || '';
      const actorEmail = log.actor?.email || '';
      const entityName = log.entity_name || '';
      const entityId = log.entity_id ? String(log.entity_id) : '';
      const ipAddress = log.ip_address || '';

      return matchesSearch(
        [actorName, actorEmail, entityName, entityId, ipAddress],
        term
      );
    });
  }

  // Calculate total and handle pagination slicing
  let total;
  let pagedRows;

  if (hasSearch) {
    total = rows.length;
    pagedRows = rows.slice(offset, offset + limitNum);
  } else {
    total = typeof totalCount === 'number' ? totalCount : rows.length;
    // If client did not apply range/limit and returned all rows, slice in memory
    pagedRows = rows.length > limitNum ? rows.slice(offset, offset + limitNum) : rows;
  }

  const formattedItems = pagedRows.map(formatAuditLogItem);

  return {
    items: formattedItems,
    logs: formattedItems,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limitNum),
    },
    filter_options: {
      actions: [
        { code_cd: '1', code_name: 'INS', label: 'Insert', name: 'Insert' },
        { code_cd: '2', code_name: 'UPD', label: 'Update', name: 'Update' },
        { code_cd: '3', code_name: 'DEL', label: 'Delete', name: 'Delete' },
        { code_cd: '4', code_name: 'LGN', label: 'Login', name: 'Login' },
      ],
      entities: [
        'm_user',
        'm_hotel',
        't_booking',
        'm_coupon',
        'm_commission_policy',
        'm_refund_policy',
        'm_room',
        'm_room_type',
      ],
    },
  };
};

/**
 * Retrieves detail for a single audit log by logId UUID.
 * Includes formatted actor details, old_data, new_data, and field-level diff.
 *
 * @param {string} logId - Audit log UUID
 * @returns {Promise<object|null>}
 */
const getAuditLogById = async (logId) => {
  const client = getClient();
  if (!client) {
    const err = new Error('Không thể kết nối đến cơ sở dữ liệu. Vui lòng thử lại sau.');
    err.statusCode = 503;
    throw err;
  }

  let query = client
    .from('h_system_audit_log')
    .select(
      `
      log_id,
      actor_user_id,
      action_cd,
      entity_name,
      entity_id,
      old_data,
      new_data,
      ip_address,
      created_at,
      actor:m_user!actor_user_id (
        user_id,
        email,
        full_name,
        role_cd,
        avatar_url
      )
    `
    )
    .eq('log_id', logId);

  const { data, error } =
    typeof query.maybeSingle === 'function' ? await query.maybeSingle() : await query.single();

  if (error && error.code !== 'PGRST116') {
    console.error('[AuditLogService] Lỗi truy vấn chi tiết nhật ký:', error.message);
  }

  if (!data) {
    return null;
  }

  const enrichedLogs = await enrichActors(client, [data]);
  const logRecord = enrichedLogs[0];

  const formatted = formatAuditLogItem(logRecord);
  const diff = computeDiff(logRecord.old_data, logRecord.new_data);

  return {
    ...formatted,
    diff,
  };
};

/**
 * Records an audit log event into h_system_audit_log asynchronously.
 * Never throws an unhandled error to disrupt the calling business logic.
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
const recordAuditLog = async ({
  actor_user_id,
  action_cd,
  entity_name,
  entity_id,
  old_data = null,
  new_data = null,
  ip_address = null,
  req = null,
} = {}) => {
  try {
    const client = getClient();
    if (!client) {
      return null;
    }

    let finalActorId = actor_user_id;
    let finalIp = ip_address;

    if (req) {
      if (!finalActorId && req.user) {
        finalActorId = req.user.user_id || req.user.id;
      }
      if (!finalIp) {
        const forwarded = req.headers ? (req.headers['x-forwarded-for'] || req.headers['x-real-ip']) : null;
        finalIp = forwarded
          ? String(forwarded).split(',')[0].trim()
          : (req.socket?.remoteAddress || req.ip || '127.0.0.1');
      }
    }

    const actionInfo = resolveAuditAction(action_cd);
    const resolvedActionCd = actionInfo.action_cd || String(action_cd);

    const sanitize = (obj) => {
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
      const copy = { ...obj };
      ['password', 'password_hash', 'token', 'access_token', 'refresh_token'].forEach((k) => {
        if (copy[k]) copy[k] = '[HIDDEN]';
      });
      return copy;
    };

    const payload = {
      actor_user_id: finalActorId || null,
      action_cd: resolvedActionCd,
      entity_name: String(entity_name || '').trim(),
      entity_id: entity_id !== undefined && entity_id !== null ? String(entity_id) : null,
      old_data: sanitize(old_data),
      new_data: sanitize(new_data),
      ip_address: finalIp ? String(finalIp).slice(0, 50) : null,
      created_at: new Date().toISOString(),
    };

    if (typeof client.from === 'function') {
      const q = client.from('h_system_audit_log');
      if (typeof q.insert === 'function') {
        const insertResult = q.insert(payload);
        const { data, error } = typeof insertResult.select === 'function'
          ? (typeof insertResult.select().maybeSingle === 'function' ? await insertResult.select().maybeSingle() : await insertResult.select())
          : await insertResult;

        if (error) {
          console.warn('[AuditLogger] Ghi nhật ký thất bại:', error.message);
          return null;
        }
        return data || payload;
      }
    }
    return null;
  } catch (err) {
    console.warn('[AuditLogger] Lỗi ngoại lệ khi ghi nhật ký:', err.message);
    return null;
  }
};

module.exports = {
  setCustomClient,
  getClient,
  resolveAuditAction,
  computeDiff,
  normalizeActor,
  enrichActors,
  formatAuditLogItem,
  getAuditLogs,
  getAuditLogById,
  recordAuditLog,
};
