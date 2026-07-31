import { query } from "../db.js";

const WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

// Brute-force protection for POST /:id/delete's code check — same
// sliding-window shape as lib/listingRateLimit.js, scoped to a flat ID
// instead of an email. 15 minutes / 5 attempts is deliberately loose: a
// 10-digit code is already a 1-in-10^10 space, so this exists to blunt
// scripted guessing, not to be the actual security boundary. Only failed
// attempts are recorded (see routes/flats.js) — checking eligibility or
// getting locked out doesn't itself count as an attempt.
export async function checkDeleteAttemptLimit(flatId) {
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM flat_delete_attempts
     WHERE flat_id = $1 AND created_at > now() - ($2 || ' minutes')::interval`,
    [flatId, WINDOW_MINUTES]
  );
  return { allowed: result.rows[0].count < MAX_FAILED_ATTEMPTS };
}

export async function recordFailedDeleteAttempt(flatId) {
  await query("INSERT INTO flat_delete_attempts (flat_id) VALUES ($1)", [flatId]);
}
