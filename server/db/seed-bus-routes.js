// One-off, non-destructive regeneration: re-fetches road-snapped geometry
// for all bus routes from OSRM and replaces the bus_routes table's contents
// — safe to run against a dev DB that already has other seeded data, since
// it only truncates this one table (nothing else references bus_routes).
// Run with: npm run seed:bus-routes
import { pool } from "../src/db.js";
import { BUS_ROUTES, fetchRoadSnappedGeometry } from "./busRoutesData.js";

async function main() {
  await pool.query("TRUNCATE bus_routes RESTART IDENTITY");

  for (const r of BUS_ROUTES) {
    console.log(`Fetching road-snapped geometry for "${r.name}"...`);
    const geometry = await fetchRoadSnappedGeometry(r.waypoints);
    await pool.query(
      `INSERT INTO bus_routes (name, color, geojson) VALUES ($1,$2,$3)`,
      [
        r.name,
        r.color,
        JSON.stringify({
          type: "Feature",
          properties: { name: r.name, color: r.color },
          geometry,
        }),
      ]
    );
    // Be polite to the shared public OSRM demo server.
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`Regenerated ${BUS_ROUTES.length} bus routes with road-snapped geometry.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Bus route regeneration failed:", err.message);
  process.exit(1);
});
