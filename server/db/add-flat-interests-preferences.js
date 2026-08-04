// One-off, non-destructive migration for the "I'm interested" form's new
// optional fields (InterestForm.jsx — Move-in Timeline / "You are" / Parking
// required, added in a prior task; name was removed from that same form and
// needs no migration since flat_interests.name was already nullable at the
// DB level — only routes/flats.js's application-level requirement on it is
// being dropped). All three new columns are nullable, no DEFAULT — matches
// db/add-rent-reports-furnishing-parking.js's own reasoning: these are
// genuinely optional, unlike a required field that needs a sensible default.
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE flat_interests ADD COLUMN IF NOT EXISTS move_in TEXT; -- 'asap'|'next_month'|'flexible', matches flats.available_from's vocabulary
ALTER TABLE flat_interests ADD COLUMN IF NOT EXISTS gender TEXT; -- 'male'|'female'|'other', matches seeker_pins.gender's vocabulary
ALTER TABLE flat_interests ADD COLUMN IF NOT EXISTS parking_required BOOLEAN;
`;

async function main() {
  await pool.query(SQL);
  console.log("flat_interests.move_in / gender / parking_required are up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
