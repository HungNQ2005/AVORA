/**
 * Room Capacity & Bed Configuration Business Logic
 *
 * Rules:
 * - 2 giường tiêu chuẩn × 2 người = 4 người
 * - Có thêm 1 giường phụ × 1 người = tối đa 5 người
 * - Không được cho phép booking 6 người vào phòng này
 * - Sức chứa tối đa của 1 phòng trong toàn hệ thống là 5 người
 */

export const MAX_ROOM_CAPACITY = 5; // 2 standard beds * 2 + 1 extra bed * 1

/**
 * Parse bed configuration and compute room capacity.
 * @param {Object} room - Room object containing bed_type, max_adults, max_children
 * @returns {Object} Capacity breakdown
 */
export const getRoomCapacityDetails = (room = {}) => {
  const bedTypeStr = String(room.bed_type || '').trim().toLowerCase();
  const maxAdults = Number(room.max_adults) || 2;

  // Determine number of standard beds
  let bedCount = 1;
  const matchCount = bedTypeStr.match(/^(\d+)/);
  if (matchCount) {
    bedCount = parseInt(matchCount[1], 10);
  } else if (bedTypeStr.includes('hai giường') || bedTypeStr.includes('twin')) {
    bedCount = 2;
  }

  const isSingle = bedTypeStr.includes('single') || bedTypeStr.includes('đơn');

  // Standard beds calculation:
  // 1 standard bed = 2 guests (e.g. Double / Queen / King)
  // 2 standard beds = 4 guests
  // Single bed = 1 guest
  let standardCapacity = 2;
  let standardBeds = 1;

  if (isSingle) {
    standardBeds = bedCount;
    standardCapacity = bedCount; // 1 per single bed
  } else if (bedCount >= 2 || maxAdults >= 4 || bedTypeStr.includes('2 x') || bedTypeStr.includes('2 giường')) {
    standardBeds = 2;
    standardCapacity = 4; // 2 giường tiêu chuẩn * 2 người = 4 người
  } else {
    standardBeds = 1;
    standardCapacity = 2; // 1 giường đôi * 2 người = 2 người
  }

  // Extra bed (Giường phụ) logic:
  // Available if standard capacity >= 2: allows 1 extra bed * 1 guest = 1 guest
  const hasExtraBed = standardCapacity >= 2;
  const extraBedCapacity = hasExtraBed ? 1 : 0;

  // Max capacity is capped at 5 according to rule:
  // 2 standard beds (4) + 1 extra bed (1) = max 5
  const maxCapacity = Math.min(MAX_ROOM_CAPACITY, standardCapacity + extraBedCapacity);

  return {
    standardBeds,
    standardCapacity,
    hasExtraBed,
    extraBedCapacity,
    maxCapacity,
    bedDescription: standardBeds === 2
      ? '2 giường tiêu chuẩn (4 người) + 1 giường phụ (1 người)'
      : '1 giường đôi tiêu chuẩn (2 người) + 1 giường phụ (1 người)',
  };
};

/**
 * Calculate minimum rooms required to accommodate total guests.
 * 1 room holds maximum 5 guests (2 standard beds * 2 + 1 extra bed * 1).
 * @param {number} totalGuests
 * @returns {number} Minimum rooms required
 */
export const getMinRoomsRequired = (totalGuests) => {
  const guests = Math.max(1, Number(totalGuests) || 1);
  return Math.ceil(guests / MAX_ROOM_CAPACITY);
};

/**
 * Validate if a room count can hold total guests.
 * @param {number} totalGuests
 * @param {number} rooms
 * @returns {{ isValid: boolean, guestsPerRoom: number, minRooms: number, message: string }}
 */
export const validateGuestRoomCapacity = (totalGuests, rooms) => {
  const guests = Math.max(1, Number(totalGuests) || 1);
  const roomCount = Math.max(1, Number(rooms) || 1);
  const guestsPerRoom = Math.ceil(guests / roomCount);
  const minRooms = Math.ceil(guests / MAX_ROOM_CAPACITY);

  if (guestsPerRoom > MAX_ROOM_CAPACITY) {
    return {
      isValid: false,
      guestsPerRoom,
      minRooms,
      message: `Không có loại phòng nào như vậy. Sức chứa tối đa của 1 phòng là 5 người (2 giường tiêu chuẩn × 2 người = 4 người + 1 giường phụ × 1 người = 5 người). Bạn đang chọn ${guestsPerRoom} người/phòng. Cần tối thiểu ${minRooms} phòng.`,
    };
  }

  return {
    isValid: true,
    guestsPerRoom,
    minRooms,
    message: '',
  };
};
