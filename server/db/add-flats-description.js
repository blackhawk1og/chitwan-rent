// One-off, non-destructive migration — adds the free-text structural
// description column (e.g. "2 bedroom + 1 kitchen") shown on the flat
// detail panel, distinct from one_liner (a tenant-quote-style blurb about
// the experience of living there). Matches the style of
// add-flats-society-name.js.
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE flats ADD COLUMN IF NOT EXISTS description TEXT;
`;

async function main() {
  await pool.query(SQL);
  console.log("flats table's description column is up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
