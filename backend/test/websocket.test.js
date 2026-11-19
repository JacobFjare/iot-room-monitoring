const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const http = require("node:http");
const { randomBytes } = require("node:crypto");
const WebSocket = require("ws");

// Keep WebSocket tests independent of the on-disk database.
const rooms = [{ deviceId: "1", occupied: false }];
const roomsPath = require.resolve("../src/rooms");
require.cache[roomsPath] = { exports: { getRooms: () => rooms } };
const { initWebSocket, broadcastRooms } = require("../src/websocket");

after(() => {
  delete require.cache[roomsPath];
});

test("malformed frames only disconnect the faulty WebSocket client", { timeout: 5000 }, async (t) => {
  const server = http.createServer((req, res) => res.end("ok"));
  const connections = new Set();
  server.on("connection", socket => {
    connections.add(socket);
    socket.on("close", () => connections.delete(socket));
  });
  t.after(() => {
    for (const socket of connections) socket.destroy();
    return new Promise(resolve => server.close(resolve));
  });
  initWebSocket(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = `127.0.0.1:${server.address().port}`;

  const healthy = new WebSocket(`ws://${address}/ws`);
  t.after(() => healthy.terminate());
  const [initial] = await once(healthy, "message");
  assert.deepEqual(JSON.parse(initial.toString()), rooms);

  // Upgrade a raw HTTP connection so we can send an intentionally invalid frame.
  const request = http.request(`http://${address}/ws`, {
    headers: {
      Connection: "Upgrade",
      Upgrade: "websocket",
      "Sec-WebSocket-Version": "13",
      "Sec-WebSocket-Key": randomBytes(16).toString("base64")
    }
  });
  const upgraded = once(request, "upgrade");
  request.end();
  const [, faulty] = await upgraded;
  const closed = once(faulty, "close");
  faulty.resume();

  // FIN + reserved opcode 3, with a masked empty payload.
  faulty.write(Buffer.from([0x83, 0x80, 0, 0, 0, 0]));
  await closed;

  const response = await fetch(`http://${address}/`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "ok");

  assert.equal(healthy.readyState, WebSocket.OPEN);
  const nextMessage = once(healthy, "message");
  rooms[0].occupied = true;
  broadcastRooms();
  const [updated] = await nextMessage;
  assert.deepEqual(JSON.parse(updated.toString()), rooms);

  const newcomer = new WebSocket(`ws://${address}/ws`);
  t.after(() => newcomer.terminate());
  const [snapshot] = await once(newcomer, "message");
  assert.deepEqual(JSON.parse(snapshot.toString()), rooms);
});
