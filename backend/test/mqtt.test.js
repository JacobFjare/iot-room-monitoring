const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");

const client = new EventEmitter();
const readings = [];
let broadcasts = 0;
const mocks = [
  [require.resolve("mqtt"), { connect: () => client }],
  [require.resolve("../src/rooms"), {
    updateRoom: (...reading) => {
      readings.push(reading);
      return true;
    }
  }],
  [require.resolve("../src/websocket"), {
    broadcastRooms: () => broadcasts++
  }]
];
for (const [path, exports] of mocks) {
  require.cache[path] = { exports };
}

const keys = ["TTN_MQTT_HOST", "TTN_APP_USERNAME", "TTN_API_KEY"];
const previousEnvironment = keys.map(key => process.env[key]);
for (const key of keys) process.env[key] = "test";
require("../src/mqtt").initMQTT();

after(() => {
  for (const [path] of mocks) delete require.cache[path];
  keys.forEach((key, index) => {
    if (previousEnvironment[index] === undefined) delete process.env[key];
    else process.env[key] = previousEnvironment[index];
  });
});

function send(nodeId) {
  client.emit("message", "test/up", Buffer.from(JSON.stringify({
    end_device_ids: { device_id: "physical-controller" },
    received_at: "2026-11-17T08:00:00.000Z",
    uplink_message: {
      decoded_payload: { node_id: nodeId, occupied: false }
    }
  })));
}

test("MQTT maps simulator nodes to plain string room IDs and broadcasts", () => {
  for (const node of [0, 1, 15]) send(node);
  assert.deepEqual(readings.map(reading => reading[0]), ["0", "1", "15"]);
  assert.equal(broadcasts, 3);
});

test("MQTT still rejects nodes outside the simulator range", () => {
  const count = readings.length;
  for (const node of [-1, 16, 1.5, "1", null]) send(node);
  assert.equal(readings.length, count);
  assert.equal(broadcasts, count);
});
