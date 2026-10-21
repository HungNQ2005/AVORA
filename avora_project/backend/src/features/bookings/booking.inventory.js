'use strict';

const createInventorySeed = (totalRooms, heldRooms) => {
  const total = Math.max(0, Number(totalRooms) || 0);
  const held = Math.min(total, Math.max(0, Number(heldRooms) || 0));

  return {
    available_rooms: total - held,
    locked_rooms: held,
    version: 0,
  };
};

module.exports = { createInventorySeed };
