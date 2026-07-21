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

export default router;
