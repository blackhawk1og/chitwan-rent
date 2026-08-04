import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { query } from "../db.js";

// Separate from lib/auth.js's requireAuth on purpose: that one is per-user
// dummy identity (a Bearer token proving "this request is user #N"), this is
// a single shared password gating one internal tool, with no user identity
// at all — reusing the same middleware/shape would blur two genuinely
// different auth concepts together.
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const SESSION_TTL = "6h";
const COOKIE_NAME = "dashboard_session";
const COOKIE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_MAX_ATTEMPTS = 5;

// --- Cookie read/write -------------------------------------------------
// Hand-rolled rather than pulling in cookie-parser: this app only ever needs
// to read/write exactly one cookie, and the `cookie` package that
// cookie-parser wraps isn't a direct dependency of this workspace (it's only
// present transitively via express) — a few lines here avoids depending on
// that staying true.
function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    if (key === name) return decodeURIComponent(part.slice(eqIdx + 1).trim());
  }
  return null;
}

function writeCookie(res, name, value, maxAgeMs) {
  const attrs = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  attrs.push(`Max-Age=${Math.floor(maxAgeMs / 1000)}`);
  // Secure requires HTTPS — set only in production so local http://
  // dev doesn't silently drop the cookie.
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
}

function clearCookie(res, name) {
  res.setHeader("Set-Cookie", `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// --- Session issue/verify -----------------------------------------------
export function issueDashboardSession(res) {
  const token = jwt.sign({ dashboard: true }, JWT_SECRET, { expiresIn: SESSION_TTL });
  writeCookie(res, COOKIE_NAME, token, COOKIE_MAX_AGE_MS);
}

export function clearDashboardSession(res) {
  clearCookie(res, COOKIE_NAME);
}

function hasValidSession(req) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return false;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.dashboard === true;
  } catch {
    return false;
  }
}

export function isDashboardAuthenticated(req) {
  return hasValidSession(req);
}

export function requireDashboardAuth(req, res, next) {
  if (!hasValidSession(req)) {
    return res.status(401).json({ error: "Not signed in" });
  }
  next();
}

// --- Login brute-force protection ----------------------------------------
// Same sliding-window shape as lib/deleteAttemptLimit.js (15 min / 5
// attempts), keyed by IP instead of a flat ID — there's no per-request
// identity to key on with a single shared password. This app doesn't sit
// behind a configured trust proxy today, so req.ip is the direct socket
// address in dev; if this is ever deployed behind a reverse proxy,
// `app.set("trust proxy", ...)` needs setting for req.ip to reflect the
// real client IP instead of the proxy's.
export async function checkDashboardLoginRateLimit(ip) {
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM dashboard_login_attempts
     WHERE ip = $1 AND created_at > now() - ($2 || ' minutes')::interval`,
    [ip, LOGIN_WINDOW_MINUTES]
  );
  return { allowed: result.rows[0].count < LOGIN_MAX_ATTEMPTS };
}

export async function recordFailedDashboardLogin(ip) {
  await query("INSERT INTO dashboard_login_attempts (ip) VALUES ($1)", [ip]);
}

// crypto.timingSafeEqual over a naive `===` — a plain string comparison
// short-circuits on the first mismatched byte, which leaks a few
// nanoseconds' worth of "how many characters were right" per attempt. That's
// not the primary defense here (the IP rate limit above is), but it's a free
// hardening given this endpoint's whole job is resisting brute-forcing.
// Buffers are padded to equal length before comparing so a length mismatch
// itself doesn't short-circuit before timingSafeEqual runs.
export function passwordMatches(candidate) {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return false;
  const candidateBuf = Buffer.from(String(candidate));
  const expectedBuf = Buffer.from(expected);
  const len = Math.max(candidateBuf.length, expectedBuf.length, 1);
  const paddedCandidate = Buffer.alloc(len);
  const paddedExpected = Buffer.alloc(len);
  candidateBuf.copy(paddedCandidate);
  expectedBuf.copy(paddedExpected);
  return candidateBuf.length === expectedBuf.length && crypto.timingSafeEqual(paddedCandidate, paddedExpected);
}
