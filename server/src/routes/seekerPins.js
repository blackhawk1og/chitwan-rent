import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../lib/auth.js";
import { isWithinChitwanBounds } from "../lib/geo.js";
import { generateUnsubscribeToken } from "../lib/verification.js";
import { sendSeekerConfirmationEmail } from "../lib/email.js";
import {
  checkSubmissionLimit,
  recordSubmission,
  emailOrUserKey,
  SEEKER_PIN_WINDOW_HOURS,
  SEEKER_PIN_MAX_PER_WINDOW,
} from "../lib/submissionRateLimit.js";

const router = Router();

// Explicit column list, never SELECT * — every read below is public (no
// requireAuth), and SELECT * was publishing:
//   - unsubscribe_token -> GET /unsubscribe?token=... hard-deletes that pin
//   - email / phone     -> every seeker's contact details, for all pins at
//     once, to anyone who called the endpoint
// SeekerDetailCard's "Reveal contact" button was never a server-side gate: it
// only hid values the browser had already downloaded in this payload. With
// these columns gone it renders its existing "Phone/Email not available"
// fallback. Restoring the feature needs a separate, access-controlled contact
// endpoint — deliberately NOT added in this pass (see the handover notes).
// Listed one-by-one rather than excluded from *, so a sensitive column added
// later stays out of these responses until someone adds it on purpose.
const SEEKER_PUBLIC_COLUMNS = `
  id, user_id, looking_for, budget, bhk_pref, move_in, food_pref, smoker_ok,
  gender, flatmate_gender_pref, parking_required, lifestyle_note, lat, lng,
  area, created_at, is_seed, next_digest_at, archived_at
`;

// GET /api/seeker-pins — active pins only (archived_at IS NULL). This feeds
// the map layer; an archived pin is meant to disappear from the map, not
// just stop matching, so it's excluded here the same way it's excluded from
// digestJob.js's ACTIVE_SEEKERS_SQL.
router.get("/", async (req, res) => {
  try {
    const result = await query(`SELECT ${SEEKER_PUBLIC_COLUMNS} FROM seeker_pins WHERE archived_at IS NULL ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch seeker pins" });
  }
});

// GET /api/seeker-pins/by-email?email=... — every seeker_pins row (active
// AND archived) for this email, used by the client right before creating a
// new pin to decide whether to show the archive-check modal (see POST /
// below). Deliberately public, no auth — matches this file's existing read
// endpoints (only the write below requires it), and a plain client-side
// fetchJson() call (no Bearer token attached) is what calls this. Must stay
// registered before GET /:id, or Express would match "by-email" as an :id.
router.get("/by-email", async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.trim() : "";
  if (!email) return res.json([]);

  try {
    const result = await query(
      `SELECT ${SEEKER_PUBLIC_COLUMNS} FROM seeker_pins WHERE email = $1 ORDER BY created_at DESC`,
      [email]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to look up existing seeker pins" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await query(`SELECT ${SEEKER_PUBLIC_COLUMNS} FROM seeker_pins WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Seeker pin not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch seeker pin" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const {
    looking_for, budget, bhk_pref, move_in, food_pref, smoker_ok,
    gender, flatmate_gender_pref, parking_required, lifestyle_note, email, phone,
    lat, lng, area, archive_pin_ids,
  } = req.body;

  if (!isWithinChitwanBounds(lat, lng)) {
    return res.status(400).json({ error: "Location must be within Chitwan district" });
  }

  // Every created pin sends a confirmation email to whatever address was
  // submitted, with no verification that the submitter owns it — so an
  // unlimited version of this route is a way to mail arbitrary strangers
  // from our verified sender and exhaust the shared SendGrid quota. Checked
  // before any write, so a rejected submission leaves nothing behind.
  //
  // 3 per 24h rather than 1: unlike a flat listing, dropping a couple of
  // pins in a day is legitimate (different areas or budgets), and the
  // archive-check flow in particular ends in creating a fresh pin. This is a
  // spam backstop, deliberately above normal use, and it neither replaces
  // nor interacts with that flow.
  const rateLimitKey = emailOrUserKey(email, req.userId);
  const rateLimit = await checkSubmissionLimit({
    kind: "seeker_pin",
    key: rateLimitKey,
    windowHours: SEEKER_PIN_WINDOW_HOURS,
    max: SEEKER_PIN_MAX_PER_WINDOW,
  });
  if (!rateLimit.allowed) {
    const hourWord = rateLimit.hoursRemaining === 1 ? "hour" : "hours";
    return res.status(429).json({
      error: `You can create up to ${SEEKER_PIN_MAX_PER_WINDOW} seeker pins every 24 hours. Try again in ~${rateLimit.hoursRemaining} ${hourWord}.`,
    });
  }

  try {
    if (email || phone) {
      await query(
        "UPDATE users SET email = COALESCE(email, $1), phone = COALESCE(phone, $2) WHERE id = $3",
        [email ?? null, phone ?? null, req.userId]
      );
    }

    // Archive-check modal's "Archive selected + add new pin" action (see
    // GET /by-email above and ArchiveCheckPinsModal.jsx) — archives
    // whichever of the submitter's own existing pins they left checked,
    // before the new one is created. Scoped to `email` (not just the raw
    // ids) as a sanity guard against archiving pins that don't actually
    // belong to the email being submitted; already-archived rows are a
    // no-op via the archived_at IS NULL condition, since archiving is
    // one-directional. Never touches pins the user unchecked — those stay
    // active exactly as they were.
    if (Array.isArray(archive_pin_ids) && archive_pin_ids.length > 0 && email) {
      await query(
        "UPDATE seeker_pins SET archived_at = now() WHERE id = ANY($1) AND email = $2 AND archived_at IS NULL",
        [archive_pin_ids, email]
      );
    }

    // Seeker pins have no verification step (contrast routes/flats.js's
    // pending_verification flow) — creation is the moment a pin becomes
    // "active," so this is also the moment its digest schedule starts:
    // first digest 12h from now, then every 7 days (see lib/digestJob.js),
    // mirroring the flats-side rule set in verifyListingByToken exactly.
    const result = await query(
      `INSERT INTO seeker_pins
        (user_id, looking_for, budget, bhk_pref, move_in, food_pref, smoker_ok,
         gender, flatmate_gender_pref, parking_required, lifestyle_note, email, phone, lat, lng, area,
         unsubscribe_token, next_digest_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now() + interval '12 hours')
       RETURNING *`,
      [
        req.userId, looking_for, budget ?? null, bhk_pref ?? null, move_in ?? null,
        food_pref ?? null, smoker_ok ?? null, gender ?? null, flatmate_gender_pref ?? null,
        parking_required ?? false, lifestyle_note ?? null, email ?? null, phone ?? null,
        lat, lng, area ?? null, generateUnsubscribeToken(),
      ]
    );
    const pin = result.rows[0];

    // Recorded after the pin actually exists, so a failed creation doesn't
    // consume one of the submitter's three. Same key the check above used.
    await recordSubmission({ kind: "seeker_pin", key: rateLimitKey });

    if (email) {
      try {
        await sendSeekerConfirmationEmail({ to: email });
        console.log(`Seeker confirmation email sent: seeker pin ${pin.id}`);
      } catch (emailErr) {
        // Same contract as every other email in this app — the pin is
        // already created and live either way, so a failed send here never
        // turns this response into a failure.
        console.error(`Seeker confirmation email failed: seeker pin ${pin.id}`, emailErr.message);
      }
    }

    res.status(201).json(pin);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create seeker pin" });
  }
});

export default router;
