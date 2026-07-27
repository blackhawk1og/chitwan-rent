import { Router } from "express";
import { query } from "../db.js";
import { AREAS } from "../../db/areasData.js";

const router = Router();

// GET /api/areas — the full canonical ward/tole list, used for the
// neighbourhood filter dropdown and the local (no-network) search typeahead.
// Every seeded area is always present (with its approximate seed centroid
// as a fallback) regardless of whether it currently has any flats — a place
// with zero active listings must still be findable by name. Where flats do
// exist, their averaged real centroid and count are merged in instead.
router.get("/", async (req, res) => {
  try {
    const result = await query(
      `SELECT area, AVG(lat) AS lat, AVG(lng) AS lng, COUNT(*) AS count
       FROM flats
       WHERE area IS NOT NULL
       GROUP BY area`
    );
    const liveByName = new Map(result.rows.map((r) => [r.area, r]));

    const merged = AREAS.map((a) => {
      const live = liveByName.get(a.name);
      return {
        area: a.name,
        lat: live ? Number(live.lat) : a.lat,
        lng: live ? Number(live.lng) : a.lng,
        count: live ? Number(live.count) : 0,
      };
    });

    // Flat `area` values that aren't in the canonical seed list (e.g.
    // free-text results from Nominatim reverse-geocoding at listing time)
    // still surface too — the seed list is a floor, not a ceiling.
    for (const row of result.rows) {
      if (!AREAS.some((a) => a.name === row.area)) {
        merged.push({ area: row.area, lat: Number(row.lat), lng: Number(row.lng), count: Number(row.count) });
      }
    }

    merged.sort((a, b) => b.count - a.count);
    res.json(merged);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch areas" });
  }
});

export default router;
