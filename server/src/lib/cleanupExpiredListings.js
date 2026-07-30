import { query } from "../db.js";

// Deletes pending_verification listings whose 24h verification window has
// passed without the owner clicking the link — never touches verified
// (available) or any other-status row, only ever this one narrow case.
// Isolated on purpose (not inline in a request handler) so it can run on a
// schedule independent of any single request.
export async function cleanupExpiredListings() {
  const result = await query(
    `DELETE FROM flats
     WHERE status = 'pending_verification' AND verification_token_expires_at < now()
     RETURNING id`
  );
  for (const row of result.rows) {
    console.log(`Expired listing cleaned up: flat ${row.id}`);
  }
  return result.rows.length;
}

// Hourly is frequent enough against a 24h window without hammering the DB —
// swap this constant if that ever needs to be tighter.
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

function runAndLogErrors() {
  cleanupExpiredListings().catch((err) => console.error("Expired-listing cleanup failed:", err));
}

// Started once from index.js. A plain setInterval for now — structured as
// its own start function so swapping this body for a real cron job later is
// a one-line change at the call site, not a refactor.
export function startExpiredListingsCleanup() {
  runAndLogErrors();
  return setInterval(runAndLogErrors, CLEANUP_INTERVAL_MS);
}
