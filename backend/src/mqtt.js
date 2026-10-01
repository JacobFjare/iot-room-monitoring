
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

      console.log("Received MQTT message:", data);

      const deviceId = data.end_device_ids?.device_id;

      const occupied =
        data.uplink_message?.decoded_payload?.occupied;

      // Ignore messages without a valid occupancy value
      if (
        !deviceId ||
        typeof occupied !== "boolean"
      ) {
        return;
      }

      // Update the room state
      const changed = updateRoom(deviceId, occupied);

      // Notify Angular when a room changes
      if (changed) {
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
