
const db = require("./database");

// Known devices and their display names
const knownRooms = [
  { deviceId: "room-101", name: "Room 101" },
  { deviceId: "room-102", name: "Room 102" },
  { deviceId: "room-103", name: "Room 103" }
];

const knownDeviceIds = new Set(
  knownRooms.map(room => room.deviceId)
);

// Prepared SQL statements
const getState = db.prepare(`
  SELECT *
  FROM room_state
  WHERE device_id = ?
`);

const startSession = db.prepare(`
  INSERT INTO occupancy_sessions (device_id, started_at)
  VALUES (?, ?)
`);

const endSession = db.prepare(`
  UPDATE occupancy_sessions
  SET ended_at = ?
  WHERE device_id = ?
    AND ended_at IS NULL
`);

const saveState = db.prepare(`
  INSERT INTO room_state (
    device_id, occupied, state_since, last_seen_at
  )
  VALUES (?, ?, ?, ?)

  ON CONFLICT(device_id) DO UPDATE SET
    occupied = excluded.occupied,
    state_since = excluded.state_since,
    last_seen_at = excluded.last_seen_at
`);

const getAllStates = db.prepare(`
  SELECT *
  FROM room_state
`);

// Returns rooms in the format Angular expects
function getRooms() {
  const states = getAllStates.all();

  const stateById = new Map(
    states.map(state => [state.device_id, state])
  );

  return knownRooms.map(room => {
    const state = stateById.get(room.deviceId);

    return {
      ...room,
      occupied: state ? Boolean(state.occupied) : null,
      stateSince: state?.state_since ?? null,
      lastSeenAt: state?.last_seen_at ?? null
    };
  });
}

// A transaction keeps state and sessions consistent
const saveReading = db.transaction(
  (deviceId, occupied, timestamp) => {

    const previous = getState.get(deviceId);

    // Ignore duplicate and older readings
    if (
      previous &&
      timestamp <= previous.last_seen_at
    ) {
      return false;
    }

    const changed =
      !previous ||
      Boolean(previous.occupied) !== occupied;

    if (changed) {

      // Occupied -> Vacant
      if (previous?.occupied === 1 && !occupied) {
        const result = endSession.run(timestamp, deviceId);

        if (result.changes !== 1) {
          throw new Error(
            `No open occupancy session for ${deviceId}`
          );
        }
      }

      // Vacant -> Occupied (or first occupied reading)
      if (occupied) {
        startSession.run(deviceId, timestamp);
      }
    }

    // Keep stateSince unless occupancy changed
    const stateSince = changed
      ? timestamp
      : previous.state_since;

    // Always record the newest sensor update
    saveState.run(
      deviceId,
      occupied ? 1 : 0,
      stateSince,
      timestamp
    );

    return true;
  }
);

function updateRoom(deviceId, occupied, receivedAt) {

  if (!knownDeviceIds.has(deviceId)) {
    console.log("Unknown device:", deviceId);
    return false;
  }

  if (
    typeof occupied !== "boolean" ||
    typeof receivedAt !== "string"
  ) {
    return false;
  }

  const milliseconds = Date.parse(receivedAt);

  if (!Number.isFinite(milliseconds)) {
    return false;
  }

  const timestamp = new Date(milliseconds).toISOString();

  return saveReading(deviceId, occupied, timestamp);
}

module.exports = {
  getRooms,
  updateRoom
};
