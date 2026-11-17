# Backend development data

Room IDs are non-empty strings, such as `"1"`, `"23"`, or `"134A"`.
Names are generated as `Room <ID>`. The API and WebSocket payloads retain
the `deviceId` field for frontend compatibility; this is the room ID,
not the physical microcontroller's TTN device ID. SQLite retains the
existing `device_id` text columns for the same purpose.

The current MQTT simulator accepts `node_id` values 0–15 and converts them
to string room IDs `"0"`–`"15"`. This restriction applies only to simulator
ingestion, not to room storage. Production device-to-room mapping is not
implemented yet.

Only rooms with a saved state or occupancy history are listed. No list
is cached, and a new accepted MQTT reading triggers a WebSocket broadcast.

## Replace development data

Stop the backend first, then run these commands from `backend/`.
**The reset permanently deletes all occupancy sessions and room states.**

```sh
node scripts/reset-dev-data.js --confirm
node scripts/seed-history.js
node scripts/simulate-occupancy.js 1
node scripts/simulate-occupancy.js 2
node scripts/simulate-occupancy.js 3
npm start
```

The history script generates 60 previous days for rooms `"1"`, `"2"`,
and `"3"`. The simulation script adds recent readings for the supplied
room ID (default `"1"`). It writes directly to SQLite, not through MQTT.
Old URLs containing IDs such as `room-101` no longer resolve after resetting.

Run isolated in-memory tests with `npm test`.
