
const express = require("express");

const { getRooms } = require("../rooms");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(getRooms());
});

module.exports = router;
