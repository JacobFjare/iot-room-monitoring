
const express = require("express");

const app = express();

const PORT = 3000;

// Temporary room data
const rooms = [
  {
    id: 1,
    name: "Room 101",
    occupied: true,
  },
  {
    id: 2,
    name: "Room 102",
    occupied: false,
  },
  {
    id: 3,
    name: "Room 103",
    occupied: false,
  },
];

// HTTP API endpoint
app.get("/api/rooms", (req, res) => {
  res.json(rooms);
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});