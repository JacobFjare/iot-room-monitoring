
const rooms = [
  {
    deviceId: "room-101",
    name: "Room 101",
    occupied: true,
  },
  {
    deviceId: "room-102",
    name: "Room 102",
    occupied: false,
  },
  {
    deviceId: "room-103",
    name: "Room 103",
    occupied: false,
  },
];

function getRooms() {
  return rooms;
}

function updateRoom(deviceId, occupied) {
  const room = rooms.find(
    (room) => room.deviceId === deviceId
  );

  if (!room) {
    console.log("Unknown device:", deviceId);
    return false;
  }

  if (room.occupied === occupied) {
    return false;
  }

  room.occupied = occupied;

  console.log(`${room.name}: ${occupied ? "Occupied" : "Vacant"}`);

  return true;
}

module.exports = {
  getRooms,
  updateRoom,
};
