// One-off, non-destructive migration for the flat detail panel's rating /
// comments / interest features. Unlike run-schema.js (which drops and
// recreates every table), this only adds the three new tables — safe to run
// against a dev DB that already has seeded data.
import { pool } from "../src/db.js";

const SQL = `
CREATE TABLE IF NOT EXISTS flat_ratings (
  id SERIAL PRIMARY KEY,
  flat_id INT REFERENCES flats(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  stars INT CHECK (stars BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flat_ratings_flat_id ON flat_ratings(flat_id);

CREATE TABLE IF NOT EXISTS flat_comments (
  id SERIAL PRIMARY KEY,
  flat_id INT REFERENCES flats(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  name TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flat_comments_flat_id ON flat_comments(flat_id);

CREATE TABLE IF NOT EXISTS flat_interests (
  id SERIAL PRIMARY KEY,
  flat_id INT REFERENCES flats(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  name TEXT,
  contact TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flat_interests_flat_id ON flat_interests(flat_id);
`;

async function main() {
  await pool.query(SQL);
  console.log("flat_ratings, flat_comments, flat_interests are up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
