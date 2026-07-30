// One-off, non-destructive migration — splits flat_ratings' single `stars`
// value into two dimensions (locality, built quality), averaged together
// into flats.rating (see POST /:id/rating in routes/flats.js). The old
// `stars` column is left in place rather than dropped (this migration style
// is additive-only) but is no longer written to; the rating aggregate query
// only reads rows that have both new columns populated, so old single-value
// rows simply stop contributing rather than skewing the average.
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE flat_ratings ADD COLUMN IF NOT EXISTS locality_stars INT CHECK (locality_stars BETWEEN 1 AND 5);
ALTER TABLE flat_ratings ADD COLUMN IF NOT EXISTS built_quality_stars INT CHECK (built_quality_stars BETWEEN 1 AND 5);
`;

async function main() {
  await pool.query(SQL);
  console.log("flat_ratings table's locality/built_quality columns are up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
