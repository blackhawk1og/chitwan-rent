// One-off, non-destructive migration for the superheroes leaderboard /
// to-let pin display name. Replaces showing users.name (the real name
// collected once at login, see AuthGateModal.jsx) on the leaderboard and
// to-let pin popups with a separate, self-chosen, optional nickname —
// persistent per user, not per-submission (see routes/toletSpots.js and
// routes/superheroes.js for where it's read/written).
import { pool } from "../src/db.js";

const SQL = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS hero_nickname TEXT;
`;

async function main() {
  await pool.query(SQL);
  console.log("users.hero_nickname is up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
