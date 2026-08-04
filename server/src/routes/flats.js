import { Router } from "express";
import { query } from "../db.js";
import { isNearAnyRoute, isWithinChitwanBounds } from "../lib/geo.js";
import { requireAuth } from "../lib/auth.js";
import { generateVerificationToken } from "../lib/verification.js";
import { sendVerificationEmail, sendReportRemovalEmail } from "../lib/email.js";
import { checkListingRateLimit, recordListingAttempt } from "../lib/listingRateLimit.js";
import { hashDeleteCode, deleteCodeHashMatches } from "../lib/deleteCode.js";
import { checkDeleteAttemptLimit, recordFailedDeleteAttempt } from "../lib/deleteAttemptLimit.js";

const DELETE_ELIGIBILITY_DELAY_MS = 24 * 60 * 60 * 1000;

// Mirrors the GET /'s own inline `f.report_count < 3` filter below — that's
// the actual (passive, read-time) removal mechanism, there's no discrete
// "remove this flat" action anywhere. This constant only drives when the
// report route below fires the owner notification once, at the exact moment
// a flat's report_count crosses into that filtered-out range.
// Exported so the internal dashboard's "Reports" section (routes/
// dashboard.js) can flag which reported flats have hit this same threshold
// without hand-copying the number.
export const REPORT_REMOVAL_THRESHOLD = 3;

// Base URL for the link a verification email points at — see
// routes/verifyListing.js, mounted at this same origin's /verify-listing.
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;

const router = Router();

const SELECT_WITH_OWNER = `
  SELECT f.*, u.name AS owner_name, u.phone AS owner_phone, u.email AS owner_email
  FROM flats f
  LEFT JOIN users u ON u.id = f.owner_id
`;

