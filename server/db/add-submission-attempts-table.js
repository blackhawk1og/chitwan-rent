// One-off, non-destructive migration — adds the submission_attempts table
// behind src/lib/submissionRateLimit.js, which rate-limits the endpoints that
// send email on every call: seeker pin creation (a confirmation email to
// whatever address was submitted) and the email-less path through
// POST /api/flats that skipped listing_attempts entirely.
//
// Same "persistent append-only log" shape as listing_attempts
// (add-listing-attempts-table.js) and flat_delete_attempts
// (add-delete-attempts-table.js) rather than an in-memory counter, for the
// same reasons: it survives a dev-server restart and a Render redeploy, and
// a limit can't be cleared just by bouncing the process.
//
// Generic (kind, key) rather than one table per limited endpoint: the rows
// are identical in shape and short-lived in meaning, and a single index
// serves every caller. `kind` names the limit ('seeker_pin', 'listing'),
// `key` is whatever identity that limit counts by — a normalized email, or
// "user:<id>" where no email is involved. See submissionRateLimit.js.
//
// Interest submissions deliberately do NOT write here: flat_interests
// already records (flat_id, user_id, created_at) permanently, so that limit
// reads its own table instead of duplicating rows. listing_attempts exists
// as a side table only because pending flats get hard-deleted and
// users.email diverges via COALESCE; seeker_pins needs one because
// /unsubscribe hard-deletes those rows.
//
// Not pruned on any schedule — same known, accepted growth as
// listing_attempts and flat_delete_attempts.
import { pool } from "../src/db.js";

const SQL = `
CREATE TABLE IF NOT EXISTS submission_attempts (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
-- Matches the check query's own shape exactly: equality on (kind, key), then
-- a range scan on created_at within that group.
CREATE INDEX IF NOT EXISTS idx_submission_attempts_kind_key_created_at
  ON submission_attempts(kind, key, created_at);
`;

async function main() {
  await pool.query(SQL);
  console.log("submission_attempts table is up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
