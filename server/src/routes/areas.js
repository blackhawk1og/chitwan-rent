import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/areas — distinct ward/tole names with a centroid, used for the
// neighbourhood filter dropdown and the local (no-network) search typeahead.
router.get("/", async (req, res) => {
  try {
    const result = await query(
      `SELECT area, AVG(lat) AS lat, AVG(lng) AS lng, COUNT(*) AS count
       FROM flats
       WHERE area IS NOT NULL
       GROUP BY area
       ORDER BY count DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch areas" });
  }
});

export default router;
