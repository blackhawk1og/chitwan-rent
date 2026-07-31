// One-off, non-destructive migration for the delete-flat feature — adds the
// column that stores a hash of each listing's 10-digit delete code (never
// the plaintext code itself). Matches the style of add-flat-verification.js.
//
// Nullable: seed/dummy listings and any listing that hasn't been verified
// yet have no code at all (see lib/verification.js, which is where this
// column gets populated — generation is hooked to verification succeeding,
// not to listing creation).
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE flats ADD COLUMN IF NOT EXISTS delete_code_hash TEXT;
`;

async function main() {
  await pool.query(SQL);
  console.log("flats table's delete_code_hash column is up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
