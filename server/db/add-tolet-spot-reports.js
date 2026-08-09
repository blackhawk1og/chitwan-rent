// One-off, non-destructive migration — adds report_count/status to
// tolet_spots (same materialized-counter + status-flip shape as flats'
// report_count/status, see add-flat-reports-table.js) and a new
// tolet_spot_reports audit table. Unlike flat_reports, this one carries a
// real UNIQUE(tolet_spot_id, user_id) constraint — flats' own report route
// never dedupes by reporter, but the To-Let spotting feature explicitly
// needs to (see routes/toletSpots.js's POST /:id/report), so the constraint
// itself is what makes a repeat report a no-op instead of trusting route
// logic alone to catch it.
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE tolet_spots ADD COLUMN IF NOT EXISTS report_count INT NOT NULL DEFAULT 0;
-- 'active' | 'removed' — same plain-TEXT-with-comment convention as
-- flats.status (schema.sql), not a DB-level CHECK constraint. Removal is a
-- status flip, never a DELETE, so a reported spot's row (and its report
-- history below) survives for moderation/audit purposes.
ALTER TABLE tolet_spots ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS tolet_spot_reports (
  id SERIAL PRIMARY KEY,
  tolet_spot_id INT REFERENCES tolet_spots(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(tolet_spot_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_tolet_spot_reports_spot_id ON tolet_spot_reports(tolet_spot_id);
`;

async function main() {
  await pool.query(SQL);
  console.log("tolet_spots.report_count/status and tolet_spot_reports are up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
