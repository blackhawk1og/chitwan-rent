import { Router } from "express";
import { query } from "../db.js";
import { haversineDistanceMeters } from "../lib/geo.js";

const router = Router();

function median(sortedValues) {
  const count = sortedValues.length;
  if (count === 0) return null;
  const mid = Math.floor(count / 2);
  return count % 2 === 0
    ? Math.round((sortedValues[mid - 1] + sortedValues[mid]) / 2)
    : sortedValues[mid];
}

// GET /api/stats/nearby?lat=&lng=&radius=2000
// Median rent by BHK (1/2/3) among available flats within `radius` metres of a point.
router.get("/nearby", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius = Number(req.query.radius) || 2000;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: "lat and lng are required" });
  }

  try {
    const result = await query("SELECT bhk, rent, lat, lng FROM flats WHERE status = 'available'");
    const nearby = result.rows.filter((f) => haversineDistanceMeters(lat, lng, f.lat, f.lng) <= radius);

    const buckets = [1, 2, 3].map((bhk) => {
      const rents = nearby
        .filter((f) => f.bhk === bhk)
        .map((f) => f.rent)
        .sort((a, b) => a - b);
      return { bhk, median: median(rents), count: rents.length };
    });

    res.json({ lat, lng, radius, buckets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to compute nearby stats" });
  }
});

export default router;
