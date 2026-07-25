// One-off, non-destructive migration adding the `tier` column to `pois` —
// safe to run against a dev DB that already has seeded data (unlike
// run-schema.js, which drops everything).
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE pois ADD COLUMN IF NOT EXISTS tier TEXT;
`;

async function main() {
  await pool.query(SQL);
  console.log("pois.tier column is up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
