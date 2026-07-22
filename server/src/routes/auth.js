import { Router } from "express";
import { query } from "../db.js";
import { signToken } from "../lib/auth.js";

const router = Router();

// POST /api/auth/login — dummy identity: email or phone, no password/OTP.
// Finds a matching user or creates one, and always returns a fresh token.
router.post("/login", async (req, res) => {
  const email = req.body.email?.trim() || null;
  const phone = req.body.phone?.trim() || null;
  const name = req.body.name?.trim() || null;

  if (!email && !phone) {
    return res.status(400).json({ error: "Email or phone is required" });
  }

  try {
    let user = null;
    if (email) {
      const r = await query("SELECT * FROM users WHERE email = $1", [email]);
      if (r.rows.length) user = r.rows[0];
    }
    if (!user && phone) {
      const r = await query("SELECT * FROM users WHERE phone = $1", [phone]);
      if (r.rows.length) user = r.rows[0];
    }

    if (!user) {
      const created = await query(
        "INSERT INTO users (name, email, phone, role) VALUES ($1,$2,$3,'user') RETURNING *",
        [name, email, phone]
      );
      user = created.rows[0];
    } else {
      const updated = await query(
        `UPDATE users SET name = COALESCE(name, $1), email = COALESCE(email, $2), phone = COALESCE(phone, $3)
         WHERE id = $4 RETURNING *`,
        [name, email, phone, user.id]
      );
      user = updated.rows[0];
    }

    const token = signToken(user.id);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to sign in" });
  }
});

export default router;
