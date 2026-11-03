import { API_ENDPOINTS } from "../constants/apiEndpoints";
import { authenticatedFetch } from "./authenticatedFetch";

/**
 * Lấy danh sách đơn đặt phòng dành cho Vendor.
 * @param {{ page?: number, limit?: number, status?: string, hotelId?: string, search?: string, startDate?: string, endDate?: string }} params
 */
export const fetchVendorBookings = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append("page", params.page);
  if (params.limit) query.append("limit", params.limit);
  if (params.status && params.status !== "all") query.append("status", params.status);
  if (params.hotelId && params.hotelId !== "all") query.append("hotelId", params.hotelId);
  if (params.search && params.search.trim()) query.append("search", params.search.trim());
  if (params.startDate) query.append("startDate", params.startDate);
  if (params.endDate) query.append("endDate", params.endDate);

  const url = `${API_ENDPOINTS.VENDOR_BOOKINGS}${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Không thể tải danh sách đơn đặt phòng.");
  }

  return json.data;
};

/**
 * Lấy chi tiết đơn đặt phòng theo ID.
 * @param {string} bookingId
 */
export const fetchVendorBookingById = async (bookingId) => {
  const url = API_ENDPOINTS.VENDOR_BOOKING_DETAIL(bookingId);
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Không thể tải chi tiết đơn đặt phòng.");
  }

  return json.data;
};

/**
 * Cập nhật trạng thái đơn đặt phòng (Xác nhận hoặc Hủy).
 * @param {string} bookingId
 * @param {{ status: 'CFM' | 'CAN', reason?: string }} payload
 */
export const updateVendorBookingStatus = async (bookingId, payload) => {
  const url = API_ENDPOINTS.VENDOR_BOOKING_STATUS(bookingId);
  const response = await authenticatedFetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = await response.json();

  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Không thể cập nhật trạng thái đơn đặt phòng.");
  }

  return json.data;
};

