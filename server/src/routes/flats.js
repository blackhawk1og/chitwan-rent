import { Router } from "express";
import { query } from "../db.js";
import { isNearAnyRoute } from "../lib/geo.js";
import { requireAuth } from "../lib/auth.js";

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
    const result = await query(`${SELECT_WITH_OWNER} WHERE f.id = $1`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Flat not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch flat" });
  }
});

// Dummy "feels alive" touch: a fresh listing starts pending_review and
// silently flips to available a few seconds later, no manual moderation step.
const AUTO_AVAILABLE_DELAY_MS = 8000;

// New listings don't have organic reviews yet — seed a placeholder rating in
// the same 3.5-5.0 range as the seed data so the map's info-chip has something to show.
function randomRating() {
  return Number((3.5 + Math.random() * 1.5).toFixed(1));
}

router.post("/", requireAuth, async (req, res) => {
  const {
    listing_type, bhk, rent, deposit, furnishing, includes_maintenance,
    gated, who_lives, pets_allowed, parking_for, sqft, one_liner, lat, lng, area, society_name, photos, email, phone,
    available_from, flatmate_gender_pref, food_pref, smoker_ok,
  } = req.body;

  try {
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

    const result = await query(
      `INSERT INTO flats
        (owner_id, listing_type, bhk, rent, deposit, furnishing, includes_maintenance,
         gated, who_lives, pets_allowed, parking_for, sqft, rating, one_liner, status, lat, lng, area, society_name, photos,
         available_from, flatmate_gender_pref, food_pref, smoker_ok)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending_review',$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING *`,
      [
        req.userId, listing_type ?? "flat", bhk, rent, deposit ?? null, furnishing,
        includes_maintenance ?? false, gated, who_lives ?? null, pets_allowed ?? null,
        parking_for ?? 0, sqft ?? null, randomRating(), one_liner ?? null, lat, lng, area ?? null, society_name ?? null, photos ?? [],
        available_from ?? null, flatmate_gender_pref ?? null, food_pref ?? null, smoker_ok ?? null,
      ]
    );

    const flat = result.rows[0];
    setTimeout(() => {
      query("UPDATE flats SET status = 'available' WHERE id = $1 AND status = 'pending_review'", [flat.id]).catch(
        (err) => console.error("Failed to auto-flip flat to available:", err)
      );
    }, AUTO_AVAILABLE_DELAY_MS);

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

// POST /api/flats/:id/rating  { stars: 1-5 }
router.post("/:id/rating", requireAuth, async (req, res) => {
  const stars = Number(req.body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: "stars must be an integer between 1 and 5" });
  }

  try {
    await query(
      "INSERT INTO flat_ratings (flat_id, user_id, stars) VALUES ($1, $2, $3)",
      [req.params.id, req.userId, stars]
    );
    const result = await query(
      `UPDATE flats SET rating = (SELECT AVG(stars) FROM flat_ratings WHERE flat_id = $1)
       WHERE id = $1
       RETURNING rating`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Flat not found" });
    }
    res.status(201).json({ rating: result.rows[0].rating });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit rating" });
  }
});

// POST /api/flats/:id/report  { reason? }
router.post("/:id/report", requireAuth, async (req, res) => {
  const reason = req.body?.reason?.trim() || null;

  try {
    await query(
      "INSERT INTO flat_reports (flat_id, user_id, reason) VALUES ($1, $2, $3)",
      [req.params.id, req.userId, reason]
    );
    const result = await query(
      "UPDATE flats SET report_count = report_count + 1 WHERE id = $1 RETURNING report_count",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Flat not found" });
    }
    res.status(201).json({ report_count: result.rows[0].report_count });
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

export default router;
