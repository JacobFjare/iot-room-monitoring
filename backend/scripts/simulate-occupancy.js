
const { updateRoom, getRooms } = require("../src/rooms");
const db = require("../src/database");

// Optional room ID argument, e.g. node scripts/simulate-occupancy.js 2
const roomId = process.argv[2] ?? "1";
const now = Date.now();

// Simulate readings at different times
const readings = [
  { minutesAgo: 20, occupied: false },
  { minutesAgo: 15, occupied: true },
  { minutesAgo: 10, occupied: true },
  { minutesAgo: 5, occupied: false },
  { minutesAgo: 2, occupied: true }
];

for (const reading of readings) {
  const timestamp = new Date(
    now - reading.minutesAgo * 60_000
  ).toISOString();

  const accepted = updateRoom(
    roomId,
    reading.occupied,
    timestamp
  );

  console.log(
    `${timestamp}: occupied=${reading.occupied}, accepted=${accepted}`
  );
}

// Inspect resulting occupancy sessions
console.log("\nOccupancy sessions:");

console.table(
  db.prepare(`
    SELECT *
    FROM occupancy_sessions
    WHERE device_id = ?
    ORDER BY started_at
  `).all(roomId)
);

console.log("\nCurrent room state:");
console.log(getRooms().find(r => r.deviceId === roomId));
