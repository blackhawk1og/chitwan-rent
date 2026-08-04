// One-off, non-destructive migration for the internal-only /internal/dashboard
// feature (see routes/dashboard.js). Two tables, matching this codebase's
// existing "persistent append-only log" pattern (listing_attempts,
// flat_delete_attempts) rather than in-memory counters — so both survive a
// dev-server restart (`node --watch`) and, for dashboard_login_attempts,
// so a lockout can't be reset just by restarting the process.
//
// 1. dashboard_login_attempts — brute-force protection for the dashboard's
//    single shared password (src/lib/dashboardAuth.js), keyed by requester IP
//    since there's no per-user identity to key on (this is one password for
//    the whole dashboard, not per-admin accounts). Only failed attempts are
//    recorded, same convention as flat_delete_attempts.
//
// 2. digest_runs — did not exist before this feature; the digest job
//    (src/lib/digestJob.js) previously only console.log'd its result, with
//    no queryable "when did this last actually run" anywhere. One row is
//    appended per run (see runDigestJob's closing insert) rather than a
//    single mutable row, so the dashboard's "Digest job health" section can
//    show the true last-run timestamp via `ORDER BY run_at DESC LIMIT 1`
//    without needing an UPSERT.
import { pool } from "../src/db.js";

const SQL = `
CREATE TABLE IF NOT EXISTS dashboard_login_attempts (
  id SERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dashboard_login_attempts_ip_created_at ON dashboard_login_attempts(ip, created_at);

CREATE TABLE IF NOT EXISTS digest_runs (
  id SERIAL PRIMARY KEY,
  run_at TIMESTAMP DEFAULT now(),
  summary JSONB
);
CREATE INDEX IF NOT EXISTS idx_digest_runs_run_at ON digest_runs(run_at);
`;

async function main() {
  await pool.query(SQL);
  console.log("dashboard_login_attempts and digest_runs are up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
