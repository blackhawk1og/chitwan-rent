// One-off, non-destructive migration — adds the listing_attempts table used
// to rate-limit "List My Flat" submissions to one per email per 24h (see
// src/lib/listingRateLimit.js). Deliberately separate from flats/users:
// flats.owner_id resolves through users.email, but users.email is filled via
// COALESCE at submit time (see POST /flats) so it can silently diverge from
// the email actually typed on a later attempt, and expired pending_verification
// flats rows get hard-deleted by the cleanup job — neither table gives a
// reliable, permanent record of "this email already attempted a listing."
import { pool } from "../src/db.js";

const SQL = `
CREATE TABLE IF NOT EXISTS listing_attempts (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_listing_attempts_email_created_at ON listing_attempts(email, created_at);
`;

async function main() {
  await pool.query(SQL);
  console.log("listing_attempts table is up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
