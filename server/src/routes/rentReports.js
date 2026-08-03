import { Router } from "express";
import { query } from "../db.js";
import { isWithinChitwanBounds } from "../lib/geo.js";

const router = Router();

// GET /api/rent-reports — public, feeds future Area Stats aggregation.
router.get("/", async (req, res) => {
  try {
    const result = await query("SELECT * FROM rent_reports ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch rent reports" });
  }
});

// POST /api/rent-reports  { rent, bhk, gated, lat, lng, furnishing?, parking_for? } — anonymous, no auth.
router.post("/", async (req, res) => {
  const { rent, bhk, gated, lat, lng, furnishing, parking_for } = req.body;

  const rentNum = Number(rent);
  const bhkNum = Number(bhk);
  if (!Number.isFinite(rentNum) || rentNum <= 0) {
    return res.status(400).json({ error: "rent must be a positive number" });
  }
  if (!Number.isInteger(bhkNum) || bhkNum < 1) {
    return res.status(400).json({ error: "bhk must be a positive integer" });
  }
  if (gated !== "gated" && gated !== "not_gated") {
    return res.status(400).json({ error: "gated must be 'gated' or 'not_gated'" });
  }
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "lat and lng are required" });
  }
  if (!isWithinChitwanBounds(lat, lng)) {
    return res.status(400).json({ error: "Location must be within Chitwan district" });
  }
  if (furnishing != null && furnishing !== "furnished" && furnishing !== "unfurnished") {
    return res.status(400).json({ error: "furnishing must be 'furnished' or 'unfurnished'" });
  }
  let parkingForNum = null;
  if (parking_for !== undefined && parking_for !== null && parking_for !== "") {
    parkingForNum = Number(parking_for);
    if (!Number.isInteger(parkingForNum) || parkingForNum < 0) {
      return res.status(400).json({ error: "parking_for must be a non-negative integer" });
    }
  }

  try {
    const result = await query(
      `INSERT INTO rent_reports (lat, lng, rent, bhk, gated, furnishing, parking_for)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [lat, lng, rentNum, bhkNum, gated, furnishing ?? null, parkingForNum]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit rent report" });
  }
});

export default router;
