import { Router } from "express";
import { query } from "../db.js";

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

// No auth yet (Phase 9) — a submitted name is matched to an existing user
// (case-insensitive) or creates a lightweight one, so hero_points has
// somewhere to accrue. Anonymous submissions each become their own
// nameless "A rental hero" entry rather than being merged together.
async function resolveSpotterId(name) {
  if (name) {
    const existing = await query("SELECT id FROM users WHERE LOWER(name) = LOWER($1)", [name]);
    if (existing.rows.length) return existing.rows[0].id;
    const created = await query(
      "INSERT INTO users (name, role, hero_points) VALUES ($1, 'superhero', 0) RETURNING id",
      [name]
    );
    return created.rows[0].id;
  }
  const created = await query("INSERT INTO users (role, hero_points) VALUES ('superhero', 0) RETURNING id");
  return created.rows[0].id;
}

router.post("/", async (req, res) => {
  const { photo_url, name, message, lat, lng } = req.body;

  try {
    const spotterId = await resolveSpotterId(name);

    const result = await query(
      `INSERT INTO tolet_spots (spotter_id, photo_url, name, message, lat, lng)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [spotterId, photo_url ?? null, name ?? null, message ?? null, lat, lng]
    );

    await query(
      "UPDATE users SET hero_points = hero_points + 1, role = 'superhero' WHERE id = $1",
      [spotterId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create to-let spot" });
  }
});

export default router;
