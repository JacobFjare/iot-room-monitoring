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
  insert.run("2", "2026-11-01T08:00:00.000Z", "2026-11-01T09:00:00.000Z");
  insert.run("2", "2026-11-02T08:00:00.000Z", "2026-11-02T09:00:00.000Z");

  assert.deepEqual(getRooms(), [{
    deviceId: "2",
    name: "Room 2",
    occupied: null,
    stateSince: null,
    lastSeenAt: null
  }]);
});

test("first vacant readings discover every supported node without sessions", () => {
  reset();
  const timestamp = "2026-11-17T08:00:00.000Z";
  for (let node = 0; node <= 15; node++) {
    assert.equal(updateRoom(String(node), false, timestamp), true);
  }

  const rooms = getRooms();
  assert.equal(rooms.length, 16);
  assert.deepEqual(rooms[0], {
    deviceId: "0",
    name: "Room 0",
    occupied: false,
    stateSince: timestamp,
    lastSeenAt: timestamp
  });
  assert.deepEqual(
    new Set(rooms.map(room => room.deviceId)),
    new Set(Array.from({ length: 16 }, (_, node) => String(node)))
  );
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM occupancy_sessions").get().count, 0);
});

test("new occupied rooms appear immediately and track subsequent transitions", () => {
  reset();
  const start = "2026-11-17T08:00:00.000Z";
  const end = "2026-11-17T09:00:00.000Z";
  assert.equal(updateRoom("134A", true, start), true);
  assert.equal(getRooms()[0].occupied, true);
  assert.equal(updateRoom("134A", false, end), true);
  assert.equal(updateRoom("134A", true, start), false);
  assert.equal(getRooms().length, 1);
  assert.equal(getRooms()[0].occupied, false);
  assert.deepEqual(
    db.prepare("SELECT started_at, ended_at FROM occupancy_sessions").get(),
    { started_at: start, ended_at: end }
  );
});

test("invalid IDs and readings cannot create rooms", () => {
  reset();
  for (const id of ["", " ", "\t\n", null, undefined, 100, {}, []]) {
    assert.equal(updateRoom(id, true, "2026-11-17T08:00:00.000Z"), false);
  }
  assert.equal(updateRoom("23", "true", "2026-11-17T08:00:00.000Z"), false);
  assert.equal(updateRoom("23", true, "invalid"), false);
  assert.deepEqual(getRooms(), []);
});

test("room IDs are not restricted to simulator nodes or a room prefix", () => {
  reset();
  for (const roomId of ["134A", "255B", "23", "2A"]) {
    assert.equal(updateRoom(roomId, false, "2026-11-17T08:00:00.000Z"), true);
    assert.equal(
      getRooms().find(room => room.deviceId === roomId).name,
      `Room ${roomId}`
    );
  }
});

test("HTTP statistics and WebSocket payloads support plain string room IDs", async (t) => {
  reset();
  const express = require("express");
  const { once } = require("node:events");
  const WebSocket = require("ws");
  const { initWebSocket, broadcastRooms } = require("../src/websocket");
  const app = express();
  app.use("/api/rooms", require("../src/routes/rooms"));
  const server = app.listen(0, "127.0.0.1");
  initWebSocket(server);
  t.after(() => new Promise(resolve => {
    server.closeAllConnections();
    server.close(resolve);
  }));
  await once(server, "listening");
  const address = `127.0.0.1:${server.address().port}`;

  updateRoom("134A", false, new Date().toISOString());
  const response = await fetch(`http://${address}/api/rooms/134A/statistics?period=7d&view=daily`);
  assert.equal(response.status, 200);
  const statistics = await response.json();
  assert.equal(statistics.deviceId, "134A");
  assert.equal(statistics.name, "Room 134A");
  assert.equal(statistics.data.length, 7);
  const monthly = await fetch(`http://${address}/api/rooms/134A/statistics?period=month&view=hourly`);
  assert.equal(monthly.status, 200);
  assert.equal((await monthly.json()).data.length, 24);
  const missing = await fetch(`http://${address}/api/rooms/unknown/statistics`);
  assert.equal(missing.status, 404);

  const socket = new WebSocket(`ws://${address}/ws`);
  t.after(() => socket.terminate());
  const [initial] = await once(socket, "message");
  assert.deepEqual(JSON.parse(initial.toString()), getRooms());

  const nextMessage = once(socket, "message");
  updateRoom("255B", true, new Date().toISOString());
  broadcastRooms();
  const [updated] = await nextMessage;
  const rooms = JSON.parse(updated.toString());
  assert.equal(rooms.length, 2);
  assert.equal(rooms.find(room => room.deviceId === "255B").name, "Room 255B");
  const closed = once(socket, "close");
  socket.close();
  await closed;
});
