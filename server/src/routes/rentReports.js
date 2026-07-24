import { Router } from "express";
import { query } from "../db.js";

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

// POST /api/rent-reports  { rent, bhk, gated, lat, lng } — anonymous, no auth.
router.post("/", async (req, res) => {
  const { rent, bhk, gated, lat, lng } = req.body;

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

  try {
    const result = await query(
      `INSERT INTO rent_reports (lat, lng, rent, bhk, gated) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [lat, lng, rentNum, bhkNum, gated]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit rent report" });
  }
});

export default router;
