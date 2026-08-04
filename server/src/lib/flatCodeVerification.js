import { query } from "../db.js";
import { hashDeleteCode, deleteCodeHashMatches } from "./deleteCode.js";
import { checkDeleteAttemptLimit, recordFailedDeleteAttempt } from "./deleteAttemptLimit.js";

// Extracted out of routes/flats.js's original POST /:id/delete so
// POST /:id/mark-rented (added alongside it) can require the exact same
// code check without duplicating it — same 10-digit-format check, same
// 24h-post-verification eligibility rule, same flat_delete_attempts
// brute-force limiting (shared by flat id, not per-action — a wrong guess
// on either action counts toward the same lockout, since it's the same code
// either way), same hashed comparison. Neither caller can succeed without
// this resolving { ok: true }; there is no code-free path through either
// route.
export const CODE_ELIGIBILITY_DELAY_MS = 24 * 60 * 60 * 1000;

// Returns { ok: true, flat } on a verified match, or
// { ok: false, status, error } describing exactly why not — callers just
// forward status/error straight into their own res.status().json() and stop,
// or proceed with their own action (delete vs. mark-rented) on ok: true.
export async function verifyFlatDeleteCode(flatId, code) {
  const trimmedCode = typeof code === "string" ? code.trim() : "";
  if (!/^\d{10}$/.test(trimmedCode)) {
    return { ok: false, status: 400, error: "Code must be a 10-digit number" };
  }

  const result = await query(
    "SELECT id, email_verified_at, delete_code_hash FROM flats WHERE id = $1",
    [flatId]
  );
  if (result.rows.length === 0) {
    console.log(`Code check failed on wrong code: flat ${flatId}`);
    return { ok: false, status: 400, error: "Flat ID or code is incorrect" };
  }

  const flat = result.rows[0];

  // Eligibility is a business rule, not a security boundary, so — per the
  // original delete route's own spec — it's checked before the code at all,
  // and is fine to answer with a specific reason rather than the generic
  // wrong-ID-or-code message below. No email_verified_at at all (e.g. seed/
  // dummy data, which never goes through verification) collapses into the
  // same "not eligible" branch, just without a date to name. Wording here is
  // intentionally action-agnostic ("this action" rather than "deletion")
  // since it's now shared by two different actions.
  const eligibleAt = flat.email_verified_at
    ? new Date(flat.email_verified_at).getTime() + CODE_ELIGIBILITY_DELAY_MS
    : null;
  if (!eligibleAt || eligibleAt > Date.now()) {
    console.log(`Code check rejected as not-yet-eligible: flat ${flatId}`);
    return {
      ok: false,
      status: 400,
      error: eligibleAt
        ? `This action is available starting ${new Date(eligibleAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}, 24 hours after verification.`
        : "This listing isn't eligible for this action yet.",
    };
  }

  const attemptLimit = await checkDeleteAttemptLimit(flatId);
  if (!attemptLimit.allowed) {
    return { ok: false, status: 429, error: "Too many incorrect attempts. Please try again later." };
  }

  if (!deleteCodeHashMatches(hashDeleteCode(trimmedCode), flat.delete_code_hash)) {
    await recordFailedDeleteAttempt(flatId);
    console.log(`Code check failed on wrong code: flat ${flatId}`);
    return { ok: false, status: 400, error: "Flat ID or code is incorrect" };
  }

  return { ok: true, flat };
}
