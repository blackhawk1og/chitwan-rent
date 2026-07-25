// One-off, non-destructive regeneration: replaces the dummy school/college
// rows in `pois` with real OSM data fetched from Overpass — safe to run
// against a dev DB that already has other seeded data, since it only
// touches rows where category IN ('school','college') (hospital/temple/
// landmark dummy rows are left untouched). Run with: npm run seed:pois
import { pool } from "../src/db.js";
import { fetchSchoolsAndColleges } from "./poisData.js";

async function main() {
  console.log("Fetching schools/colleges from Overpass for the Chitwan district bbox...");
  const pois = await fetchSchoolsAndColleges();
  console.log(`Fetched ${pois.length} schools/colleges from OpenStreetMap.`);

  await pool.query("DELETE FROM pois WHERE category IN ('school','college')");

  for (const p of pois) {
    await pool.query(`INSERT INTO pois (name, category, lat, lng, tier) VALUES ($1,$2,$3,$4,'important')`, [
      p.name,
      p.category,
      p.lat,
      p.lng,
    ]);
  }

  console.log(`Seeded ${pois.length} real schools/colleges (replacing dummy data).`);
  await pool.end();
}

main().catch((err) => {
  console.error("POI seeding failed:", err.message);
  process.exit(1);
});
