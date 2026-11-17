
const db = require("./database");

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

const getRecordedRooms = db.prepare(`
  SELECT
    rooms.device_id,
    state.occupied,
    state.state_since,
    state.last_seen_at
  FROM (
    SELECT device_id FROM room_state
    UNION
    SELECT device_id FROM occupancy_sessions
  ) AS rooms
  LEFT JOIN room_state AS state
    ON state.device_id = rooms.device_id
  ORDER BY rooms.device_id
`);

// Returns rooms in the format Angular expects
function getRooms() {
  return getRecordedRooms.all().map(room => ({
    deviceId: room.device_id,
    name: `Room ${room.device_id.slice("room-".length)}`,
    occupied: room.occupied === null ? null : Boolean(room.occupied),
    stateSince: room.state_since,
    lastSeenAt: room.last_seen_at
  }));
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

  // Nodes 0–15 map to rooms 100–115; new rooms need not exist yet.
  if (
    typeof deviceId !== "string" ||
    deviceId.length !== 8 ||
    !/^room-(10[0-9]|11[0-5])$/.test(deviceId)
  ) {
    console.log("Invalid device:", deviceId);
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
