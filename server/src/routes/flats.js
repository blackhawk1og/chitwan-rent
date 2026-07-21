import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/flats?status=available
router.get("/", async (req, res) => {
  const { status } = req.query;
  try {
    const result = status
      ? await query("SELECT * FROM flats WHERE status = $1 ORDER BY posted_at DESC", [status])
      : await query("SELECT * FROM flats ORDER BY posted_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch flats" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await query("SELECT * FROM flats WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Flat not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch flat" });
  }
});

router.post("/", async (req, res) => {
  const {
    owner_id, listing_type, bhk, rent, deposit, furnishing, includes_maintenance,
    gated, who_lives, pets_allowed, parking_for, sqft, one_liner, lat, lng, area, photos,
  } = req.body;

  try {
    const result = await query(
      `INSERT INTO flats
        (owner_id, listing_type, bhk, rent, deposit, furnishing, includes_maintenance,
         gated, who_lives, pets_allowed, parking_for, sqft, one_liner, status, lat, lng, area, photos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending_review',$14,$15,$16,$17)
       RETURNING *`,
      [
        owner_id ?? null, listing_type ?? "flat", bhk, rent, deposit ?? null, furnishing,
        includes_maintenance ?? false, gated, who_lives ?? null, pets_allowed ?? null,
        parking_for ?? 0, sqft ?? null, one_liner ?? null, lat, lng, area ?? null, photos ?? [],
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create flat" });
  }
});

export default router;
