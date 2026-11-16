
process.env.TZ = "Europe/Copenhagen";

const db = require("../src/database");

const DAYS = 60;

// Times are in local Danish time:
// [startHour, startMinute, endHour, endMinute]
const schedules = {
  "room-101": {
    weekday: [
      [8, 30, 10, 15],
      [11, 0, 12, 30],
      [13, 15, 16, 0]
    ],
    weekend: [
      [10, 30, 12, 0]
    ]
  },

  "room-102": {
    weekday: [
      [9, 0, 11, 30],
      [12, 45, 15, 15]
    ],
    weekend: []
  },

  "room-103": {
    weekday: [
      [8, 45, 10, 0],
      [10, 45, 13, 0],
      [14, 0, 17, 0]
    ],
    weekend: [
      [11, 0, 12, 15]
    ]
  }
};

// Prevent duplicate or overlapping sessions
const findOverlap = db.prepare(`
  SELECT id
  FROM occupancy_sessions
  WHERE device_id = ?
    AND started_at < ?
    AND (ended_at IS NULL OR ended_at > ?)
  LIMIT 1
`);

const insertSession = db.prepare(`
  INSERT INTO occupancy_sessions (
    device_id,
    started_at,
    ended_at
  )
  VALUES (?, ?, ?)
`);

let inserted = 0;
let skipped = 0;

const today = new Date();
today.setHours(0, 0, 0, 0);

const seedHistory = db.transaction(() => {

  for (let daysAgo = DAYS; daysAgo >= 1; daysAgo--) {

    const day = new Date(today);
    day.setDate(day.getDate() - daysAgo);

    const isWeekend =
      day.getDay() === 0 || day.getDay() === 6;

    Object.entries(schedules).forEach(
      ([deviceId, schedule], roomIndex) => {

        const sessions = isWeekend
          ? schedule.weekend
          : schedule.weekday;

        // Occasionally skip a weekday to simulate no usage
        if (
          !isWeekend &&
          (day.getDate() + roomIndex * 3) % 13 === 0
        ) {
          return;
        }

        sessions.forEach((slot, slotIndex) => {

          const [startHour, startMinute, endHour, endMinute] = slot;

          // Small, repeatable variations between days
          const variation =
            ((day.getDate() + roomIndex * 3 + slotIndex) % 5 - 2) * 7;

          const start = new Date(day);
          start.setHours(
            startHour,
            startMinute + variation,
            0, 0
          );

          const end = new Date(day);
          end.setHours(
            endHour,
            endMinute + variation,
            0, 0
          );

          const startedAt = start.toISOString();
          const endedAt = end.toISOString();

          const overlap = findOverlap.get(
            deviceId,
            endedAt,
            startedAt
          );

          if (overlap) {
            skipped++;
            return;
          }

          insertSession.run(
            deviceId,
            startedAt,
            endedAt
          );

          inserted++;
        });
      }
    );
  }
});

seedHistory();

console.log(`Inserted ${inserted} sessions`);
console.log(`Skipped ${skipped} overlapping sessions`);

console.log("\nOccupancy summary:");

console.table(
  db.prepare(`
    SELECT
      device_id,
      COUNT(*) AS sessions,
      ROUND(
        SUM(
          unixepoch(ended_at) -
          unixepoch(started_at)
        ) / 3600.0,
        1
      ) AS occupied_hours
    FROM occupancy_sessions
    WHERE ended_at IS NOT NULL
    GROUP BY device_id
    ORDER BY occupied_hours DESC
  `).all()
);
