// Email/phone input validation shared across every form that collects
// contact details (sign-in, List My Flat, Find a Flat / seeker pin).

const PHONE_DIGITS = 10;

// Strips everything but digits and caps at 10 — used as a TextField
// onChange transform so the field can never even contain more than 10
// digits, rather than only rejecting an over-length value on submit.
export function sanitizePhoneInput(value) {
  return value.replace(/\D/g, "").slice(0, PHONE_DIGITS);
}

export function isValidPhone(value) {
  return /^\d{10}$/.test(value);
}

// Well-known email providers — used only to catch obvious typos of these
// (e.g. "gmail.comm", "icloudd.com"), never to validate arbitrary domains.
// A domain this doesn't recognize at all is accepted outright: this is a
// format/typo check, not an existence check — no DNS/SMTP lookup, and no
// claim that an unrecognized domain is wrong, only that a near-miss of a
// well-known one almost certainly is.
const KNOWN_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
  "protonmail.com", "aol.com", "live.com", "msn.com", "mail.com",
];

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
    }
  }
  return dp[m][n];
}

const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  const trimmed = value.trim();
  if (!EMAIL_FORMAT_RE.test(trimmed)) return false;

  const domain = trimmed.split("@")[1].toLowerCase();
  if (KNOWN_EMAIL_DOMAINS.includes(domain)) return true;

  // A domain 1-2 edits away from a well-known one (but not an exact match)
  // is almost certainly a typo of it — e.g. "gmail.comm" or "icloudd.com" —
  // rather than a genuine, different domain, so it's rejected specifically.
  const isNearMissTypo = KNOWN_EMAIL_DOMAINS.some((known) => {
    const dist = levenshtein(domain, known);
    return dist > 0 && dist <= 2;
  });
  return !isNearMissTypo;
}
