// One-off, non-destructive migration — adds the flat_reports table and a
// materialized report_count on flats (same pattern as flats.rating: updated
// on each new submission rather than joined/aggregated on every read).
import { pool } from "../src/db.js";

const SQL = `
CREATE TABLE IF NOT EXISTS flat_reports (
  id SERIAL PRIMARY KEY,
  flat_id INT REFERENCES flats(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flat_reports_flat_id ON flat_reports(flat_id);
ALTER TABLE flats ADD COLUMN IF NOT EXISTS report_count INT NOT NULL DEFAULT 0;
`;

async function main() {
  await pool.query(SQL);
  console.log("flat_reports table and flats.report_count are up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
