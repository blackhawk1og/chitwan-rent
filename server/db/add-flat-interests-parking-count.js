// One-off, non-destructive migration — adds flat_interests.parking_count,
// the number-of-spots follow-up to the parking_required boolean added in
// add-flat-interests-preferences.js. Nullable, no DEFAULT, same convention
// as that migration and as flats.parking_for/rent_reports.parking_for: only
// meaningful when parking_required is true, so InterestForm.jsx only shows
// the field (and only ever sends a non-null value) once "Yes, need parking"
// is picked.
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE flat_interests ADD COLUMN IF NOT EXISTS parking_count INT;
`;

async function main() {
  await pool.query(SQL);
  console.log("flat_interests.parking_count is up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
