const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");

// Substitute an isolated database before loading rooms.js.
const db = new Database(":memory:");
db.exec(`
  CREATE TABLE room_state (
    device_id TEXT PRIMARY KEY,
    occupied INTEGER NOT NULL,
    state_since TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );
  CREATE TABLE occupancy_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT
  );
  CREATE UNIQUE INDEX one_open_session_per_room
    ON occupancy_sessions(device_id)
    WHERE ended_at IS NULL;
`);

const databasePath = require.resolve("../src/database");
require.cache[databasePath] = { exports: db };
const { getRooms, updateRoom } = require("../src/rooms");

after(() => {
  delete require.cache[databasePath];
  db.close();
});

function reset() {
  db.exec("DELETE FROM room_state; DELETE FROM occupancy_sessions;");
}

test("an empty database has no room placeholders", () => {
  reset();
  assert.deepEqual(getRooms(), []);
});

test("history-only rooms appear once with unknown current state", () => {
  reset();
  const insert = db.prepare(`
    INSERT INTO occupancy_sessions (device_id, started_at, ended_at)
    VALUES (?, ?, ?)
  `);
  insert.run("room-102", "2026-11-01T08:00:00.000Z", "2026-11-01T09:00:00.000Z");
  insert.run("room-102", "2026-11-02T08:00:00.000Z", "2026-11-02T09:00:00.000Z");

  assert.deepEqual(getRooms(), [{
    deviceId: "room-102",
    name: "Room 102",
    occupied: null,
    stateSince: null,
    lastSeenAt: null
  }]);
});

test("first vacant readings discover every supported node without sessions", () => {
  reset();
  const timestamp = "2026-11-17T08:00:00.000Z";
  for (let node = 0; node <= 15; node++) {
    assert.equal(updateRoom(`room-${100 + node}`, false, timestamp), true);
  }

  const rooms = getRooms();
  assert.equal(rooms.length, 16);
  assert.deepEqual(rooms[0], {
    deviceId: "room-100",
    name: "Room 100",
    occupied: false,
    stateSince: timestamp,
    lastSeenAt: timestamp
  });
  assert.equal(rooms[15].deviceId, "room-115");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM occupancy_sessions").get().count, 0);
});

test("new occupied rooms appear immediately and track subsequent transitions", () => {
  reset();
  const start = "2026-11-17T08:00:00.000Z";
  const end = "2026-11-17T09:00:00.000Z";
  assert.equal(updateRoom("room-114", true, start), true);
  assert.equal(getRooms()[0].occupied, true);
  assert.equal(updateRoom("room-114", false, end), true);
  assert.equal(updateRoom("room-114", true, start), false);
  assert.equal(getRooms().length, 1);
  assert.equal(getRooms()[0].occupied, false);
  assert.deepEqual(
    db.prepare("SELECT started_at, ended_at FROM occupancy_sessions").get(),
    { started_at: start, ended_at: end }
  );
});

test("invalid IDs and readings cannot create rooms", () => {
  reset();
  for (const id of ["room-99", "room-116", "room-0100", "room-100\n", "other", null, 100]) {
    assert.equal(updateRoom(id, true, "2026-11-17T08:00:00.000Z"), false);
  }
  assert.equal(updateRoom("room-100", "true", "2026-11-17T08:00:00.000Z"), false);
  assert.equal(updateRoom("room-100", true, "invalid"), false);
  assert.deepEqual(getRooms(), []);
});
