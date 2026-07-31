// One-off, non-destructive migration for the per-listing digest scheduling
// feature (src/lib/digestJob.js). Adds next_digest_at (TIMESTAMP) to both
// flats and seeker_pins — the "due at" moment the hourly digest job checks
// against, replacing the old single fixed weekly interval.
//
// Going forward this column is set in code, not by a DB default:
// - flats: verifyListingByToken (src/lib/verification.js) sets it to
//   now() + 12h in the same atomic UPDATE that flips status to 'available'.
// - seeker_pins: POST /api/seeker-pins (src/routes/seekerPins.js) sets it to
//   now() + 12h at creation — seeker pins have no verification step at all
//   (confirmed against schema.sql / routes/seekerPins.js), so creation is
//   the moment a pin becomes "active".
//
// Existing rows predate that wiring, so they're backfilled here with the
// same rule applied retroactively: already-verified flats get
// email_verified_at + 12h, existing seeker_pins get created_at + 12h. Both
// backfilled values are frequently already in the past (real dev/demo data
// created well over 12h ago) — that's fine and expected: the next hourly
// job run will simply treat them as immediately due, same as any other due
// row. Rows with no email_verified_at (seed data, or a flat that never
// completed verification) are left NULL and never become due, consistent
// with is_seed=false / status='available' already gating who's eligible.
import { pool } from "../src/db.js";

async function main() {
  await pool.query(`
    ALTER TABLE flats ADD COLUMN IF NOT EXISTS next_digest_at TIMESTAMP;
    ALTER TABLE seeker_pins ADD COLUMN IF NOT EXISTS next_digest_at TIMESTAMP;
  `);

  const flatsBackfilled = await pool.query(`
    UPDATE flats
    SET next_digest_at = email_verified_at + interval '12 hours'
    WHERE next_digest_at IS NULL AND email_verified_at IS NOT NULL
    RETURNING id
  `);

  const seekerPinsBackfilled = await pool.query(`
    UPDATE seeker_pins
    SET next_digest_at = created_at + interval '12 hours'
    WHERE next_digest_at IS NULL
    RETURNING id
  `);

  console.log(
    `next_digest_at backfilled on ${flatsBackfilled.rows.length} flat(s) and ${seekerPinsBackfilled.rows.length} seeker pin(s).`
  );
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
