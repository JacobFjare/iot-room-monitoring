
require("dotenv").config();

const express = require("express");

const roomsRouter = require("./routes/rooms");

const { initWebSocket } = require("./websocket");
const { initMQTT } = require("./mqtt");

const app = express();

const PORT = process.env.PORT || 3000;

// HTTP routes
app.use("/api/rooms", roomsRouter);

// Start HTTP server
const httpServer = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

// Initialize WebSocket server
initWebSocket(httpServer);

// Connect to TTN
initMQTT();
