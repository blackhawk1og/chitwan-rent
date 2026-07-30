import crypto from "node:crypto";
import { query } from "../db.js";

// 256 bits, URL-safe — cryptographically unguessable, no sequential/internal
// ID ever exposed in the verification link (see routes/flats.js's POST /
// and routes/verifyListing.js).
export function generateVerificationToken() {
  return crypto.randomBytes(32).toString("base64url");
}

// Atomic find-and-flip: matching by token, still pending, not expired, all
// inside the UPDATE's WHERE clause so two near-simultaneous requests for the
// same token can't both succeed (only one row-affecting UPDATE can win).
// verification_token is cleared on success, which is what "prevents reuse"
// — a second click with the same link no longer matches any row. That also
// means a genuine repeat-click can't be told apart from a token that never
// existed (both find nothing), so they intentionally share the "invalid"
// reason below; only "expired" (row still there, just past its window,
// waiting on the cleanup sweep) stays distinguishable.
export async function verifyListingByToken(token) {
  if (!token || typeof token !== "string") return { ok: false, reason: "invalid" };

  const updated = await query(
    `UPDATE flats
     SET status = 'available', email_verified_at = now(), verification_token = NULL, verification_token_expires_at = NULL
     WHERE verification_token = $1 AND status = 'pending_verification' AND verification_token_expires_at > now()
     RETURNING id`,
    [token]
  );
  if (updated.rows.length > 0) {
    return { ok: true, flatId: updated.rows[0].id };
  }

  const existing = await query(
    `SELECT status, verification_token_expires_at FROM flats WHERE verification_token = $1`,
    [token]
  );
  const row = existing.rows[0];
  const isExpiredPending =
    row && row.status === "pending_verification" && new Date(row.verification_token_expires_at).getTime() < Date.now();

  return { ok: false, reason: isExpiredPending ? "expired" : "invalid" };
}
