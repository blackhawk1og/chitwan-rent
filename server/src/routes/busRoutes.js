import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/bus-routes
router.get("/", async (req, res) => {
  try {
    const result = await query("SELECT * FROM bus_routes ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch bus routes" });
  }
});

export default router;
