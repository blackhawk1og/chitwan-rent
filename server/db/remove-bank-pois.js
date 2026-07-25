// One-off cleanup: bank/ATM was removed from the general-POI category set —
// this deletes the rows already seeded under those categories from an
// earlier run (seed-general-pois.js no longer fetches them, so this only
// needs to run once against a DB that has leftover rows). Run with:
// node db/remove-bank-pois.js
import { pool } from "../src/db.js";

async function main() {
  const result = await pool.query("DELETE FROM pois WHERE category = ANY($1)", [["bank", "atm"]]);
  console.log(`Removed ${result.rowCount} bank/ATM POI rows.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Cleanup failed:", err.message);
  process.exit(1);
});
