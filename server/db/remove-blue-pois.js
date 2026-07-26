// One-off cleanup: shop, fuel, and gym were removed from the general-POI
// category set (they were the only categories using Google's "blue"
// general-POI color, and the user asked to clear every blue pin off the
// map) — this deletes the rows already seeded under those categories from
// an earlier run (seed-general-pois.js no longer fetches them, so this only
// needs to run once against a DB that has leftover rows). Schools/colleges
// also used to be blue but were recolored to purple instead of removed, so
// they're untouched here. Run with: node db/remove-blue-pois.js
import { pool } from "../src/db.js";

async function main() {
  const result = await pool.query("DELETE FROM pois WHERE category = ANY($1)", [["shop", "fuel", "gym"]]);
  console.log(`Removed ${result.rowCount} shop/fuel/gym POI rows.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Cleanup failed:", err.message);
  process.exit(1);
});
