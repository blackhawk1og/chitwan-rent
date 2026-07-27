// One-off, non-destructive regeneration: fetches every real village/town/
// suburb/neighbourhood/hamlet OSM has tagged in the Chitwan district and
// replaces the `places` table's contents with it — safe to run against a
// dev DB that already has other seeded data (only touches this one table).
// Run with: npm run seed:places
import { pool } from "../src/db.js";
import { fetchPlaces } from "./placesData.js";

async function main() {
  console.log("Fetching villages/towns/suburbs/neighbourhoods/hamlets from Overpass for the Chitwan district bbox...");
  const places = await fetchPlaces();
  console.log(`Fetched ${places.length} places from OpenStreetMap.`);

  await pool.query("DELETE FROM places");

  for (const p of places) {
    await pool.query(`INSERT INTO places (name, place_type, lat, lng) VALUES ($1,$2,$3,$4)`, [
      p.name,
      p.placeType,
      p.lat,
      p.lng,
    ]);
  }

  console.log(`Seeded ${places.length} real places.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Places seeding failed:", err.message);
  process.exit(1);
});
