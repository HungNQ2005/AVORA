'use strict';

const getStayDates = (checkIn, checkOut) => {
  const dates = [];
  const cursor = new Date(`${checkIn}T00:00:00.000Z`);
  const end = new Date(`${checkOut}T00:00:00.000Z`);

  while (cursor < end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
};

const isOperationalRoom = (room) => {
  const status = String(room.status_cd || '').toUpperCase();
  return status !== 'MAINTENANCE' && status !== 'LOCKED';
};

const getOperationalRoomCount = (rooms = []) => rooms.filter(isOperationalRoom).length;

const calculateRoomTypeAvailability = ({
  stayDates,
  inventoryByDate,
  operationalRoomCount,
  heldByDate,
}) => {
  if (!stayDates.length) return operationalRoomCount;

  return Math.min(...stayDates.map((date) => {
    const inventory = inventoryByDate.get(date);
    if (inventory) return Math.max(0, Number(inventory.available_rooms) || 0);

    const held = heldByDate.get(date) || 0;
    return Math.max(0, operationalRoomCount - held);
  }));
};

const calculateAverageRoomPrice = ({ stayDates, inventoryByDate, defaultPrice }) => {
  if (!stayDates.length) return defaultPrice;

  const total = stayDates.reduce((sum, date) => {
    const currentPrice = inventoryByDate.get(date)?.current_price;
    return sum + (currentPrice != null ? Number(currentPrice) : defaultPrice);
  }, 0);

  return Math.round(total / stayDates.length);
};

module.exports = {
  calculateAverageRoomPrice,
  calculateRoomTypeAvailability,
  getOperationalRoomCount,
  getStayDates,
  isOperationalRoom,
};
