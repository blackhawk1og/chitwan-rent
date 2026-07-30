// One-off, non-destructive migration for email-verified "List My Flat"
// listings — safe to run against a dev DB that already has seeded data
// (unlike run-schema.js, which drops everything). Matches the style of
// add-flat-listing-details.js.
//
// No new status column: 'pending_verification' is just a new value in the
// existing flats.status TEXT column (see schema.sql's comment listing its
// current values) — reconciled with, not parallel to, the existing
// pending_review/available/rented status mechanism in flats.js.
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE flats ADD COLUMN IF NOT EXISTS verification_token TEXT UNIQUE;
ALTER TABLE flats ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP;
ALTER TABLE flats ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
`;

async function main() {
  await pool.query(SQL);
  console.log("flats table's email-verification columns are up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
