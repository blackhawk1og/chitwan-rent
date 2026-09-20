import { Router } from "express";
import { query, withTransaction } from "../db.js";
import { isNearAnyRoute, isWithinChitwanBounds } from "../lib/geo.js";
import { requireAuth } from "../lib/auth.js";
import { generateVerificationToken } from "../lib/verification.js";
import { sendVerificationEmail, sendReportRemovalEmail, sendInterestNotificationEmail } from "../lib/email.js";
import { checkListingRateLimit, recordListingAttempt } from "../lib/listingRateLimit.js";
import {
  checkSubmissionLimit,
  recordSubmission,
  checkInterestLimit,
  userKey,
  LISTING_USER_WINDOW_HOURS,
  LISTING_USER_MAX_PER_WINDOW,
} from "../lib/submissionRateLimit.js";
import { validatePhotos } from "../lib/photoLimits.js";
import { verifyFlatDeleteCode } from "../lib/flatCodeVerification.js";

// Mirrors the GET /'s own inline `f.report_count < 3` filter below — that's
// the actual (passive, read-time) removal mechanism, there's no discrete
// "remove this flat" action anywhere. This constant only drives when the
// report route below fires the owner notification once, at the exact moment
// a flat's report_count crosses into that filtered-out range.
// Exported so the internal dashboard's "Reports" section (routes/
// dashboard.js) can flag which reported flats have hit this same threshold
// without hand-copying the number.
export const REPORT_REMOVAL_THRESHOLD = 3;

// The exact moment db/add-flats-report-removal-email-sent-at.js's migration
// ran (captured from that migration's own `SELECT now()` output at the time
// it was applied) — the dashboard's Reports section uses this to tell
// "genuinely didn't send" apart from "predates this column entirely" for a
// flat whose report_removal_email_sent_at is null: if the report that
// crossed REPORT_REMOVAL_THRESHOLD happened before this moment, tracking
// simply didn't exist yet and null carries no information either way; if it
// happened after, the column was live and a null means the send failed.
export const REPORT_REMOVAL_EMAIL_TRACKING_STARTED_AT = "2026-08-04T11:51:48.053Z";

// Base URL for the link a verification email points at — see
// routes/verifyListing.js, mounted at this same origin's /verify-listing.
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;

const router = Router();

