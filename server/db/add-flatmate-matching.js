// One-off, non-destructive migration for the flatmate contact-matching
// feature (periodic job in src/lib/matchingJob.js). Two additive pieces:
//
// 1. seeker_pins.is_seed — flats already has this exact flag for telling
//    seed.js's dummy rows apart from real submissions (see its column
//    comment in schema.sql); seeker_pins never had an equivalent, and
//    without one the matching job would happily email match notifications
//    referencing seed.js's ~40 dummy pins (fake @example.com addresses,
//    fake phone numbers) to real flat owners. The backfill below marks
//    every *existing* seeker_pins row whose email matches seed.js's exact
//    generation pattern (`${name}@example.com`, see seedSeekerPins in
//    db/seed.js) — safe because that pattern is fully known, not guessed.
//    seed.js itself is updated separately to set is_seed=true going forward.
//
// 2. matches — records every flat/seeker-pin pair the job has already
//    emailed, so a compatible pair is only ever notified once no matter how
//    many times the job re-runs. UNIQUE(flat_id, seeker_pin_id) is what
//    enforces that (via ON CONFLICT DO NOTHING in the job itself).
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE seeker_pins ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT false;
UPDATE seeker_pins SET is_seed = true WHERE email LIKE '%@example.com';

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  flat_id INT REFERENCES flats(id) ON DELETE CASCADE,
  seeker_pin_id INT REFERENCES seeker_pins(id) ON DELETE CASCADE,
  matched_at TIMESTAMP DEFAULT now(),
  UNIQUE (flat_id, seeker_pin_id)
);
CREATE INDEX IF NOT EXISTS idx_matches_flat_id ON matches(flat_id);
CREATE INDEX IF NOT EXISTS idx_matches_seeker_pin_id ON matches(seeker_pin_id);
`;

async function main() {
  await pool.query(SQL);
  console.log("seeker_pins.is_seed (backfilled) and matches table are up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
