
const rooms = [
  {
    deviceId: "room-101",
    name: "Room 101",
    occupied: true,
    stateSince: "2026-10-29T12:30:00Z",
    lastSeenAt: "2026-10-29T12:35:00Z"
  },
  {
    deviceId: "room-102",
    name: "Room 102",
    occupied: false,
    stateSince: "2026-10-29T12:30:00Z",
    lastSeenAt: "2026-10-29T12:35:00Z"
  },
  {
    deviceId: "room-103",
    name: "Room 103",
    occupied: false,
    stateSince: "2026-10-29T12:30:00Z",
    lastSeenAt: "2026-10-29T12:35:00Z"
  },
];

function getRooms() {
  return rooms;
}

function updateRoom(deviceId, occupied, receivedAt) {
  const room = rooms.find(
    (room) => room.deviceId === deviceId
  );

  if (!room) {
    console.log("Unknown device:", deviceId);
    return false;
  }

  // Ignore reports older than the latest processed report
  if (
    room.lastSeenAt &&
    Date.parse(receivedAt) <= Date.parse(room.lastSeenAt)
  ) {
    return false;
  }

  // Always update when the sensor last reported
  room.lastSeenAt = receivedAt;

  // No occupancy change, but still return true to broadcast() latest sensor reading to angular
  if (room.occupied === occupied) {
    return true;
  }

  // Occupancy changed
  room.occupied = occupied;
  room.stateSince = receivedAt;

  console.log(`${room.name}: ${occupied ? "Occupied" : "Vacant"}`);

  return true;
}

module.exports = {
  getRooms,
  updateRoom,
};