// Explicit column list, never f.* — this query feeds the two PUBLIC reads
// below (the map's list fetch and the detail fetch), and f.* was handing every
// caller four secrets plus the owner's contact details:
//   - unsubscribe_token   -> GET /unsubscribe?token=... hard-deletes the listing
//   - delete_code_hash    -> offline-crackable, then /flatstatus accepts the code
//   - verification_token / verification_token_expires_at -> self-verify a listing
//     without ever receiving the email
//   - owner_email / owner_phone -> every owner's contact, bulk-scrapable; no
//     client code reads them from these endpoints (the internal dashboard has
//     its own query in routes/dashboard.js that selects owner_email itself)
// Columns are listed one-by-one rather than excluded from f.*, because SQL has
// no "all but these" form — a new sensitive column added later is therefore
// invisible here until someone deliberately adds it, which is the safe default.
// owner_name is kept: it's the only users column these endpoints still expose.
const SELECT_WITH_OWNER = `
  SELECT
    f.id, f.owner_id, f.listing_type, f.bhk, f.rent, f.deposit, f.furnishing,
    f.includes_maintenance, f.gated, f.who_lives, f.pets_allowed, f.parking_for,
    f.sqft, f.rating, f.one_liner, f.status, f.lat, f.lng, f.area, f.society_name,
    f.photos, f.available_from, f.flatmate_gender_pref, f.food_pref, f.smoker_ok,
    f.posted_at, f.is_seed, f.report_count, f.rent_flagged, f.email_verified_at,
    f.description, f.next_digest_at, f.report_removal_email_sent_at,
    u.name AS owner_name
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
  // Confirmed gap (this feature's own Step 0 finding): before this line
  // existed, the map's default/unfiltered fetch sent no status param at all
  // (see client's DEFAULT_FILTERS.availableOnly = false in lib/filters.js),
  // so a flat the owner marked as rented via POST /:id/mark-rented rendered
  // as a completely ordinary live pin — nothing on the client reads
  // flat.status for marker styling. Same unconditional treatment as
  // pending_verification above rather than new marker-styling logic: a
  // rented flat simply shouldn't be visible under any filter combination,
  // same reasoning as the report_count rule two lines up.
  conditions.push(`f.status != 'rented'`);

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

  // Server-side photo limits — the client's own 6-photo cap is a convenience,
  // not enforcement (see lib/photoLimits.js). No existingCount here: this is
  // a brand-new listing, so whatever arrives is the whole set.
  const photoCheck = validatePhotos(photos);
  if (!photoCheck.ok) {
    return res.status(400).json({ error: photoCheck.error });
  }

  try {
    // Two independent 24h windows, both checked before anything is written.
    // The email one (listing_attempts, unchanged) is the original rule. The
    // user one closes the gap it left: `email` is optional on this route, and
    // omitting it skipped the rate limit entirely while still creating a real
    // row. Keyed on the token's user id, which a caller can't vary without
    // going back through /api/auth/login for a new identity.
    if (email) {
      const rateLimit = await checkListingRateLimit(email);
      if (!rateLimit.allowed) {
        const hourWord = rateLimit.hoursRemaining === 1 ? "hour" : "hours";
        return res.status(429).json({
          error: `You can only list one flat every 24 hours. Try again in ~${rateLimit.hoursRemaining} ${hourWord}.`,
        });
      }
    }

    const userRateLimit = await checkSubmissionLimit({
      kind: "listing",
      key: userKey(req.userId),
      windowHours: LISTING_USER_WINDOW_HOURS,
      max: LISTING_USER_MAX_PER_WINDOW,
    });
    if (!userRateLimit.allowed) {
      const hourWord = userRateLimit.hoursRemaining === 1 ? "hour" : "hours";
      return res.status(429).json({
        error: `You can only list one flat every 24 hours. Try again in ~${userRateLimit.hoursRemaining} ${hourWord}.`,
      });
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
    // Always recorded, with or without an email — this is the half of the
    // limit that an email-less submission can't sidestep.
    await recordSubmission({ kind: "listing", key: userKey(req.userId) });

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

    // Counted against what the listing already holds, so the 6-photo cap
    // holds across repeated calls rather than per request. This replaces a
    // silent `.slice(0, 6)`: an over-limit submission is now refused with a
    // message saying why, instead of being quietly truncated so the caller
    // believes photos were stored that weren't.
    const existingPhotos = existing.rows[0].photos ?? [];
    const photoCheck = validatePhotos(photos, { existingCount: existingPhotos.length });
    if (!photoCheck.ok) {
      return res.status(400).json({ error: photoCheck.error });
    }

    const combined = [...existingPhotos, ...photos];
    // RETURNING id, photos — not RETURNING *. The row is still
    // pending_verification at the point ListFlatSuccessModal calls this, so a
    // full row echoed back the listing's own verification_token (and later its
    // unsubscribe_token / delete_code_hash), which let the submitter verify
    // their listing without ever opening the email. The client only reads
    // .photos off this response (see hooks/useAddFlatPhotos.js).
    const result = await query("UPDATE flats SET photos = $1 WHERE id = $2 RETURNING id, photos", [combined, req.params.id]);
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
    // RETURNING id, photos, same reasoning as the PATCH above — the client
    // only reads .photos (see hooks/useRemoveFlatPhoto.js).
    const result = await query("UPDATE flats SET photos = $1 WHERE id = $2 RETURNING id, photos", [updated, req.params.id]);
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

    // One rating row per user per flat, enforced by
    // uniq_flat_ratings_flat_user (db/add-ratings-reports-unique.js). A
    // repeat submission revises that user's existing stars instead of adding
    // a second row that would weight their opinion twice in the average
    // below — rating again is a legitimate thing to do (the listing may have
    // been visited since), stacking rows is not.
    const upsert = await query(
      `INSERT INTO flat_ratings (flat_id, user_id, locality_stars, built_quality_stars)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (flat_id, user_id) DO UPDATE
         SET locality_stars = EXCLUDED.locality_stars,
             built_quality_stars = EXCLUDED.built_quality_stars,
             created_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [req.params.id, req.userId, localityStars, builtQualityStars]
    );
    // xmax = 0 is true only for a genuinely new row — the standard way to
    // tell an upsert's insert branch from its update branch in one statement.
    const wasInserted = upsert.rows[0].inserted;
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
    // 201 for a new rating, 200 for a revision. The client reads only
    // `rating` off this response (see FlatDetailPanel.jsx), so `updated` is
    // there for API correctness rather than for any current caller.
    res.status(wasInserted ? 201 : 200).json({ rating: result.rows[0].rating, updated: !wasInserted });
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
    // One report per user per flat, enforced by uniq_flat_reports_flat_user
    // (db/add-ratings-reports-unique.js) rather than by trusting the client's
    // own disabled-button state. Before this, a single account could call
    // this three times and push any listing past REPORT_REMOVAL_THRESHOLD on
    // its own. Same ON CONFLICT DO NOTHING + "was a row actually inserted?"
    // shape routes/toletSpots.js already uses for spot reports.
    //
    // The insert and the counter bump run in one transaction: report_count is
    // materialized, and with the constraint in place a failed bump could no
    // longer be corrected by re-reporting (the retry would conflict), leaving
    // the count permanently short of the rows backing it.
    const { inserted, reportCount } = await withTransaction(async (client) => {
      const insertResult = await client.query(
        `INSERT INTO flat_reports (flat_id, user_id, reason)
         VALUES ($1, $2, $3)
         ON CONFLICT (flat_id, user_id) DO NOTHING
         RETURNING id`,
        [flatId, req.userId, reason]
      );

      if (insertResult.rows.length === 0) {
        const existing = await client.query("SELECT report_count FROM flats WHERE id = $1", [flatId]);
        return { inserted: false, reportCount: existing.rows[0]?.report_count ?? null };
      }

      // Kept as report_count + 1 rather than a COUNT(*) recount: the
      // increment takes a row lock, so two concurrent reports from different
      // users get distinct values and exactly one of them sees the threshold
      // — a recount could hand the same number to both and send the removal
      // email twice.
      const updated = await client.query(
        "UPDATE flats SET report_count = report_count + 1 WHERE id = $1 RETURNING report_count",
        [flatId]
      );
      return { inserted: true, reportCount: updated.rows[0].report_count };
    });

    if (reportCount === null) {
      return res.status(404).json({ error: "Flat not found" });
    }
    if (!inserted) {
      // Already reported by this exact user — idempotent, not an error, and
      // deliberately not a 429: the report stands, there is simply nothing
      // more to record. Mirrors toletSpots.js's own repeat-report response.
      return res.status(200).json({ report_count: reportCount, alreadyReported: true });
    }

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

          // Only reached after sendReportRemovalEmail resolves without
          // throwing — a failed send (caught below) never reaches this line,
          // so the column stays null exactly when the send didn't actually
          // succeed. Its own failure is logged and swallowed separately so a
          // DB hiccup here can't turn an already-sent email into a 500.
          try {
            await query("UPDATE flats SET report_removal_email_sent_at = now() WHERE id = $1", [flatId]);
          } catch (trackingErr) {
            console.error(`Failed to record report-removal email timestamp: flat ${flatId}`, trackingErr.message);
          }
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

