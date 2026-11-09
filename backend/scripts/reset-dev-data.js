
const db = require("../src/database");

if (!process.argv.includes("--confirm")) {
  console.log(
    "This will delete ALL occupancy sessions and room states."
  );
  console.log(
    "Run: node scripts/reset-dev-data.js --confirm"
  );

  process.exit(1);
}

const resetDatabase = db.transaction(() => {

  db.prepare("DELETE FROM occupancy_sessions").run();
  db.prepare("DELETE FROM room_state").run();

});

resetDatabase();

console.log("Development occupancy data cleared.");
