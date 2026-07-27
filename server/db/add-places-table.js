// One-off, non-destructive migration for the places gazetteer (search bar
// typeahead) — adds the table only, safe to run against a dev DB that
// already has other seeded data.
import { pool } from "../src/db.js";

const SQL = `
CREATE TABLE IF NOT EXISTS places (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  place_type TEXT, -- 'village'|'town'|'suburb'|'neighbourhood'|'hamlet'
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS idx_places_name ON places(name);
`;

async function main() {
  await pool.query(SQL);
  console.log("places table is up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
