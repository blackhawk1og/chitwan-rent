// One-off, non-destructive migration for the superheroes leaderboard.
// users has no equivalent to flats.is_seed / seeker_pins.is_seed, so
// db/seed.js's 10 dummy users (who get hero_points assigned directly —
// see seedUsers, not real to-let submissions) currently show up on
// GET /api/superheroes indistinguishably from real spotters.
//
// Same is_seed pattern as flats/seeker_pins. Backfill matches seed.js's
// exact email-generation pattern (`${name}@example.com`, see seedUsers) —
// verified against the live dev DB before writing this: exactly the 10
// seed-created rows match `%@example.com`, every real user has a real
// provider address, so this is safe, not guessed.
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT false;
UPDATE users SET is_seed = true WHERE email LIKE '%@example.com';
`;

async function main() {
  await pool.query(SQL);
  console.log("users.is_seed is up to date (existing seed users backfilled).");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
