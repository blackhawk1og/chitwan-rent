import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/superheroes — ranked leaderboard. hero_points is incremented
// 1:1 with to-let spots, so it doubles as the "spots" count directly.
router.get("/", async (req, res) => {
  try {
    const result = await query(
      `SELECT
        u.id,
        u.name,
        u.hero_points AS spots,
        (
          SELECT message FROM tolet_spots
          WHERE spotter_id = u.id AND message IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 1
        ) AS sample_message
      FROM users u
      WHERE u.hero_points > 0
      ORDER BY u.hero_points DESC, u.id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch superheroes" });
  }
});

export default router;
