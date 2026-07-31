// One-off, non-destructive migration — adds the flat_delete_attempts table
// used to rate-limit wrong delete-code guesses per flat ID (see
// src/lib/deleteAttemptLimit.js). Same shape and rationale as
// listing_attempts (add-listing-attempts-table.js): a persistent table
// rather than an in-memory counter, so the lockout survives a dev-server
// restart (this project's `node --watch` restarts often) instead of quietly
// resetting brute-force protection every time a file is saved.
//
// FK'd to flats with ON DELETE CASCADE purely for tidiness — a flat that's
// been deleted (the only way its attempt rows could ever go stale) takes its
// own attempt log with it; nothing reads this table by flat_id once that
// flat_id no longer exists in flats.
import { pool } from "../src/db.js";

const SQL = `
CREATE TABLE IF NOT EXISTS flat_delete_attempts (
  id SERIAL PRIMARY KEY,
  flat_id INT REFERENCES flats(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flat_delete_attempts_flat_id_created_at ON flat_delete_attempts(flat_id, created_at);
`;

async function main() {
  await pool.query(SQL);
  console.log("flat_delete_attempts table is up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
