import { Router } from "express";
import { query } from "../db.js";
import { isNearAnyRoute } from "../lib/geo.js";

const router = Router();

const SELECT_WITH_OWNER = `
  SELECT f.*, u.name AS owner_name, u.phone AS owner_phone, u.email AS owner_email
  FROM flats f
  LEFT JOIN users u ON u.id = f.owner_id
`;

// GET /api/flats?status=available&bhk=1,2,5&rent_min=&rent_max=&area=&furnishing=&gated=&posted_within=30&near_bus_route=true
router.get("/", async (req, res) => {
  const {
    status, bhk, rent_min, rent_max, area, furnishing, gated, posted_within, near_bus_route,
  } = req.query;

  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`f.status = $${params.length}`);
  }

  if (bhk) {
    const values = bhk.split(",").map(Number).filter((n) => !Number.isNaN(n));
    const exact = values.filter((n) => n < 5);
    const hasFivePlus = values.includes(5);
    const bhkConditions = [];
    if (exact.length) {
      params.push(exact);
      bhkConditions.push(`f.bhk = ANY($${params.length})`);
    }
    if (hasFivePlus) bhkConditions.push(`f.bhk >= 5`);
    if (bhkConditions.length) conditions.push(`(${bhkConditions.join(" OR ")})`);
  }

  if (rent_min) {
    params.push(Number(rent_min));
    conditions.push(`f.rent >= $${params.length}`);
  }
  if (rent_max) {
    params.push(Number(rent_max));
    conditions.push(`f.rent <= $${params.length}`);
  }

  if (area && area !== "all") {
    params.push(area);
    conditions.push(`f.area = $${params.length}`);
  }

  if (furnishing) {
    params.push(furnishing);
    conditions.push(`f.furnishing = $${params.length}`);
  }

  if (gated) {
    params.push(gated);
    conditions.push(`f.gated = $${params.length}`);
  }

  if (posted_within) {
    params.push(Number(posted_within));
    conditions.push(`f.posted_at >= now() - ($${params.length} || ' days')::interval`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await query(`${SELECT_WITH_OWNER} ${whereClause} ORDER BY f.posted_at DESC`, params);
    let rows = result.rows;

    if (near_bus_route === "true") {
      const routesResult = await query("SELECT geojson FROM bus_routes");
      rows = rows.filter((f) => isNearAnyRoute(f.lat, f.lng, routesResult.rows));
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch flats" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await query(`${SELECT_WITH_OWNER} WHERE f.id = $1`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Flat not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch flat" });
  }
});

router.post("/", async (req, res) => {
  const {
    owner_id, listing_type, bhk, rent, deposit, furnishing, includes_maintenance,
    gated, who_lives, pets_allowed, parking_for, sqft, one_liner, lat, lng, area, photos,
  } = req.body;

  try {
    const result = await query(
      `INSERT INTO flats
        (owner_id, listing_type, bhk, rent, deposit, furnishing, includes_maintenance,
         gated, who_lives, pets_allowed, parking_for, sqft, one_liner, status, lat, lng, area, photos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending_review',$14,$15,$16,$17)
       RETURNING *`,
      [
        owner_id ?? null, listing_type ?? "flat", bhk, rent, deposit ?? null, furnishing,
        includes_maintenance ?? false, gated, who_lives ?? null, pets_allowed ?? null,
        parking_for ?? 0, sqft ?? null, one_liner ?? null, lat, lng, area ?? null, photos ?? [],
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create flat" });
  }
});

export default router;
