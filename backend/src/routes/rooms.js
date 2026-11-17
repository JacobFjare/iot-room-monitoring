
const express = require("express");

const { getRooms } = require("../rooms");
const { getRoomStatistics } = require("../statistics");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(getRooms());
});

// Room-specific statistics
router.get("/:deviceId/statistics", (req, res) => {
  const { deviceId } = req.params;

  const {
    period = "7d",
    view = "daily"
  } = req.query;

  const room = getRooms().find(
    room => room.deviceId === deviceId
  );

  if (!room) {
    return res.status(404).json({
      error: "Room not found"
    });
  }

  const valid =
    (period === "7d" && view === "daily") ||
    (period === "month" && view === "hourly");

  if (!valid) {
    return res.status(400).json({
      error: "Unsupported period or view"
    });
  }

  try {
    const statistics = getRoomStatistics(
      deviceId, period, view
    );

    res.json({
      deviceId,
      name: room.name,
      ...statistics
    });

  } catch (error) {
    console.error("Statistics error:", error);

    res.status(500).json({
      error: "Could not calculate statistics"
    });
  }
});

module.exports = router;
