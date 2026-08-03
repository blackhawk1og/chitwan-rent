// One-off, non-destructive migration — adds rent_flagged, set true only when
// the owner explicitly confirms an over-cap rent through the List My Flat
// form's "Double-check this pin?" modal (see client's AddFlatForm.jsx /
// RentCapConfirmModal.jsx). Flagged listings stay visible on the map and
// under ?status=available — they're excluded only from the digest job's
// matching pool (see ACTIVE_FLATS_SQL in src/lib/digestJob.js), same
// exclusion pattern as is_seed.
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE flats ADD COLUMN IF NOT EXISTS rent_flagged BOOLEAN NOT NULL DEFAULT false;
`;

async function main() {
  await pool.query(SQL);
  console.log("flats.rent_flagged is up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
