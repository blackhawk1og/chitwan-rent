import { query } from "../db.js";

// Rate limits for the endpoints that send an email on every successful call.
// Same sliding-window-over-an-append-only-log shape as lib/listingRateLimit.js
// and lib/deleteAttemptLimit.js, and the same { allowed, hoursRemaining }
// return contract, so route code reads identically whichever limiter it uses.
//
// Two deliberate differences from listingRateLimit.js:
//
//  1. It supports max > 1 correctly. listingRateLimit.js looks only at the
//     newest attempt, which is right for its one-per-window rule but wrong
//     for any other: with "3 per 24h", the window clears when the OLDEST of
//     the three in-window attempts ages out, not the newest. Reading the
//     newest `max` rows and measuring from the last of them gets that right
//     for any max.
//  2. Email keys are normalized (trimmed + lowercased). listingRateLimit.js
//     doesn't, so "A@b.com" and "a@b.com" are separate buckets there — a
//     pre-existing gap left alone rather than changed under this feature.
//
// Not a hard wall, and not sold as one: /api/auth/login is unverified
// find-or-create, so a fresh email yields a fresh user id and a fresh bucket.
// These caps bound casual abuse — repeat submissions from one identity — not
// a determined attacker cycling identities.

export const SEEKER_PIN_WINDOW_HOURS = 24;
export const SEEKER_PIN_MAX_PER_WINDOW = 3;

export const LISTING_USER_WINDOW_HOURS = 24;
export const LISTING_USER_MAX_PER_WINDOW = 1;

export const INTEREST_WINDOW_HOURS = 24;

// One deterministic bucket per submission. An email-keyed and a user-keyed
// bucket for the same person would grant the sum of both limits, so callers
// pick exactly one: the email when there is one (it's what receives the mail
// this limit exists to bound), otherwise the authenticated user.
export function emailOrUserKey(email, userId) {
  const trimmed = typeof email === "string" ? email.trim().toLowerCase() : "";
  return trimmed ? `email:${trimmed}` : `user:${userId}`;
}

export function userKey(userId) {
  return `user:${userId}`;
}

function hoursUntilClear(oldestBlockingAt, windowHours) {
  const clearsAt = new Date(oldestBlockingAt).getTime() + windowHours * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((clearsAt - Date.now()) / (60 * 60 * 1000)));
}

// Allowed while strictly fewer than `max` attempts sit inside the window.
// Fetching the newest `max` rows (rather than COUNT(*)) is what makes the
// hoursRemaining calculation possible in the same round trip.
export async function checkSubmissionLimit({ kind, key, windowHours, max }) {
  const result = await query(
    `SELECT created_at FROM submission_attempts
      WHERE kind = $1 AND key = $2 AND created_at > now() - ($3 || ' hours')::interval
      ORDER BY created_at DESC
      LIMIT $4`,
    [kind, key, windowHours, max]
  );
  if (result.rows.length < max) return { allowed: true };

  const oldestBlocking = result.rows[result.rows.length - 1].created_at;
  return { allowed: false, hoursRemaining: hoursUntilClear(oldestBlocking, windowHours) };
}

export async function recordSubmission({ kind, key }) {
  await query("INSERT INTO submission_attempts (kind, key) VALUES ($1, $2)", [kind, key]);
}

// Interest submissions read flat_interests directly instead of writing a
// parallel row into submission_attempts: that table already records
// (flat_id, user_id, created_at) for exactly these submissions and keeps them
// permanently. The only thing that removes those rows is the flat itself
// being deleted (ON DELETE CASCADE), at which point there is nothing left to
// rate-limit. listing_attempts and seeker pins need a side table for the
// opposite reason — their source rows can be hard-deleted while the limit
// should still apply (see listingRateLimit.js's own note, and /unsubscribe
// deleting seeker_pins rows).
//
// Keyed on user_id rather than the email inside the free-text `contact`
// field: contact is a client-formatted string ("<email> / <phone>") that a
// direct API caller can vary at will, while user_id comes from the verified
// token. The two coincide in practice — InterestForm signs in with that same
// email immediately before submitting, and find-or-create resolves one email
// to one user — so this is "once per flat per email per day" for every real
// client, and strictly harder to dodge for anyone else.
export async function checkInterestLimit(flatId, userId) {
  const result = await query(
    `SELECT created_at FROM flat_interests
      WHERE flat_id = $1 AND user_id = $2 AND created_at > now() - ($3 || ' hours')::interval
      ORDER BY created_at DESC
      LIMIT 1`,
    [flatId, userId, INTEREST_WINDOW_HOURS]
  );
  if (result.rows.length === 0) return { allowed: true };

  return { allowed: false, hoursRemaining: hoursUntilClear(result.rows[0].created_at, INTEREST_WINDOW_HOURS) };
}
