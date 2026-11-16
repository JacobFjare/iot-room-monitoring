
const db = require("./database");
const { DateTime } = require("luxon");

const TIMEZONE = "Europe/Copenhagen";
const STALE_AFTER_MS = 35 * 60 * 1000;

// Fetch sessions that might overlap a requested period
const selectSessions = db.prepare(`
  SELECT
    s.started_at,
    s.ended_at,
    r.last_seen_at
  FROM occupancy_sessions s
  LEFT JOIN room_state r
    ON r.device_id = s.device_id
  WHERE s.device_id = ?
    AND s.started_at < ?
    AND (s.ended_at IS NULL OR s.ended_at > ?)
`);

// Return sessions as timestamps in milliseconds
function getSessions(deviceId, start, end, now) {
  const rows = selectSessions.all(
    deviceId,
    end.toUTC().toISO(),
    start.toUTC().toISO()
  );

  return rows.map(row => {
    const startedAt = Date.parse(row.started_at);

    // Closed sessions use their actual end time.
    // Open sessions are capped using the latest heartbeat.
    const endedAt = row.ended_at
      ? Date.parse(row.ended_at)
      : row.last_seen_at
        ? Math.min(
            now.toMillis(),
            Date.parse(row.last_seen_at) + STALE_AFTER_MS
          )
        : NaN;

    return {
      start: startedAt,
      end: endedAt
    };
  }).filter(session =>
    Number.isFinite(session.start) &&
    Number.isFinite(session.end) &&
    session.end > session.start
  );
}

// How many occupied minutes fall inside a time interval?
function occupiedMinutes(sessions, from, to) {
  let total = 0;

  for (const session of sessions) {
    total += Math.max(
      0,
      Math.min(session.end, to) -
      Math.max(session.start, from)
    );
  }

  return total / 60000;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

// Last seven calendar days, including today
function getDailyStatistics(deviceId, now) {
  const today = now.startOf("day");
  const firstDay = today.minus({ days: 6 });

  const sessions = getSessions(
    deviceId, firstDay, now, now
  );

  const data = [];

  for (let i = 0; i < 7; i++) {
    const day = firstDay.plus({ days: i });
    const nextDay = day.plus({ days: 1 });

    const minutes = occupiedMinutes(
      sessions,
      day.toMillis(),
      Math.min(nextDay.toMillis(), now.toMillis())
    );

    data.push({
      date: day.toISODate(),
      occupiedMinutes: round1(minutes)
    });
  }

  return {
    period: "7d",
    view: "daily",
    timezone: TIMEZONE,
    data
  };
}

// Average occupied minutes per hour across completed
// days in the current month
function getHourlyStatistics(deviceId, now) {
  const today = now.startOf("day");
  const firstDay = today.startOf("month");

  const sessions = getSessions(
    deviceId, firstDay, today, now
  );

  const totals = Array(24).fill(0);
  const occurrences = Array(24).fill(0);

  for (
    let day = firstDay;
    day.toMillis() < today.toMillis();
    day = day.plus({ days: 1 })
  ) {
    const nextDay = day.plus({ days: 1 });

    for (
      let hour = day;
      hour.toMillis() < nextDay.toMillis();
      hour = hour.plus({ hours: 1 })
    ) {
      const index = hour.hour;

      totals[index] += occupiedMinutes(
        sessions,
        hour.toMillis(),
        hour.plus({ hours: 1 }).toMillis()
      );

      occurrences[index]++;
    }
  }

  const data = totals.map((minutes, hour) => ({
    hour: `${String(hour).padStart(2, "0")}:00`,
    averageOccupiedMinutes: occurrences[hour] > 0
      ? round1(minutes / occurrences[hour])
      : null
  }));

  return {
    period: "month",
    view: "hourly",
    timezone: TIMEZONE,
    daysIncluded: today.day - 1,
    data
  };
}

function getRoomStatistics(deviceId, period, view) {
  const now = DateTime.now().setZone(TIMEZONE);

  if (period === "7d" && view === "daily") {
    return getDailyStatistics(deviceId, now);
  }

  if (period === "month" && view === "hourly") {
    return getHourlyStatistics(deviceId, now);
  }

  throw new Error("Unsupported statistics options");
}

module.exports = { getRoomStatistics };
