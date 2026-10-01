
const { WebSocketServer, WebSocket } = require("ws");

const { getRooms } = require("./rooms");

let wss;

function initWebSocket(httpServer) {
  wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
  });

  wss.on("connection", (socket) => {
    console.log("Dashboard connected!");

    // Send the current room states immediately
    socket.send(JSON.stringify(getRooms()));

    socket.on("close", () => {
      console.log("Dashboard disconnected");
    });
  });
}

function broadcastRooms() {
  if (!wss) {
    return;
  }

  const message = JSON.stringify(getRooms());

  wss.clients.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  });
}

module.exports = {
  initWebSocket,
  broadcastRooms,
};
