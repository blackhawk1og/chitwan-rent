import { Router } from "express";
import multer from "multer";
import { query } from "../db.js";
import { requireAuth } from "../lib/auth.js";
import cloudinary from "../lib/cloudinary.js";

const router = Router();

// memoryStorage, not diskStorage — Render's filesystem is ephemeral, so
// writing to disk first would be wasted work at best and lost on every
// deploy/restart at worst. The buffer goes straight to Cloudinary in
// POST /upload-photo below, never touching this server's disk at all.
// 10MB matches express.json's own limit (index.js) for the other
// image-carrying route (flat photos — still base64-in-JSON, see this
// route's own comment below for why that one wasn't touched).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Mirrors flats.js's own REPORT_REMOVAL_THRESHOLD (3) — same "enough reports
// crosses a fixed threshold" shape, kept as its own constant rather than a
// shared import since the two are conceptually similar but not the same
// rule (nothing ties them together; they're free to diverge later).
const TOLET_REPORT_REMOVAL_THRESHOLD = 3;

// GET /api/tolet-spots — joins in the spotter's self-chosen hero_nickname
// (not users.name — see routes/superheroes.js) so ToletSpotsLayer.jsx never
// needs to show a real identity field. tolet_spots.name (the old
// per-submission "your name" value) is still stored on each row but no
// longer read for display. Excludes anything reported off the map — see
// POST /:id/report below — same unconditional (not filter-dependent)
// treatment as flats' own report_count/status exclusions in flats.js.
router.get("/", async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*, u.hero_nickname
       FROM tolet_spots t
       LEFT JOIN users u ON u.id = t.spotter_id
       WHERE t.status != 'removed'
       ORDER BY t.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch to-let spots" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { photo_url, name, message, lat, lng } = req.body;

  try {
    // `name` here is really "nickname" now (see SpotToLetModal.jsx's
    // relabeled input) — set once and never overwritten by a later
    // submission (COALESCE), same protective pattern the old users.name
    // update used. It intentionally no longer touches users.name at all:
    // writing a chosen nickname into the real-name field would corrupt it.
    if (name) {
      await query("UPDATE users SET hero_nickname = COALESCE(hero_nickname, $1) WHERE id = $2", [name, req.userId]);
    }

    const result = await query(
      `INSERT INTO tolet_spots (spotter_id, photo_url, name, message, lat, lng)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [req.userId, photo_url ?? null, name ?? null, message ?? null, lat, lng]
    );

    await query(
      "UPDATE users SET hero_points = hero_points + 1, role = 'superhero' WHERE id = $1",
      [req.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create to-let spot" });
  }
});

// POST /api/tolet-spots/upload-photo — uploads a To-Let board photo to
// Cloudinary and returns its secure_url; the client sends that back as
// tolet_spots.photo_url in a separate POST / call above (see
// SpotToLetModal.jsx's submit flow: upload first, then create) rather than
// this route creating the row itself. Only To-Let spot photos go through
// Cloudinary — flat listing photos (ListFlatSuccessModal.jsx /
// hooks/useAddFlatPhotos.js) still read as base64 and store directly in
// Postgres, same pattern tolet_spots.photo_url itself used before this
// migration; that path wasn't touched here.
//
// Multer errors (e.g. the 10MB limit above) are handled explicitly rather
// than left to bubble to Express's default (non-JSON) error page — every
// other error response in this API is JSON, and the client's fetch-based
// error handling expects to be able to res.json() the body.
router.post(
  "/upload-photo",
  requireAuth,
  (req, res, next) => {
    upload.single("photo")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || "Failed to process photo upload" });
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No photo provided" });
    }

    try {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: "tolet-spots" }, (err, uploaded) => {
          if (err) reject(err);
          else resolve(uploaded);
        });
        stream.end(req.file.buffer);
      });

      res.status(201).json({ url: result.secure_url });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  }
);

// POST /api/tolet-spots/:id/report — "Board gone / wrong" from
// ToletSpotDetailCard.jsx. Unlike flats' own POST /:id/report, this one
// actually dedupes by reporter: the INSERT below relies on
// tolet_spot_reports' UNIQUE(tolet_spot_id, user_id) constraint (see
// add-tolet-spot-reports.js) rather than trusting the client to only send
// one report per user, so `ON CONFLICT DO NOTHING` + checking whether a row
// was actually inserted is what makes a repeat report from the same user a
// no-op instead of double-counting.
router.post("/:id/report", requireAuth, async (req, res) => {
  const spotId = req.params.id;

  try {
    const insertResult = await query(
      `INSERT INTO tolet_spot_reports (tolet_spot_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (tolet_spot_id, user_id) DO NOTHING
       RETURNING id`,
      [spotId, req.userId]
    );

    if (insertResult.rows.length === 0) {
      // Already reported by this exact user — idempotent, not an error.
      // Still resolves the current count so the client can show the same
      // "reported" state it would after a first-time report.
      const existing = await query("SELECT report_count FROM tolet_spots WHERE id = $1", [spotId]);
      if (existing.rows.length === 0) return res.status(404).json({ error: "Spot not found" });
      return res.status(200).json({ report_count: existing.rows[0].report_count, alreadyReported: true });
    }

    const result = await query(
      "UPDATE tolet_spots SET report_count = report_count + 1 WHERE id = $1 RETURNING report_count",
      [spotId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Spot not found" });
    }
    const reportCount = result.rows[0].report_count;

    // Status flip only, never a DELETE — the row (and its report_count/
    // tolet_spot_reports history) stays for moderation/audit purposes. The
    // `AND status != 'removed'` guard makes this safe to run even if two
    // reports somehow raced past the threshold at once.
    let removed = false;
    if (reportCount >= TOLET_REPORT_REMOVAL_THRESHOLD) {
      await query("UPDATE tolet_spots SET status = 'removed' WHERE id = $1 AND status != 'removed'", [spotId]);
      removed = true;
    }

    res.status(201).json({ report_count: reportCount, removed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

export default router;
