'use strict';

const getRoomTypesForHotel = (roomTypes, hotelId, linkedRoomTypeIds = []) => {
  const linkedIds = new Set(linkedRoomTypeIds.map(String));
  return roomTypes.filter((roomType) => (
    String(roomType.hotel_id) === String(hotelId) ||
    linkedIds.has(String(roomType.room_type_id))
  ));
};

module.exports = { getRoomTypesForHotel };
