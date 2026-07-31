import crypto from "node:crypto";
import { query } from "../db.js";
import { generateDeleteCode, hashDeleteCode } from "./deleteCode.js";

// 256 bits, URL-safe — cryptographically unguessable, no sequential/internal
// ID ever exposed in the verification link (see routes/flats.js's POST /
// and routes/verifyListing.js).
export function generateVerificationToken() {
  return crypto.randomBytes(32).toString("base64url");
}

// Same generation mechanics as generateVerificationToken (256-bit,
// URL-safe), but conceptually a different token: this one is long-lived and
// reused every week as the /unsubscribe?token=... link in match-digest
// emails (see lib/digestJob.js, lib/email.js), not a one-time,
// cleared-on-use credential like verification_token.
export function generateUnsubscribeToken() {
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
//
// The delete-flat feature's 10-digit code is generated and hashed into the
// same atomic UPDATE (delete_code_hash) rather than a separate write — this
// is the one moment a listing becomes verified, so it's also the one moment
// the code should come into existence (see routes/flats.js's POST
// /:id/delete, which the code is for). The plaintext is returned only for
// the caller (routes/verifyListing.js) to email once; it's never stored or
// logged anywhere. next_digest_at is set the same way, to now()+12h — the
// digest job (lib/digestJob.js) picks this flat up on its first due check
// no earlier than 12h after this exact moment.
export async function verifyListingByToken(token) {
  if (!token || typeof token !== "string") return { ok: false, reason: "invalid" };

  const deleteCode = generateDeleteCode();
  const deleteCodeHash = hashDeleteCode(deleteCode);
  const unsubscribeToken = generateUnsubscribeToken();

  const updated = await query(
    `UPDATE flats
     SET status = 'available', email_verified_at = now(), verification_token = NULL, verification_token_expires_at = NULL,
         delete_code_hash = $2, unsubscribe_token = $3, next_digest_at = now() + interval '12 hours'
     WHERE verification_token = $1 AND status = 'pending_verification' AND verification_token_expires_at > now()
     RETURNING id, owner_id`,
    [token, deleteCodeHash, unsubscribeToken]
  );
  if (updated.rows.length > 0) {
    const { id: flatId, owner_id: ownerId } = updated.rows[0];
    const owner = await query("SELECT email FROM users WHERE id = $1", [ownerId]);
    return { ok: true, flatId, deleteCode, email: owner.rows[0]?.email ?? null };
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
