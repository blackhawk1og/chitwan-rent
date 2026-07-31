// One-off, non-destructive migration for the weekly match-digest feature
// (src/lib/digestJob.js), which replaces the old per-pair instant-match-email
// job. Two pieces:
//
// 1. unsubscribe_token — added to both flats and seeker_pins. Plain-text,
//    compared directly on lookup (see routes/unsubscribe.js), same pattern
//    already used for flats.verification_token (not hashed like
//    delete_code_hash — this token is a link parameter a user clicks, never
//    manually typed). Generated once per row going forward: flats get theirs
//    inside verifyListingByToken's atomic UPDATE (lib/verification.js), the
//    same moment delete_code_hash is created; seeker_pins get theirs at
//    creation time in POST /api/seeker-pins, since seeker pins have no
//    verification step at all (see this feature's assumptions writeup).
//    Existing rows predate that wiring, so they're backfilled here with the
//    same crypto.randomBytes(32).base64url() generator, in JS rather than
//    SQL since this DB has no pgcrypto extension enabled anywhere else in
//    the schema.
//
// 2. matches — already existed from the prior one-time-match-email feature
//    (UNIQUE(flat_id, seeker_pin_id), ON DELETE CASCADE both ways). The
//    digest job recomputes the full compatible-match list from scratch on
//    every run and never gates a send on this table, so it's no longer used
//    for dedup. Repurposed instead as a lightweight "last seen compatible"
//    analytics log — matched_at now means "last time this pair showed up as
//    compatible during a digest run" (upserted, not insert-once). No schema
//    change needed for that repurposing, just the write pattern in
//    digestJob.js.
import crypto from "node:crypto";
import { pool } from "../src/db.js";

function generateUnsubscribeToken() {
  return crypto.randomBytes(32).toString("base64url");
}

async function main() {
  await pool.query(`
    ALTER TABLE flats ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT UNIQUE;
    ALTER TABLE seeker_pins ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT UNIQUE;
  `);

  const missing = await pool.query(`
    SELECT 'flats' AS table_name, id FROM flats WHERE unsubscribe_token IS NULL
    UNION ALL
    SELECT 'seeker_pins' AS table_name, id FROM seeker_pins WHERE unsubscribe_token IS NULL
  `);

  for (const row of missing.rows) {
    const table = row.table_name === "flats" ? "flats" : "seeker_pins";
    await pool.query(`UPDATE ${table} SET unsubscribe_token = $1 WHERE id = $2`, [
      generateUnsubscribeToken(),
      row.id,
    ]);
  }

  console.log(
    `unsubscribe_token backfilled on ${missing.rows.length} existing row(s) across flats and seeker_pins.`
  );
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