// POST /api/flats/:id/interest  { contact, note?, move_in?, gender?, parking_required?, parking_count? }
// "name" was removed from InterestForm.jsx (see that form's own comments) —
// flat_interests.name stays in the table (already nullable at the DB level,
// no migration needed) but is simply never populated by this route anymore.
router.post("/:id/interest", requireAuth, async (req, res) => {
  const { contact, note, move_in, gender, parking_required, parking_count } = req.body;
  if (!contact?.trim()) {
    return res.status(400).json({ error: "Contact is required" });
  }

  // Only trusted as meaningful when parking_required is actually true —
  // matches InterestForm.jsx only ever sending a non-null parking_count
  // alongside parking_required: true, but not relying on the client alone
  // to enforce that pairing. parking_count == null (covers both null and
  // undefined) is checked first since Number(null) is 0, not NaN — without
  // this it would silently turn "not specified" into a real 0.
  const parkingCountNum =
    parking_count != null && Number.isFinite(Number(parking_count)) && parking_required === true
      ? Number(parking_count)
      : null;

  try {
    // Every accepted submission emails the flat's owner, so without a cap
    // this route is an email-bombing tool aimed at whichever owner the
    // caller picks (and a way to burn the SendGrid quota the whole app
    // shares). One per flat per person per 24h — a genuinely interested
    // seeker has no reason to submit the same listing twice in a day, and
    // the owner already has their contact details from the first one.
    const rateLimit = await checkInterestLimit(req.params.id, req.userId);
    if (!rateLimit.allowed) {
      const hourWord = rateLimit.hoursRemaining === 1 ? "hour" : "hours";
      return res.status(429).json({
        error: `You've already sent this owner your details — they have them. You can send interest in this listing again in ~${rateLimit.hoursRemaining} ${hourWord}.`,
      });
    }

    const result = await query(
      `INSERT INTO flat_interests (flat_id, user_id, contact, note, move_in, gender, parking_required, parking_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.params.id, req.userId, contact.trim(), note?.trim() || null,
        move_in ?? null, gender ?? null, parking_required ?? null, parkingCountNum,
      ]
    );
    const interest = result.rows[0];

    // The CTA on FlatDetailPanel.jsx promises this ("we'll email the
    // owner") — never let a failed send turn an already-recorded interest
    // into an error response, same log-and-continue contract as every other
    // email in this app.
    try {
      const ownerResult = await query(
        "SELECT u.email AS owner_email FROM flats f LEFT JOIN users u ON u.id = f.owner_id WHERE f.id = $1",
        [req.params.id]
      );
      const ownerEmail = ownerResult.rows[0]?.owner_email;
      if (ownerEmail) {
        await sendInterestNotificationEmail({
          to: ownerEmail,
          flatId: req.params.id,
          contact: interest.contact,
          note: interest.note,
          moveIn: interest.move_in,
          gender: interest.gender,
          parkingRequired: interest.parking_required,
          parkingCount: interest.parking_count,
        });
        console.log(`Interest notification email sent: flat ${req.params.id}`);
      }
    } catch (emailErr) {
      console.error(`Interest notification email failed: flat ${req.params.id}`, emailErr.message);
    }

    res.status(201).json(interest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit interest" });
  }
});

// POST /api/flats/:id/delete  { code }  — no auth required. The 10-digit
// code emailed at verification time (see lib/verification.js) is the
// credential here, consistent with this app's login-free find-or-create
// auth; deleting does NOT reset or interact with the listing rate limit
// (see lib/listingRateLimit.js) in any way. Code check itself lives in
// lib/flatCodeVerification.js, shared with POST /:id/mark-rented below —
// this route's own job is only what happens after a verified match.
router.post("/:id/delete", async (req, res) => {
  const flatId = req.params.id;

  try {
    const verification = await verifyFlatDeleteCode(flatId, req.body.code);
    if (!verification.ok) {
      return res.status(verification.status).json({ error: verification.error });
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

// POST /api/flats/:id/mark-rented  { code }  — same no-auth, code-is-the-
// credential shape as POST /:id/delete right above, and the exact same
// verifyFlatDeleteCode check (format, 24h eligibility, brute-force limit,
// hashed comparison) rather than a re-implementation of it. Soft: sets
// status = 'rented' instead of hard-deleting, so the listing's history
// (ratings/comments/reports/interests) survives — GET /'s own status != '
// rented' condition (added alongside this route) is what actually takes it
// off the live map.
router.post("/:id/mark-rented", async (req, res) => {
  const flatId = req.params.id;

  try {
    const verification = await verifyFlatDeleteCode(flatId, req.body.code);
    if (!verification.ok) {
      return res.status(verification.status).json({ error: verification.error });
    }

    const result = await query("UPDATE flats SET status = 'rented' WHERE id = $1 RETURNING id, status", [flatId]);
    console.log(`Flat marked as rented: flat ${flatId}`);
    res.json({ ok: true, status: result.rows[0].status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark flat as rented" });
  }
});

export default router;
