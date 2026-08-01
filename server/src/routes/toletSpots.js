import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// GET /api/tolet-spots — joins in the spotter's self-chosen hero_nickname
// (not users.name — see routes/superheroes.js) so ToletSpotsLayer.jsx never
// needs to show a real identity field. tolet_spots.name (the old
// per-submission "your name" value) is still stored on each row but no
// longer read for display.
router.get("/", async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*, u.hero_nickname
       FROM tolet_spots t
       LEFT JOIN users u ON u.id = t.spotter_id
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

export default router;
