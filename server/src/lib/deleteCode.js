import crypto from "node:crypto";

// crypto.randomInt draws from a CSPRNG and is unbiased across the full
// range, unlike e.g. `randomBytes(1)[0] % 10` per digit — one call over the
// full 10-digit space (padded so a low draw still reads as 10 digits) rather
// than derived from the flat ID in any way, per the "not guessable from the
// flat ID" requirement in routes/flats.js's POST /:id/delete.
export function generateDeleteCode() {
  return crypto.randomInt(0, 10_000_000_000).toString().padStart(10, "0");
}

// The env var holding the HMAC key. Read at call time rather than captured at
// module load so load order (dotenv/config vs. this module) can never leave a
// stale undefined behind.
const SECRET_ENV_VAR = "DELETE_CODE_HMAC_SECRET";

// Exported so index.js can fail the process at boot rather than letting a
// misconfigured deploy run and only discover the missing key at the first
// verification attempt (which would 500 mid-flow for a real owner).
export function assertDeleteCodeSecret() {
  if (!process.env[SECRET_ENV_VAR]) {
    throw new Error(
      `${SECRET_ENV_VAR} is not set — delete codes can neither be issued nor verified without it.`
    );
  }
}

// Only the hash is ever persisted (flats.delete_code_hash) — the plaintext
// exists solely for the one email send right after verification (see
// lib/verification.js) and the one comparison per delete attempt (see
// routes/flats.js), never logged or stored.
//
// Keyed HMAC-SHA256, replacing the original bare sha256. Both emit a 64-char
// hex digest, so the stored column width and deleteCodeHashMatches' own
// length check below are unaffected — what changes is that the digest can no
// longer be recomputed by anyone holding only the hash. A bare sha256 over a
// 10-digit code is a 10^10 keyspace, which falls to an offline sweep in
// seconds on commodity hardware; the flat_delete_attempts limiter never even
// sees that, since the guessing happens entirely off this server. That
// mattered because the public GET /api/flats was handing delete_code_hash out
// with every listing (now fixed in routes/flats.js). With the key living only
// in this env var, a future leak of the hash by any other route is inert on
// its own.
//
// Deliberately no fallback/default value: JWT_SECRET's "dev_secret_change_me"
// default is exactly the pattern being avoided here, since this repo is
// public. A missing key throws instead of silently hashing under a guessable
// one.
export function hashDeleteCode(code) {
  assertDeleteCodeSecret();
  return crypto.createHmac("sha256", process.env[SECRET_ENV_VAR]).update(String(code)).digest("hex");
}

// Timing-safe compare of two hex digests — avoids leaking how many leading
// hash bytes matched via response-time differences. Unchanged by the HMAC
// switch: both inputs are still equal-length (64-char) hex strings, so the
// length guard still only trips when delete_code_hash is missing/malformed,
// which just means "no match" rather than a crash. Any pre-HMAC sha256 hash
// still sitting in the column simply never matches (the digests differ) —
// those rows are retired by db/rotate-compromised-flat-secrets.js, which
// reissues both the code and its hash under this scheme.
export function deleteCodeHashMatches(submittedHash, storedHash) {
  if (typeof storedHash !== "string" || submittedHash.length !== storedHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(submittedHash, "hex"), Buffer.from(storedHash, "hex"));
}
