// One-off, non-destructive migration for the extended "List My Flat" flow
// (branch choice -> final details -> success/share) — safe to run against a
// dev DB that already has seeded data (unlike run-schema.js, which drops
// everything).
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE flats ADD COLUMN IF NOT EXISTS available_from TEXT CHECK (available_from IN ('asap','next_month','flexible'));
ALTER TABLE flats ADD COLUMN IF NOT EXISTS flatmate_gender_pref TEXT;
ALTER TABLE flats ADD COLUMN IF NOT EXISTS food_pref TEXT;
ALTER TABLE flats ADD COLUMN IF NOT EXISTS smoker_ok TEXT;
`;

async function main() {
  await pool.query(SQL);
  console.log("flats table's List My Flat detail columns are up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
