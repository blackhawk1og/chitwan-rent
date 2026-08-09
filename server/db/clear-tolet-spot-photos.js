// One-off cleanup: run once, before the base64-in-Postgres -> Cloudinary
// storage migration (see routes/toletSpots.js's new POST /upload-photo and
// SpotToLetModal.jsx's updated submit flow). Every existing tolet_spots row
// still has its photo as a base64 data URL crammed into photo_url; those are
// cleared out here rather than migrated, so nothing pre-dating this change
// is left holding the old, no-longer-supported format. Only the photo_url
// column is touched — id, spotter_id, name, message, lat, lng, created_at,
// report_count, status all stay exactly as they were, and no row is
// deleted. Run with: node db/clear-tolet-spot-photos.js
import { pool } from "../src/db.js";

async function main() {
  const result = await pool.query("UPDATE tolet_spots SET photo_url = NULL WHERE photo_url IS NOT NULL");
  console.log(`Cleared photo_url on ${result.rowCount} tolet_spots row(s).`);
  await pool.end();
}

main().catch((err) => {
  console.error("Cleanup failed:", err.message);
  process.exit(1);
});
