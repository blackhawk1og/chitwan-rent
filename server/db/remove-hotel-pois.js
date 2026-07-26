// One-off cleanup: hotel was removed from the general-POI category set —
// this deletes the rows already seeded under that category from an earlier
// run (seed-general-pois.js no longer fetches them, so this only needs to
// run once against a DB that has leftover rows). Run with:
// node db/remove-hotel-pois.js
import { pool } from "../src/db.js";

async function main() {
  const result = await pool.query("DELETE FROM pois WHERE category = $1", ["hotel"]);
  console.log(`Removed ${result.rowCount} hotel POI rows.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Cleanup failed:", err.message);
  process.exit(1);
});
