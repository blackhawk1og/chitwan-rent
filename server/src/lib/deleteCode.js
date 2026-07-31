import crypto from "node:crypto";

// crypto.randomInt draws from a CSPRNG and is unbiased across the full
// range, unlike e.g. `randomBytes(1)[0] % 10` per digit — one call over the
// full 10-digit space (padded so a low draw still reads as 10 digits) rather
// than derived from the flat ID in any way, per the "not guessable from the
// flat ID" requirement in routes/flats.js's POST /:id/delete.
export function generateDeleteCode() {
  return crypto.randomInt(0, 10_000_000_000).toString().padStart(10, "0");
}

// Only the hash is ever persisted (flats.delete_code_hash) — the plaintext
// exists solely for the one email send right after verification (see
// lib/verification.js) and the one comparison per delete attempt (see
// routes/flats.js), never logged or stored. No per-code salt: the code
// itself is already high-entropy and machine-generated (not a human-chosen
// password), and comparisons are brute-force-limited by
// lib/deleteAttemptLimit.js, so plain sha256 matches the spec's own
// suggestion without adding salt-storage complexity that wouldn't buy
// anything here.
export function hashDeleteCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// Timing-safe compare of two hex digests — avoids leaking how many leading
// hash bytes matched via response-time differences. Both inputs must be
// equal-length hex strings (sha256 digests always are); a length mismatch
// only happens if delete_code_hash is missing/malformed, which just means
// "no match" rather than a crash.
export function deleteCodeHashMatches(submittedHash, storedHash) {
  if (typeof storedHash !== "string" || submittedHash.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(submittedHash, "hex"), Buffer.from(storedHash, "hex"));
}
