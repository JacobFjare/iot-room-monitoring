require("dotenv").config();

const mqtt = require("mqtt");

const { WebSocketServer, WebSocket } = require("ws");

// Get connection information from .env
const TTN_MQTT_HOST = process.env.TTN_MQTT_HOST;
const TTN_APP_USERNAME = process.env.TTN_APP_USERNAME;
const TTN_API_KEY = process.env.TTN_API_KEY;

const topic = `v3/${TTN_APP_USERNAME}/devices/+/up`;

// Connect to TTN
const client = mqtt.connect(TTN_MQTT_HOST, {
  username: TTN_APP_USERNAME,
  password: TTN_API_KEY,
  protocolVersion: 4,
});

// Wait for connection
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

// Receive messages
client.on("message", (topic, message) => {
  console.log("Topic:", topic);
  console.log("Message:", message.toString());
});

// Handle connection errors
client.on("error", (err) => {
  console.error("MQTT error:", err.message);
});

const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

// Temporary room data
const rooms = [
  {
    deviceId: 1,
    name: "Room 101",
    occupied: true,
  },
  {
    deviceId: 2,
    name: "Room 102",
    occupied: false,
  },
  {
    deviceId: 3,
    name: "Room 103",
    occupied: false,
  },
];

// HTTP API endpoint
app.get("/api/rooms", (req, res) => {
  res.json(rooms);
});

// Start server
const httpServer = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

// Create a WebSocket server on the same HTTP server
const wss = new WebSocketServer({
  server: httpServer,
  path: "/ws",
});

// Handle new WebSocket connections
wss.on("connection", (socket) => {
  console.log("Dashboard connected!");

  // Send the current rooms immediately
  socket.send(JSON.stringify(rooms));

  socket.on("close", () => {
    console.log("Dashboard disconnected");
  });
});

// Send updated room data to every connected dashboard
function broadcastRooms() {
  const message = JSON.stringify(rooms);

  wss.clients.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  });
}