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

// GET /api/stats/nearby-seekers?lat=&lng=&radius=3000
// Count of seeker_pins within `radius` metres of a point — used by the List
// My Flat success screen ("N seekers are looking near your flat"). Same
// fetch-all-then-haversine-filter approach as /nearby above.
router.get("/nearby-seekers", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius = Number(req.query.radius) || 3000;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: "lat and lng are required" });
  }

  try {
    const result = await query("SELECT lat, lng FROM seeker_pins");
    const count = result.rows.filter((s) => haversineDistanceMeters(lat, lng, s.lat, s.lng) <= radius).length;
    res.json({ lat, lng, radius, count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to compute nearby seeker count" });
  }
});

function average(values) {
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
}

function buildBucket(label, rents) {
  if (!rents.length) return { bhk: label, count: 0, avg: null, min: null, max: null };
  return { bhk: label, count: rents.length, avg: average(rents), min: Math.min(...rents), max: Math.max(...rents) };
}

// GET /api/stats/area?bbox=lat1,lng1,lat2,lng2&type=all|gated|not_gated
// Avg/min/max rent per BHK bucket among available flats inside the box.
router.get("/area", async (req, res) => {
  const { bbox, type } = req.query;
  const coords = (bbox || "").split(",").map(Number);

  if (coords.length !== 4 || coords.some(Number.isNaN)) {
    return res.status(400).json({ error: "bbox required as lat1,lng1,lat2,lng2" });
  }
  const [lat1, lng1, lat2, lng2] = coords;
  const minLat = Math.min(lat1, lat2);
  const maxLat = Math.max(lat1, lat2);
  const minLng = Math.min(lng1, lng2);
  const maxLng = Math.max(lng1, lng2);

  const conditions = ["status = 'available'", "lat BETWEEN $1 AND $2", "lng BETWEEN $3 AND $4"];
  const params = [minLat, maxLat, minLng, maxLng];
  if (type === "gated" || type === "not_gated") {
    params.push(type);
    conditions.push(`gated = $${params.length}`);
  }

  try {
    const result = await query(
      `SELECT bhk, rent FROM flats WHERE ${conditions.join(" AND ")}`,
      params
    );
    const rows = result.rows;
    const allRents = rows.map((r) => r.rent);

    const buckets = [1, 2, 3, 4].map((bhk) =>
      buildBucket(bhk, rows.filter((r) => r.bhk === bhk).map((r) => r.rent))
    );
    buckets.push(buildBucket("5+", rows.filter((r) => r.bhk >= 5).map((r) => r.rent)));

    res.json({
      count: rows.length,
      overallAvg: average(allRents),
      buckets,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to compute area stats" });
  }
});

export default router;
