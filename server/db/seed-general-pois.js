// One-off, non-destructive regeneration: replaces general-purpose POI rows
// (restaurants, cafes, hospitals, pharmacies, banks/ATMs, fuel, gyms,
// temples, hotels, shops) in `pois` with real OSM data fetched from
// Overpass — safe to run against a dev DB that already has other seeded
// data, since it only touches rows in these categories (school/college and
// the dummy landmark entries are left untouched). Run with:
// npm run seed:general-pois
import { pool } from "../src/db.js";
import { fetchGeneralPois } from "./poisData.js";

const GENERAL_POI_CATEGORIES = [
  "restaurant", "cafe", "hospital", "clinic", "pharmacy", "bank", "atm", "fuel", "gym", "temple", "hotel", "shop",
];

async function main() {
  console.log("Fetching general POIs (restaurants, cafes, hospitals, shops, etc.) from Overpass for the Chitwan district bbox...");
  const pois = await fetchGeneralPois();
  console.log(`Fetched ${pois.length} general POIs from OpenStreetMap.`);

  await pool.query("DELETE FROM pois WHERE category = ANY($1)", [GENERAL_POI_CATEGORIES]);

  for (const p of pois) {
    await pool.query(`INSERT INTO pois (name, category, lat, lng) VALUES ($1,$2,$3,$4)`, [
      p.name,
      p.category,
      p.lat,
      p.lng,
    ]);
  }

  console.log(`Seeded ${pois.length} general POIs (replacing any previous data in these categories).`);
  await pool.end();
}

main().catch((err) => {
  console.error("General POI seeding failed:", err.message);
  process.exit(1);
});
