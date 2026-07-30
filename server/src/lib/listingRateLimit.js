import { query } from "../db.js";

const WINDOW_HOURS = 24;

// One flat-listing attempt per email per 24h, regardless of what happens to
// the resulting listing afterward (verified, still pending, or later
// deleted by the expiry cleanup) — counting only verified listings would let
// someone farm submissions with junk emails that never get verified, and a
// deleted pending_verification row wouldn't be queryable in flats anymore
// either way. Tracked in its own listing_attempts table for exactly that
// reason — see db/add-listing-attempts-table.js.
export async function checkListingRateLimit(email) {
  const result = await query(
    `SELECT created_at FROM listing_attempts
     WHERE email = $1 AND created_at > now() - ($2 || ' hours')::interval
     ORDER BY created_at DESC
     LIMIT 1`,
    [email, WINDOW_HOURS]
  );
  if (result.rows.length === 0) return { allowed: true };

  const nextAllowedAt = new Date(result.rows[0].created_at).getTime() + WINDOW_HOURS * 60 * 60 * 1000;
  const hoursRemaining = Math.max(1, Math.ceil((nextAllowedAt - Date.now()) / (60 * 60 * 1000)));
  return { allowed: false, hoursRemaining };
}

export async function recordListingAttempt(email) {
  await query("INSERT INTO listing_attempts (email) VALUES ($1)", [email]);
}
