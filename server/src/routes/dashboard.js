import { Router } from "express";
import { query, withTransaction } from "../db.js";
import { ACTIVE_FLATS_SQL, ACTIVE_SEEKERS_SQL } from "../lib/digestJob.js";
import { REPORT_REMOVAL_THRESHOLD, REPORT_REMOVAL_EMAIL_TRACKING_STARTED_AT } from "./flats.js";
import { WINDOW_HOURS as LISTING_RATE_LIMIT_WINDOW_HOURS } from "../lib/listingRateLimit.js";
import {
  issueDashboardSession,
  clearDashboardSession,
  isDashboardAuthenticated,
  requireDashboardAuth,
  checkDashboardLoginRateLimit,
  recordFailedDashboardLogin,
  passwordMatches,
} from "../lib/dashboardAuth.js";

const router = Router();

// --- Auth ------------------------------------------------------------
// Not rate-limited by itself — this is a read of the requester's own cookie,
// not a guessable credential check.
router.get("/session", (req, res) => {
  res.json({ authenticated: isDashboardAuthenticated(req) });
});

router.post("/login", async (req, res) => {
  const ip = req.ip;
  try {
    const rateLimit = await checkDashboardLoginRateLimit(ip);
    if (!rateLimit.allowed) {
      return res.status(429).json({ error: "Too many attempts. Please try again in a bit." });
    }

    if (!process.env.DASHBOARD_PASSWORD) {
      console.error("DASHBOARD_PASSWORD is not set — dashboard login is disabled.");
      return res.status(503).json({ error: "Dashboard is not configured." });
    }

    const password = typeof req.body.password === "string" ? req.body.password : "";
    if (!passwordMatches(password)) {
      await recordFailedDashboardLogin(ip);
      return res.status(401).json({ error: "Incorrect password" });
    }

    issueDashboardSession(res);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/logout", (req, res) => {
  clearDashboardSession(res);
  res.json({ ok: true });
});

// Everything below reads/writes real app data — password-gated.
router.use(requireDashboardAuth);

// --- 1. Recent listings ------------------------------------------------
// GET /listings?status=available|pending_verification|rented
// Deliberately does NOT reuse routes/flats.js's public SELECT_WITH_OWNER —
// that query unconditionally hides report_count>=3 and pending_verification
// rows from the public map; this internal view needs to see everything,
// including exactly those hidden rows.
router.get("/listings", async (req, res) => {
  const { status } = req.query;
  const conditions = [];
  const params = [];
  if (status) {
    params.push(status);
    conditions.push(`f.status = $${params.length}`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    // LEFT JOIN (not INNER) — same reasoning as routes/flats.js's own
    // SELECT_WITH_OWNER: flats.owner_id is nullable, so a row with no
    // resolvable owner still shows up here with owner_id/owner_email null
    // instead of silently vanishing from the table. Owner email is surfaced
    // specifically so the delete-user search below doesn't need a manual SQL
    // join to find who to look up — phone is deliberately left out (not
    // needed for that search, and not meant to be exposed in this table).
    const result = await query(
      `SELECT f.id, f.status, f.bhk, f.rent, f.posted_at, f.is_seed, u.id AS owner_id, u.email AS owner_email
       FROM flats f
       LEFT JOIN users u ON u.id = f.owner_id
       ${whereClause}
       ORDER BY f.posted_at DESC
       LIMIT 200`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// DELETE /listings/:id — per-row operator override for a single flat, from
// the Recent listings table. Deliberately separate from, and doesn't touch,
// routes/flats.js's public POST /:id/delete (the owner-facing 10-digit-code
// flow behind /deleteflat) — this one has no code, since the dashboard's own
// password + session is the access control here, not the code. Removes
// exactly one flat; leaves the owning user and every other flat/seeker pin
// of theirs untouched. Relies on the same DB-level ON DELETE CASCADE every
// other hard flat-delete in this app already relies on (flat_ratings/
// flat_comments/flat_reports/flat_interests/flat_delete_attempts/matches —
// see schema.sql and db/add-*.js) rather than reimplementing that cascade.
router.delete("/listings/:id", async (req, res) => {
  const flatId = Number(req.params.id);
  if (!Number.isInteger(flatId)) {
    return res.status(400).json({ error: "Invalid flat id" });
  }

  try {
    const result = await query("DELETE FROM flats WHERE id = $1 RETURNING id", [flatId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Flat not found" });
    }
    console.log(`Dashboard: flat ${flatId} deleted (operator override, no code).`);
    res.json({ ok: true, flatId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete flat" });
  }
});

// --- 2. Reports ----------------------------------------------------------
router.get("/reports", async (req, res) => {
  try {
    const result = await query(
      `SELECT id, status, bhk, rent, posted_at, is_seed, report_count, report_removal_email_sent_at
       FROM flats
       WHERE report_count > 0
       ORDER BY report_count DESC, posted_at DESC`
    );

    // For rows that crossed the threshold but have no recorded send
    // timestamp, the null is ambiguous by itself: it means either "the send
    // genuinely failed" (tracking existed, nothing came back) or "this flat
    // crossed before report_removal_email_sent_at existed at all" (see
    // routes/flats.js's REPORT_REMOVAL_EMAIL_TRACKING_STARTED_AT). Resolving
    // that requires knowing exactly when the flat crossed the threshold —
    // the created_at of its Nth report (N = REPORT_REMOVAL_THRESHOLD), which
    // is the same report that triggered (or would have triggered) the send.
    const ambiguousIds = result.rows
      .filter((r) => r.report_count >= REPORT_REMOVAL_THRESHOLD && !r.report_removal_email_sent_at)
      .map((r) => r.id);

    let crossedAtByFlatId = new Map();
    if (ambiguousIds.length > 0) {
      const crossedResult = await query(
        `SELECT flat_id, created_at FROM (
           SELECT flat_id, created_at, ROW_NUMBER() OVER (PARTITION BY flat_id ORDER BY created_at ASC) AS rn
           FROM flat_reports
           WHERE flat_id = ANY($1::int[])
         ) ranked
         WHERE rn = $2`,
        [ambiguousIds, REPORT_REMOVAL_THRESHOLD]
      );
      crossedAtByFlatId = new Map(crossedResult.rows.map((r) => [r.flat_id, r.created_at]));
    }

    const trackingStartedAt = new Date(REPORT_REMOVAL_EMAIL_TRACKING_STARTED_AT).getTime();

    const rows = result.rows.map((r) => {
      const hitRemovalThreshold = r.report_count >= REPORT_REMOVAL_THRESHOLD;
      let removalEmailSent;
      if (!hitRemovalThreshold) {
        removalEmailSent = "n/a — below threshold";
      } else if (r.report_removal_email_sent_at) {
        removalEmailSent = r.report_removal_email_sent_at;
      } else {
        const crossedAt = crossedAtByFlatId.get(r.id);
        removalEmailSent =
          crossedAt && new Date(crossedAt).getTime() < trackingStartedAt
            ? "unknown (removed before this was tracked)"
            : "not sent";
      }
      return { ...r, hitRemovalThreshold, removalEmailSent };
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// --- 3. Digest job health --------------------------------------------
router.get("/digest-health", async (req, res) => {
  try {
    // Wraps digestJob.js's own ACTIVE_FLATS_SQL / ACTIVE_SEEKERS_SQL as
    // subqueries so "due" is computed against the exact same eligibility
    // filter the job itself uses, not a hand-copied approximation of it.
    const flatsResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE next_digest_at <= now())::int AS due,
         COUNT(*) FILTER (WHERE next_digest_at > now())::int AS not_due
       FROM (${ACTIVE_FLATS_SQL}) AS active_flats`
    );
    const seekersResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE next_digest_at <= now())::int AS due,
         COUNT(*) FILTER (WHERE next_digest_at > now())::int AS not_due
       FROM (${ACTIVE_SEEKERS_SQL}) AS active_seekers`
    );
    const lastRunResult = await query(
      "SELECT run_at, summary FROM digest_runs ORDER BY run_at DESC LIMIT 1"
    );

    res.json({
      flats: flatsResult.rows[0],
      seekers: seekersResult.rows[0],
      lastRun: lastRunResult.rows[0] ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch digest job health" });
  }
});

// --- 4. Rate-limit lookup ----------------------------------------------
// GET /rate-limit-lookup?q=<email or phone>
router.get("/rate-limit-lookup", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "q (email or phone) is required" });

  try {
    // listing_attempts (db/add-listing-attempts-table.js) is keyed only by
    // the raw email string typed into the List My Flat form at submit time —
    // it has no phone column and no FK to users. So a phone-number search
    // has to resolve through users (phone -> email) first; a search that
    // literally is the email used on a listing attempt is tried directly
    // either way. Known limitation, not a bug: if someone used a *different*
    // email on the listing form than what's on their users row, this lookup
    // won't find that attempt from a phone search alone.
    const userResult = await query("SELECT email FROM users WHERE email = $1 OR phone = $1", [q]);
    const emails = [...new Set([q, ...userResult.rows.map((r) => r.email).filter(Boolean)])];

    const attemptsResult = await query(
      `SELECT email, created_at FROM listing_attempts WHERE email = ANY($1::text[]) ORDER BY created_at DESC`,
      [emails]
    );

    let windowClearsAt = null;
    if (attemptsResult.rows.length > 0) {
      const mostRecentMs = new Date(attemptsResult.rows[0].created_at).getTime();
      const clearsMs = mostRecentMs + LISTING_RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000;
      windowClearsAt = clearsMs > Date.now() ? new Date(clearsMs).toISOString() : null;
    }

    res.json({ searchedEmails: emails, attempts: attemptsResult.rows, windowClearsAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to look up rate-limit history" });
  }
});

// --- 5. Data hygiene counts ----------------------------------------------
router.get("/hygiene", async (req, res) => {
  try {
    const flats = await query("SELECT is_seed, COUNT(*)::int AS count FROM flats GROUP BY is_seed");
    const seekerPins = await query("SELECT is_seed, COUNT(*)::int AS count FROM seeker_pins GROUP BY is_seed");
    const users = await query("SELECT is_seed, COUNT(*)::int AS count FROM users GROUP BY is_seed");

    res.json({
      flats: flats.rows,
      seekerPins: seekerPins.rows,
      users: users.rows,
      // Gap, not a guess: rent_reports has no is_seed/is_dummy column (confirmed
      // by reading schema.sql + every db/add-*.js migration — it was never
      // added, or was already dropped before this feature started, per this
      // feature's own note to check first). db/seed.js also never inserts
      // into rent_reports at all, so every existing row is a real submission
      // by construction — there's simply nothing to distinguish here.
      rentReports: {
        gap: "No is_seed/is_dummy column exists on rent_reports, and seed.js never seeds this table — every row is real.",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch hygiene counts" });
  }
});

// --- 6. Single explicit user delete --------------------------------------
// GET /users/lookup?q=<id or email>
// id and email only, by explicit instruction — phone is deliberately not a
// search key here (unlike the rate-limit lookup section above, which does
// resolve phone -> email via this same users table). Do not add it.
router.get("/users/lookup", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "q (id or email) is required" });
  const isNumeric = /^\d+$/.test(q);

  try {
    // Cast the COLUMN, not the parameter (`id::text = $1`, not `id =
    // $1::int`) — pg infers one type per placeholder for the whole prepared
    // statement, so an explicit ::int cast on $1 here would force $1 to int
    // everywhere it appears, breaking the plain-text `email = $1` comparison
    // below it (found this the hard way while smoke-testing: "operator does
    // not exist: text = integer").
    const userResult = await query(
      `SELECT id, name, email, phone, role, hero_points, is_seed, created_at
       FROM users
       WHERE ${isNumeric ? "id::text = $1 OR " : ""}email = $1
       LIMIT 1`,
      [q]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "No user found" });
    }
    const user = userResult.rows[0];

    // Preview of everything the delete action below would cascade — shown
    // on the confirm screen before the operator types the id to confirm.
    const countsResult = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM flats WHERE owner_id = $1) AS flats,
         (SELECT COUNT(*)::int FROM seeker_pins WHERE user_id = $1) AS seeker_pins,
         (SELECT COUNT(*)::int FROM tolet_spots WHERE spotter_id = $1) AS tolet_spots,
         (SELECT COUNT(*)::int FROM flat_ratings WHERE user_id = $1) AS flat_ratings,
         (SELECT COUNT(*)::int FROM flat_comments WHERE user_id = $1) AS flat_comments,
         (SELECT COUNT(*)::int FROM flat_reports WHERE user_id = $1) AS flat_reports,
         (SELECT COUNT(*)::int FROM flat_interests WHERE user_id = $1) AS flat_interests`,
      [user.id]
    );

    res.json({ user, cascadeCounts: countsResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to look up user" });
  }
});

// POST /users/:id/delete  { confirmId }
//
// The ONLY destructive action in this dashboard. confirmId must exactly
// equal the id being deleted, typed by the operator — not a checkbox — per
// this feature's own security requirement.
//
// None of the tables that reference users.id have ON DELETE CASCADE at the
// DB level (confirmed by grepping every "REFERENCES users" in this schema:
// flats.owner_id, seeker_pins.user_id, tolet_spots.spotter_id, flat_ratings/
// flat_comments/flat_reports/flat_interests.user_id all default to RESTRICT),
// so each has to be deleted explicitly, inside one transaction, before the
// users row itself — a partial failure rolls everything back rather than
// leaving orphaned or half-deleted data.
router.post("/users/:id/delete", async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }
  const confirmId = String(req.body.confirmId ?? "").trim();
  if (confirmId !== String(userId)) {
    return res.status(400).json({ error: "Confirmation id does not match" });
  }

  try {
    const deleted = await withTransaction(async (client) => {
      const userResult = await client.query("SELECT id FROM users WHERE id = $1", [userId]);
      if (userResult.rows.length === 0) {
        throw Object.assign(new Error("User not found"), { status: 404 });
      }

      // Rows this user authored on OTHER people's listings — the flats
      // cascade below only covers rows tied to flats THEY own.
      await client.query("DELETE FROM flat_ratings WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM flat_comments WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM flat_reports WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM flat_interests WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM seeker_pins WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM tolet_spots WHERE spotter_id = $1", [userId]);

      // Cascades flat_ratings/flat_comments/flat_reports/flat_interests/
      // flat_delete_attempts/matches for every flat this user owns (each
      // already has ON DELETE CASCADE from flats — see schema.sql and
      // db/add-*.js) — including rows authored by OTHER users on THIS
      // user's own listings.
      const flatsDeleted = await client.query("DELETE FROM flats WHERE owner_id = $1 RETURNING id", [userId]);

      await client.query("DELETE FROM users WHERE id = $1", [userId]);

      return { userId, flatsDeleted: flatsDeleted.rows.length };
    });

    console.log(`Dashboard: user ${userId} deleted (${deleted.flatsDeleted} flat(s) cascaded).`);
    res.json({ ok: true, ...deleted });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
