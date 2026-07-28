// One-off, non-destructive migration — adds the society_name column only,
// safe to run against a dev DB that already has flats in it.
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE flats ADD COLUMN IF NOT EXISTS society_name TEXT;
`;

async function main() {
  await pool.query(SQL);
  console.log("flats.society_name is up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
