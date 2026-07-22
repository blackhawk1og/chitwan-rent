import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// GET /api/tolet-spots
router.get("/", async (req, res) => {
  try {
    const result = await query("SELECT * FROM tolet_spots ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch to-let spots" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const { photo_url, name, message, lat, lng } = req.body;

  try {
    if (name) {
      await query("UPDATE users SET name = COALESCE(name, $1) WHERE id = $2", [name, req.userId]);
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

export default router;
