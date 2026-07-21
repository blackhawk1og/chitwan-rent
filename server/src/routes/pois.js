import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/pois?category=school,college
router.get("/", async (req, res) => {
  const { category } = req.query;
  try {
    const result = category
      ? await query("SELECT * FROM pois WHERE category = ANY($1) ORDER BY id", [category.split(",")])
      : await query("SELECT * FROM pois ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch pois" });
  }
});

export default router;
