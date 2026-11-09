import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { authenticatedFetch } from './authenticatedFetch';

/**
 * Business Manager: lấy tổng quan quản lý hoàn tiền
 * (Tab 1: Support Ticket RFD+RSV chờ tạo lệnh, Tab 2: Lệnh hoàn tiền PND chờ chi, Tab 3: Lịch sử đã hoàn tiền SUC)
 */
export const fetchBusinessRefundOverview = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.search) {
    query.append('search', params.search);
  }
  const queryString = query.toString();
  const url = `${API_ENDPOINTS.BUSINESS_REFUND_REQUESTS}${queryString ? `?${queryString}` : ''}`;

  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể tải danh sách quản lý hoàn tiền.');
  }

  return json.data;
};

/**
 * Business Manager: tạo (hoặc gộp) lệnh hoàn tiền từ Support Ticket đã duyệt
 */
export const createRefundFromTicket = async (ticketId, payload = {}) => {
  const response = await authenticatedFetch(API_ENDPOINTS.BUSINESS_REFUND_FROM_TICKET(ticketId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Tạo lệnh hoàn tiền từ Support Ticket thất bại.');
  }

  return json.data;
};

/**
 * Business Manager: cập nhật STK nhận tiền / số tiền cần hoàn cho lệnh đang chờ (PND / PRO)
 */
export const updateRefundRequestInfo = async (refundId, payload = {}) => {
  const response = await authenticatedFetch(API_ENDPOINTS.BUSINESS_REFUND_DETAIL(refundId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Cập nhật thông tin hoàn tiền thất bại.');
  }

  return json.data;
};

/**
 * Business Manager: lấy mã VietQR (AVRRFxxxxxxxx) để quét chuyển tiền hoàn cho khách
 */
export const fetchRefundPaymentQr = async (refundId, { signal } = {}) => {
  const response = await authenticatedFetch(API_ENDPOINTS.BUSINESS_REFUND_PAYMENT_QR(refundId), {
    signal,
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    const err = new Error(json.message || 'Không thể tạo mã VietQR hoàn tiền.');
    err.code = json.code || null;
    throw err;
  }

  return json.data;
};

/**
 * Business Manager: polling trạng thái hoàn tiền (chờ SePay webhook tiền ra AVRRFxxxxxxxx)
 */
export const fetchRefundPaymentStatus = async (refundId, { signal } = {}) => {
  const response = await authenticatedFetch(API_ENDPOINTS.BUSINESS_REFUND_PAYMENT_STATUS(refundId), {
    signal,
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Không thể kiểm tra trạng thái hoàn tiền.');
  }

  return json.data;
};

/**
 * Business Manager: xác nhận hoàn tiền thủ công bằng mã giao dịch ngân hàng (FT...) dự phòng
 */
export const settleRefundManually = async (refundId, payload = {}) => {
  const response = await authenticatedFetch(API_ENDPOINTS.BUSINESS_REFUND_SETTLE(refundId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || 'Xác nhận hoàn tiền thủ công thất bại.');
  }

  return json.data;
};

