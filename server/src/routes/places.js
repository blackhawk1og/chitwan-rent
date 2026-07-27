import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/places — the full OSM-sourced places gazetteer (villages, towns,
// suburbs, neighbourhoods, hamlets), used by the search bar's local
// typeahead alongside flat `area` values. Separate from /api/areas, which
// stays the small curated ward list for the neighbourhood filter dropdown.
router.get("/", async (req, res) => {
  try {
    const result = await query("SELECT id, name, place_type, lat, lng FROM places ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch places" });
  }
});

export default router;
