// One-off cleanup: removes already-seeded POI rows whose name matches the
// noisy-shop-category keyword list (decor shops, photo studios, mobile
// phone stores, vehicle showrooms/workshops, furniture stores, generic
// "plaza" listings, etc. — see EXCLUDED_POI_NAME_KEYWORDS in poisData.js).
// fetchGeneralPois() now filters these out going forward, so this only
// needs to run once against a DB seeded before that filter existed. Run
// with: node db/remove-noisy-shop-pois.js
import { pool } from "../src/db.js";
import { isExcludedPoiName } from "./poisData.js";

async function main() {
  const { rows } = await pool.query("SELECT id, name FROM pois WHERE category = $1", ["shop"]);
  const idsToRemove = rows.filter((r) => isExcludedPoiName(r.name)).map((r) => r.id);

  if (idsToRemove.length === 0) {
    console.log("No matching noisy shop POIs found.");
    await pool.end();
    return;
  }

  await pool.query("DELETE FROM pois WHERE id = ANY($1)", [idsToRemove]);
  console.log(`Removed ${idsToRemove.length} noisy shop POI rows out of ${rows.length} shop rows checked.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Cleanup failed:", err.message);
  process.exit(1);
});
