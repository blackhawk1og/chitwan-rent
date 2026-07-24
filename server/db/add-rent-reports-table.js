// One-off, non-destructive migration for the empty-map "What rent are you
// paying?" anonymous quick action — safe to run against a dev DB that
// already has seeded data (unlike run-schema.js, which drops everything).
import { pool } from "../src/db.js";

const SQL = `
CREATE TABLE IF NOT EXISTS rent_reports (
  id SERIAL PRIMARY KEY,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  rent INT,
  bhk INT,
  gated TEXT CHECK (gated IN ('gated','not_gated')),
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rent_reports_lat_lng ON rent_reports(lat, lng);
`;

async function main() {
  await pool.query(SQL);
  console.log("rent_reports table is up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
