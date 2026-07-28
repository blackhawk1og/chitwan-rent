// One-off, non-destructive migration — adds is_seed and backfills it on
// existing rows. Seed accounts are the fixed batch of 10 users created by
// seed.js (ids 1-10, all inserted in the same timestamp) or NULL owner_id;
// every id above that range was created live through a real POST /api/flats
// call (dev/test sessions included), which is exactly the distinction
// is_seed exists to capture — see FlatDetailPanel.jsx's "Not for rent" banner.
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE flats ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT false;
UPDATE flats SET is_seed = true WHERE owner_id IS NULL OR owner_id <= 10;
`;

async function main() {
  await pool.query(SQL);
  console.log("flats.is_seed is up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