// GET /api/flats?status=available&bhk=1,2,5&rent_min=&rent_max=&area=&furnishing=&gated=&posted_within=30&near_bus_route=true
router.get("/", async (req, res) => {
  const {
    status, bhk, rent_min, rent_max, area, furnishing, gated, posted_within, near_bus_route,
  } = req.query;

  const conditions = [];
  const params = [];

  // 3 reports pulls a flat off the map entirely (see the report route below,
  // and ReportReasonModal's "After 3 flags it's removed from the map" copy)
  // — unconditional, not tied to the status filter, since a heavily-reported
  // listing shouldn't be visible under any filter combination.
  conditions.push(`f.report_count < 3`);
  // Unverified listings (owner hasn't clicked the emailed link yet) are
  // never publicly visible — same unconditional treatment as report_count
  // above, not tied to the status filter, so this holds even when no status
  // filter is requested at all (the map's default fetch).
  conditions.push(`f.status != 'pending_verification'`);

  if (status) {
    params.push(status);
    conditions.push(`f.status = $${params.length}`);
    // "Available" is meant as "genuinely rentable right now" — a demo/seed
    // listing (flats.is_seed) is never actually rentable regardless of its
    // status column, so filtering to available flats has to exclude those
    // too, not just match on status. No other status value currently has a
    // filter UI that uses it, so this is scoped to 'available' specifically
    // rather than excluding is_seed rows from every status filter.
    if (status === "available") conditions.push(`f.is_seed = false`);
  }

  if (bhk) {
    const values = bhk.split(",").map(Number).filter((n) => !Number.isNaN(n));
    const exact = values.filter((n) => n < 5);
    const hasFivePlus = values.includes(5);
    const bhkConditions = [];
    if (exact.length) {
      params.push(exact);
      bhkConditions.push(`f.bhk = ANY($${params.length})`);
    }
    if (hasFivePlus) bhkConditions.push(`f.bhk >= 5`);
    if (bhkConditions.length) conditions.push(`(${bhkConditions.join(" OR ")})`);
  }

  if (rent_min) {
    params.push(Number(rent_min));
    conditions.push(`f.rent >= $${params.length}`);
  }
  if (rent_max) {
    params.push(Number(rent_max));
    conditions.push(`f.rent <= $${params.length}`);
  }

  if (area && area !== "all") {
    params.push(area);
    conditions.push(`f.area = $${params.length}`);
  }

  if (furnishing) {
    params.push(furnishing);
    conditions.push(`f.furnishing = $${params.length}`);
  }

  if (gated) {
    params.push(gated);
    conditions.push(`f.gated = $${params.length}`);
  }

  if (posted_within) {
    params.push(Number(posted_within));
    conditions.push(`f.posted_at >= now() - ($${params.length} || ' days')::interval`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await query(`${SELECT_WITH_OWNER} ${whereClause} ORDER BY f.posted_at DESC`, params);
    let rows = result.rows;

    if (near_bus_route === "true") {
      const routesResult = await query("SELECT geojson FROM bus_routes");
      rows = rows.filter((f) => isNearAnyRoute(f.lat, f.lng, routesResult.rows));
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch flats" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    // Same unverified-listings-stay-hidden rule as GET / above — a direct
    // link to a still-pending flat's detail page 404s exactly like a flat
    // that doesn't exist, rather than leaking it.
    const result = await query(
      `${SELECT_WITH_OWNER} WHERE f.id = $1 AND f.status != 'pending_verification'`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Flat not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch flat" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const {
    listing_type, bhk, rent, deposit, furnishing, includes_maintenance,
    gated, who_lives, pets_allowed, parking_for, sqft, one_liner, description, lat, lng, area, society_name, photos, email, phone,
    available_from, flatmate_gender_pref, food_pref, smoker_ok, rent_flagged,
  } = req.body;

  if (!isWithinChitwanBounds(lat, lng)) {
    return res.status(400).json({ error: "Location must be within Chitwan district" });
  }

  try {
    if (email) {
      const rateLimit = await checkListingRateLimit(email);
      if (!rateLimit.allowed) {
        const hourWord = rateLimit.hoursRemaining === 1 ? "hour" : "hours";
        return res.status(429).json({
          error: `You can only list one flat every 24 hours. Try again in ~${rateLimit.hoursRemaining} ${hourWord}.`,
        });
      }
    }

    if (email) {
      await query("UPDATE users SET email = COALESCE(email, $1) WHERE id = $2", [email, req.userId]);
    }
    if (phone) {
      // phone has a UNIQUE constraint — someone else's account may already
      // hold this number (e.g. a typo, or reusing a shared/test number).
      // That's a linking side effect, not the point of this request, so it
      // shouldn't fail the whole listing if it conflicts.
      try {
        await query("UPDATE users SET phone = COALESCE(phone, $1) WHERE id = $2", [phone, req.userId]);
      } catch (phoneErr) {
        if (phoneErr.code !== "23505") throw phoneErr;
        console.warn(`Skipped linking phone to user ${req.userId}: already in use by another account.`);
      }
    }

    const verificationToken = generateVerificationToken();

    // rating is deliberately omitted — real listings start with no rating at
    // all (column defaults to NULL) rather than a fake placeholder, and only
    // get one once a real community rating comes in (see POST /:id/rating).
    // Seed/dummy listings are the only ones with a rating from the start —
    // set directly by db/seed.js, untouched by this route.
    const result = await query(
      `INSERT INTO flats
        (owner_id, listing_type, bhk, rent, deposit, furnishing, includes_maintenance,
         gated, who_lives, pets_allowed, parking_for, sqft, one_liner, description, status, lat, lng, area, society_name, photos,
         available_from, flatmate_gender_pref, food_pref, smoker_ok, verification_token, verification_token_expires_at, rent_flagged)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending_verification',$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,now() + interval '24 hours',$25)
       RETURNING *`,
      [
        req.userId, listing_type ?? "flat", bhk, rent, deposit ?? null, furnishing,
        includes_maintenance ?? false, gated, who_lives ?? null, pets_allowed ?? null,
        parking_for ?? 0, sqft ?? null, one_liner ?? null, description ?? null, lat, lng, area ?? null, society_name ?? null, photos ?? [],
        available_from ?? null, flatmate_gender_pref ?? null, food_pref ?? null, smoker_ok ?? null,
        verificationToken, rent_flagged === true,
      ]
    );

    const flat = result.rows[0];
    console.log(`Listing set to pending: flat ${flat.id}`);

    if (email) {
      // Recorded regardless of the listing's later outcome — see
      // checkListingRateLimit's comment for why this can't just be derived
      // from flats itself.
      await recordListingAttempt(email);
    }

    if (email) {
      try {
        await sendVerificationEmail({
          to: email,
          verifyUrl: `${SERVER_BASE_URL}/verify-listing?token=${verificationToken}`,
        });
        console.log(`Verification email sent: flat ${flat.id}`);
      } catch (emailErr) {
        // Sending failed — the listing stays pending_verification either
        // way (never deleted just because the email didn't go out); the
        // owner can be told to retry from the client if needed.
        console.error(`Verification email failed: flat ${flat.id}`, emailErr.message);
      }
    }

    // Never leaves this process — a token in the create-response would let
    // the browser verify its own listing without ever touching the email.
    delete flat.verification_token;
    delete flat.verification_token_expires_at;

    res.status(201).json(flat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create flat" });
  }
});

// PATCH /api/flats/:id/photos  { photos: string[] } — appends to the
// listing's existing photos, capped at 6 total. Owner-only.
router.patch("/:id/photos", requireAuth, async (req, res) => {
  const { photos } = req.body;
  if (!Array.isArray(photos) || photos.length === 0) {
    return res.status(400).json({ error: "photos must be a non-empty array" });
  }

  try {
    const existing = await query("SELECT owner_id, photos FROM flats WHERE id = $1", [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Flat not found" });
    }
    if (existing.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: "You can only add photos to your own listing" });
    }

    const combined = [...(existing.rows[0].photos ?? []), ...photos].slice(0, 6);
    const result = await query("UPDATE flats SET photos = $1 WHERE id = $2 RETURNING *", [combined, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add photos" });
  }
});

// DELETE /api/flats/:id/photos  { url } — removes one photo from the
// listing's photos array. Owner-only, same ownership check as the PATCH
// above.
router.delete("/:id/photos", requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "url is required" });
  }

  try {
    const existing = await query("SELECT owner_id, photos FROM flats WHERE id = $1", [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Flat not found" });
    }
    if (existing.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: "You can only remove photos from your own listing" });
    }

    const updated = (existing.rows[0].photos ?? []).filter((p) => p !== url);
    const result = await query("UPDATE flats SET photos = $1 WHERE id = $2 RETURNING *", [updated, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove photo" });
  }
});

// GET /api/flats/:id/comments
router.get("/:id/comments", async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM flat_comments WHERE flat_id = $1 ORDER BY created_at ASC",
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// POST /api/flats/:id/comments  { text }
router.post("/:id/comments", requireAuth, async (req, res) => {
  const text = req.body.text?.trim();
  if (!text) return res.status(400).json({ error: "Comment text is required" });

  try {
    const result = await query(
      `INSERT INTO flat_comments (flat_id, user_id, name, text)
       SELECT $1, u.id, u.name, $2 FROM users u WHERE u.id = $3
       RETURNING *`,
      [req.params.id, text, req.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to post comment" });
  }
});

// POST /api/flats/:id/rating  { locality_stars: 1-5, built_quality_stars: 1-5 }
router.post("/:id/rating", requireAuth, async (req, res) => {
  const localityStars = Number(req.body.locality_stars);
  const builtQualityStars = Number(req.body.built_quality_stars);
  const isValidStars = (n) => Number.isInteger(n) && n >= 1 && n <= 5;
  if (!isValidStars(localityStars) || !isValidStars(builtQualityStars)) {
    return res.status(400).json({ error: "locality_stars and built_quality_stars must each be an integer between 1 and 5" });
  }

  try {
    // Seed/dummy listings keep their fixed placeholder rating forever — the
    // client never shows them the rating button, but guard it here too
    // rather than trusting that alone.
    const flatCheck = await query("SELECT is_seed FROM flats WHERE id = $1", [req.params.id]);
    if (flatCheck.rows.length === 0) {
      return res.status(404).json({ error: "Flat not found" });
    }
    if (flatCheck.rows[0].is_seed) {
      return res.status(400).json({ error: "This listing's rating can't be changed" });
    }

    await query(
      "INSERT INTO flat_ratings (flat_id, user_id, locality_stars, built_quality_stars) VALUES ($1, $2, $3, $4)",
      [req.params.id, req.userId, localityStars, builtQualityStars]
    );
    const result = await query(
      `UPDATE flats SET rating = (
         SELECT AVG((locality_stars + built_quality_stars) / 2.0)
         FROM flat_ratings
         WHERE flat_id = $1 AND locality_stars IS NOT NULL AND built_quality_stars IS NOT NULL
       )
       WHERE id = $1
       RETURNING rating`,
      [req.params.id]
    );
    res.status(201).json({ rating: result.rows[0].rating });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit rating" });
  }
});

// POST /api/flats/:id/report  { reason? }
router.post("/:id/report", requireAuth, async (req, res) => {
  const reason = req.body?.reason?.trim() || null;
  const flatId = req.params.id;

  try {
    await query(
      "INSERT INTO flat_reports (flat_id, user_id, reason) VALUES ($1, $2, $3)",
      [flatId, req.userId, reason]
    );
    const result = await query(
      "UPDATE flats SET report_count = report_count + 1 WHERE id = $1 RETURNING report_count",
      [flatId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Flat not found" });
    }
    const reportCount = result.rows[0].report_count;

    // Fires exactly once, right as this flat crosses into GET /'s
    // report_count filter above — not on every report after that, since the
    // flat is already off the map by then. Never lets a failed send affect
    // the report response; same log-and-continue contract as every other
    // email in this app.
    if (reportCount === REPORT_REMOVAL_THRESHOLD) {
      try {
        const ownerResult = await query(
          "SELECT u.email AS owner_email FROM flats f LEFT JOIN users u ON u.id = f.owner_id WHERE f.id = $1",
          [flatId]
        );
        const ownerEmail = ownerResult.rows[0]?.owner_email;
        if (ownerEmail) {
          const reasonsResult = await query(
            "SELECT reason FROM flat_reports WHERE flat_id = $1 AND reason IS NOT NULL ORDER BY created_at ASC",
            [flatId]
          );
          await sendReportRemovalEmail({
            to: ownerEmail,
            flatId,
            reportCount,
            reasons: reasonsResult.rows.map((r) => r.reason),
          });
          console.log(`Report-removal email sent: flat ${flatId}`);
        }
      } catch (emailErr) {
        console.error(`Report-removal email failed: flat ${flatId}`, emailErr.message);
      }
    }

    res.status(201).json({ report_count: reportCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

// POST /api/flats/:id/interest  { name, contact, note }
router.post("/:id/interest", requireAuth, async (req, res) => {
  const { name, contact, note } = req.body;
  if (!name?.trim() || !contact?.trim()) {
    return res.status(400).json({ error: "Name and contact are required" });
  }

  try {
    const result = await query(
      `INSERT INTO flat_interests (flat_id, user_id, name, contact, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.params.id, req.userId, name.trim(), contact.trim(), note?.trim() || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit interest" });
  }
});

// POST /api/flats/:id/delete  { code }  — no auth required. The 10-digit
// code emailed at verification time (see lib/verification.js) is the
// credential here, consistent with this app's login-free find-or-create
// auth; deleting does NOT reset or interact with the listing rate limit
// (see lib/listingRateLimit.js) in any way.
router.post("/:id/delete", async (req, res) => {
  const flatId = req.params.id;
  const code = typeof req.body.code === "string" ? req.body.code.trim() : "";

  if (!/^\d{10}$/.test(code)) {
    return res.status(400).json({ error: "Code must be a 10-digit number" });
  }

  try {
    const result = await query(
      "SELECT id, email_verified_at, delete_code_hash FROM flats WHERE id = $1",
      [flatId]
    );
    if (result.rows.length === 0) {
      console.log(`Delete attempt failed on wrong code: flat ${flatId}`);
      return res.status(400).json({ error: "Flat ID or code is incorrect" });
    }

    const flat = result.rows[0];

    // Eligibility is a business rule, not a security boundary, so — per
    // spec — it's checked before the code at all, and is fine to answer
    // with a specific reason rather than the generic wrong-ID-or-code
    // message below. No email_verified_at at all (e.g. seed/dummy data,
    // which never goes through verification) collapses into the same
    // "not eligible" branch, just without a date to name.
    const eligibleAt = flat.email_verified_at ? new Date(flat.email_verified_at).getTime() + DELETE_ELIGIBILITY_DELAY_MS : null;
    if (!eligibleAt || eligibleAt > Date.now()) {
      console.log(`Delete attempt rejected as not-yet-eligible: flat ${flatId}`);
      return res.status(400).json({
        error: eligibleAt
          ? `This listing can be deleted starting ${new Date(eligibleAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}, 24 hours after verification.`
          : "This listing isn't eligible for deletion yet.",
      });
    }

    const attemptLimit = await checkDeleteAttemptLimit(flatId);
    if (!attemptLimit.allowed) {
      return res.status(429).json({ error: "Too many incorrect attempts. Please try again later." });
    }

    if (!deleteCodeHashMatches(hashDeleteCode(code), flat.delete_code_hash)) {
      await recordFailedDeleteAttempt(flatId);
      console.log(`Delete attempt failed on wrong code: flat ${flatId}`);
      return res.status(400).json({ error: "Flat ID or code is incorrect" });
    }

    // Hard delete, same as the expired-listing cleanup job — flat_ratings,
    // flat_comments, flat_reports, and flat_interests all FK to flats.id
    // with ON DELETE CASCADE already, so no dependent-row cleanup is needed
    // here.
    await query("DELETE FROM flats WHERE id = $1", [flatId]);
    console.log(`Flat deleted successfully: flat ${flatId}`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete flat" });
  }
});

export default router;
