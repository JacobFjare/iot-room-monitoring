
const mqtt = require("mqtt");

const { updateRoom } = require("./rooms");
const { broadcastRooms } = require("./websocket");

function initMQTT() {
  const TTN_MQTT_HOST = process.env.TTN_MQTT_HOST;
  const TTN_APP_USERNAME = process.env.TTN_APP_USERNAME;
  const TTN_API_KEY = process.env.TTN_API_KEY;

  if (!TTN_MQTT_HOST || !TTN_APP_USERNAME || !TTN_API_KEY) {
    throw new Error("Missing required TTN environment variables");
  }

  const topic = `v3/${TTN_APP_USERNAME}/devices/+/up`;

  const client = mqtt.connect(TTN_MQTT_HOST, {
    username: TTN_APP_USERNAME,
    password: TTN_API_KEY,
    protocolVersion: 4,
  });

  client.on("connect", () => {
    console.log("Connected to TTN MQTT broker!");

    client.subscribe(topic, (err) => {
      if (err) {
        console.error("Subscription failed:", err);
      } else {
        console.log("Subscribed to:", topic);
      }
    });
  });


client.on("message", (topic, message) => {
  try {
    const data = JSON.parse(message.toString());

    const nodeId = data.uplink_message?.decoded_payload?.node_id;
    const occupied = data.uplink_message?.decoded_payload?.occupied;
    const receivedAt = data.received_at;

    // Validate the incoming data
    if (
      !Number.isInteger(nodeId) ||
      nodeId < 0 ||
      nodeId > 15 ||
      typeof occupied !== "boolean" ||
      !receivedAt ||
      Number.isNaN(Date.parse(receivedAt))
    ) {
      console.log("Invalid MQTT payload");
      return;
    }

    // Map the simulated node to a room
    const roomId = String(nodeId);
    console.log("Received TTN message:", {
      ttnDeviceId: data.end_device_ids?.device_id,
      nodeId,
      roomId,
      occupied,
      receivedAt
    });

    const updated = updateRoom(roomId, occupied, receivedAt);

    if (updated) {
      broadcastRooms();
    }

  } catch (err) {
    console.error("Failed to process MQTT message:", err);
  }
});


  client.on("error", (err) => {
    console.error("MQTT error:", err.message);
  });

  return client;
}

module.exports = {
  initMQTT,
};
