import { API_ENDPOINTS } from "../constants/apiEndpoints";
import { authenticatedFetch } from "./authenticatedFetch";

const parseResponse = async (response, fallbackMessage) => {
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok || !json || json.status === "error") {
    throw new Error(json?.message || fallbackMessage);
  }

  return json.data;
};

/**
 * Fetch active hotels for the statistics hotel selector.
 */
export const fetchStatisticsHotels = async () => {
  const response = await authenticatedFetch(API_ENDPOINTS.STATISTICS_HOTELS);
  const data = await parseResponse(response, "Không thể tải danh sách khách sạn.");
  return Array.isArray(data) ? data : [];
};

/**
 * Fetch statistics overview of one hotel in a date range.
 * @param {{ hotelId: string, from: string, to: string }} params
 * @param {AbortSignal} [signal]
 */
export const fetchStatisticsOverview = async ({ hotelId, from, to }, signal) => {
  const query = new URLSearchParams({ hotel_id: hotelId, from, to });
  const response = await authenticatedFetch(
    `${API_ENDPOINTS.STATISTICS_OVERVIEW}?${query.toString()}`,
    { signal },
  );
  return parseResponse(response, "Không thể tải dữ liệu thống kê.");
};
