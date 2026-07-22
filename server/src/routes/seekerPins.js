import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// GET /api/seeker-pins
router.get("/", async (req, res) => {
  try {
    const result = await query("SELECT * FROM seeker_pins ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch seeker pins" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await query("SELECT * FROM seeker_pins WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Seeker pin not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch seeker pin" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const {
    looking_for, budget, bhk_pref, move_in, food_pref, smoker_ok,
    gender, flatmate_gender_pref, parking_required, lifestyle_note, email, phone,
    lat, lng, area,
  } = req.body;

  try {
    if (email || phone) {
      await query(
        "UPDATE users SET email = COALESCE(email, $1), phone = COALESCE(phone, $2) WHERE id = $3",
        [email ?? null, phone ?? null, req.userId]
      );
    }

    const result = await query(
      `INSERT INTO seeker_pins
        (user_id, looking_for, budget, bhk_pref, move_in, food_pref, smoker_ok,
         gender, flatmate_gender_pref, parking_required, lifestyle_note, email, phone, lat, lng, area)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        req.userId, looking_for, budget ?? null, bhk_pref ?? null, move_in ?? null,
        food_pref ?? null, smoker_ok ?? null, gender ?? null, flatmate_gender_pref ?? null,
        parking_required ?? false, lifestyle_note ?? null, email ?? null, phone ?? null,
        lat, lng, area ?? null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create seeker pin" });
  }
});

export default router;
