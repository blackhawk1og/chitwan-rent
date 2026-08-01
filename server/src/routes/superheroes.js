import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/superheroes — ranked leaderboard. hero_points is incremented
// 1:1 with to-let spots, so it doubles as the "spots" count directly.
// Real name (users.name) is never returned here — only the self-chosen,
// optional hero_nickname (see routes/toletSpots.js for where it's set);
// the client falls back to "A Rental Hero" when it's null.
router.get("/", async (req, res) => {
  try {
    const result = await query(
      `SELECT
        u.id,
        u.hero_nickname,
        u.hero_points AS spots,
        (
          SELECT message FROM tolet_spots
          WHERE spotter_id = u.id AND message IS NOT NULL
          ORDER BY created_at DESC
          LIMIT 1
        ) AS sample_message
      FROM users u
      WHERE u.hero_points > 0 AND u.is_seed = false
      ORDER BY u.hero_points DESC, u.id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch superheroes" });
  }
});

export default router;
