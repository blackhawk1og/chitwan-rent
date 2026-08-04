import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text, params) => pool.query(text, params);

// Nothing in this app has needed a multi-statement transaction before this
// (every other route is a single query, or independent queries where a
// partial failure is acceptable) — added specifically for the internal
// dashboard's delete-user action (routes/dashboard.js), which deletes across
// several tables that reference users.id with no ON DELETE CASCADE at the DB
// level (see that route's comment for the full list) and must not leave the
// data half-deleted if one statement fails partway through.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
