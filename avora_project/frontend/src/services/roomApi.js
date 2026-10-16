import { API_ENDPOINTS } from "../constants/apiEndpoints";
import { authenticatedFetch } from "./authenticatedFetch";

/**
 * Fetch rooms with query filters and statistics.
 * @param {{ hotel_id?: string, room_type_id?: string, floor?: string, status_cd?: string, search?: string, include_deleted?: boolean }} params
 */
export const fetchRooms = async (params = {}) => { 
  const query = new URLSearchParams();
  if (params.hotel_id && params.hotel_id !== "ALL") { 
    query.append("hotel_id", params.hotel_id);
  }
  if (params.room_type_id && params.room_type_id !== "ALL") {
    query.append("room_type_id", params.room_type_id);
  }
  if (params.floor && params.floor !== "ALL") {
    query.append("floor", params.floor);
  }
  if (params.status_cd && params.status_cd !== "ALL") {
    query.append("status_cd", params.status_cd);
  }
  if (params.search) {
    query.append("search", params.search);
  }
  if (params.include_deleted) {
    query.append("include_deleted", "true");
  }

  const url = `${API_ENDPOINTS.ROOMS}${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Không thể tải danh sách buồng phòng.");
  }

  return json.data;
};

/**
 * Fetch hotels authorized for current Hotel Manager.
 */
export const fetchRoomHotels = async () => {
  const url = API_ENDPOINTS.ROOMS_HOTELS;
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Không thể tải danh sách khách sạn.");
  }

  return Array.isArray(json.data) ? json.data : [];
};

/**
 * Fetch existing room types for room dropdown.
 * @param {string} [hotelId]
 */
export const fetchRoomTypesForHotel = async (hotelId) => {
  const query =
    hotelId && hotelId !== "ALL"
      ? `?hotel_id=${encodeURIComponent(hotelId)}`
      : "";
  const url = `${API_ENDPOINTS.ROOMS_ROOM_TYPES}${query}`;
  const response = await authenticatedFetch(url);
  const json = await response.json();

  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Không thể tải danh sách hạng phòng.");
  }

  return Array.isArray(json.data) ? json.data : [];
};

/**
 * Fetch single room detail by ID.
 * @param {string} id
 */
export const fetchRoomById = async (id) => {
  const response = await authenticatedFetch(
    `${API_ENDPOINTS.ROOMS}/${encodeURIComponent(id)}`
  );
  const json = await response.json();

  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Không thể tải thông tin buồng phòng.");
  }

  return json.data;
};

const sendRoomRequest = async (url, options, fallbackMessage) => {
  const response = await authenticatedFetch(url, options);
  const json = await response.json();

  if (!response.ok || json.status === "error") {
    throw new Error(json.message || fallbackMessage);
  }

  return json.data;
};

/**
 * Create a new room.
 * @param {{ hotel_id: string, room_type_id: string, room_number: string, floor?: string, status_cd?: string }} roomData
 */
export const createRoom = async (roomData) => {
  return sendRoomRequest(
    API_ENDPOINTS.ROOMS,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roomData),
    },
    "Không thể tạo buồng phòng mới."
  );
};

/**
 * Update an existing room.
 * @param {string} id
 * @param {object} updates
 */
export const updateRoom = async (id, updates) => {
  return sendRoomRequest(
    `${API_ENDPOINTS.ROOMS}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    },
    "Không thể cập nhật buồng phòng."
  );
};

/**
 * Soft delete a room.
 * @param {string} id
 */
export const deleteRoom = async (id) => {
  return sendRoomRequest(
    `${API_ENDPOINTS.ROOMS}/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    "Không thể xóa buồng phòng."
  );
};
