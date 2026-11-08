
const Database = require("better-sqlite3");
const fs = require("node:fs");
const path = require("node:path");

const dataDir = path.join(__dirname, "../data");

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(
  path.join(dataDir, "occupancy.db")
);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS occupancy_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,

    CHECK (
      ended_at IS NULL OR ended_at >= started_at
    )
  );

  CREATE UNIQUE INDEX IF NOT EXISTS
    one_open_session_per_room
  ON occupancy_sessions(device_id)
  WHERE ended_at IS NULL;

  CREATE TABLE IF NOT EXISTS room_state (
    device_id TEXT PRIMARY KEY,
    occupied INTEGER NOT NULL
      CHECK (occupied IN (0, 1)),
    state_since TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );
`);

module.exports = db;
