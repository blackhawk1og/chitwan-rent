// One-off, non-destructive migration — adds the column that lets the
// internal dashboard's Reports section (routes/dashboard.js) show whether
// the report-removal owner-notification email actually sent, instead of
// "unknown — not tracked in DB" for every row (see this feature's own
// earlier gap note). Nullable, no backfill: flats that already crossed
// REPORT_REMOVAL_THRESHOLD before this column existed (e.g. flats 189, 187
// at the time this was written) have no way to know their true outcome —
// backfilling a guess would be worse than an honest null. See routes/
// flats.js's REPORT_REMOVAL_EMAIL_TRACKING_STARTED_AT for how the dashboard
// tells "genuinely not sent" apart from "predates this column" using that
// same honest-null value.
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE flats ADD COLUMN IF NOT EXISTS report_removal_email_sent_at TIMESTAMP;
`;

async function main() {
  await pool.query(SQL);
  const now = await pool.query("SELECT now()");
  console.log("flats.report_removal_email_sent_at is up to date.");
  console.log(`Migration run at (use this for REPORT_REMOVAL_EMAIL_TRACKING_STARTED_AT): ${now.rows[0].now.toISOString()}`);
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
