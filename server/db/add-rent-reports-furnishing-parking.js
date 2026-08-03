// One-off, non-destructive migration — adds furnishing/parking_for to
// rent_reports so future comparisons against flats' own listing details
// (see this feature's task) line up without translating field names. Both
// columns are optional (nullable, no DEFAULT) since a rent report may not
// specify them — unlike flats.parking_for, which the listing form requires.
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE rent_reports ADD COLUMN IF NOT EXISTS furnishing TEXT CHECK (furnishing IN ('furnished','unfurnished'));
ALTER TABLE rent_reports ADD COLUMN IF NOT EXISTS parking_for INT;
`;

async function main() {
  await pool.query(SQL);
  console.log("rent_reports.furnishing / parking_for are up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
