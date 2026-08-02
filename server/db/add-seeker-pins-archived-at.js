// One-off, non-destructive migration for the seeker-pin archive-check flow
// (routes/seekerPins.js, client's ArchiveCheckPinsModal.jsx). seeker_pins had
// no active/inactive concept at all before this — every row was treated as
// active forever (see the old comment on digestJob.js's ACTIVE_SEEKERS_SQL).
// archived_at is a SOFT state, not a delete: archived rows stay in the table
// permanently (needed for the read-only history section in the modal), just
// excluded from matching/digests/the map once set. One-directional — nothing
// in this feature ever sets archived_at back to NULL.
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE seeker_pins ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
`;

async function main() {
  await pool.query(SQL);
  console.log("seeker_pins.archived_at is up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
