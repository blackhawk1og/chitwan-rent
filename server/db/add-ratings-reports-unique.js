// One-off, non-destructive migration — gives flat_ratings and flat_reports
// the per-user uniqueness that tolet_spot_reports has had from the start
// (see add-tolet-spot-reports.js's UNIQUE(tolet_spot_id, user_id)). Without
// it, one account can rate the same flat unlimited times (each insert drags
// flats.rating's average further) or report it unlimited times (each insert
// bumps flats.report_count, and three is enough to pull a listing off the
// public map and email its owner that it was removed). The constraint is
// what makes a repeat submission a no-op/update rather than a second row —
// routes/flats.js's ON CONFLICT clauses infer from the indexes created here.
//
// Statement order below is load-bearing: dedupe -> NOT NULL -> unique index
// -> recompute. Every step is a no-op against a table that's already clean.
import { pool } from "../src/db.js";

const SQL = `
-- 1. Collapse any pre-existing duplicates, or the unique indexes below
--    cannot be created at all. Ratings keep the NEWEST row (a re-rate is the
--    user's latest opinion, which is also what the route's new ON CONFLICT
--    DO UPDATE does from here on); reports keep the OLDEST (the original
--    report is the real one — the duplicates are exactly the abuse being
--    closed off). Tie-broken on id so the result is deterministic rather
--    than dependent on two rows sharing a created_at.
DELETE FROM flat_ratings a USING flat_ratings b
 WHERE a.flat_id = b.flat_id AND a.user_id = b.user_id
   AND (b.created_at, b.id) > (a.created_at, a.id);

DELETE FROM flat_reports a USING flat_reports b
 WHERE a.flat_id = b.flat_id AND a.user_id = b.user_id
   AND (b.created_at, b.id) < (a.created_at, a.id);

-- 2. A unique index treats NULLs as distinct, so rows with a NULL user_id
--    would slip past it unlimited times and ON CONFLICT DO UPDATE would keep
--    inserting new rows instead of updating. Nothing can produce such a row
--    today (both INSERT sites sit behind requireAuth, and db/seed.js never
--    touches either table), so this just makes that guarantee structural
--    instead of a property of the current call sites.
--
--    Deliberately NOT preceded by a DELETE of NULL-user rows: if one somehow
--    exists, failing loudly here is far better than silently deleting
--    someone's data. SET NOT NULL is itself re-runnable (no-op when already
--    set), unlike ADD CONSTRAINT.
ALTER TABLE flat_ratings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE flat_reports ALTER COLUMN user_id SET NOT NULL;

-- 3. CREATE UNIQUE INDEX IF NOT EXISTS, not ALTER TABLE ADD CONSTRAINT:
--    ADD CONSTRAINT has no IF NOT EXISTS form and raises 42710
--    (duplicate_object) on a second run, which would break the re-runnability
--    every other migration here has and abort a whole migrate-all.js run.
--    ON CONFLICT (flat_id, user_id) infers from a plain unique index exactly
--    as it would from a table constraint.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_flat_ratings_flat_user ON flat_ratings(flat_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_flat_reports_flat_user ON flat_reports(flat_id, user_id);

-- 4. Re-derive the materialized counters from whatever survived step 1, so a
--    flat whose duplicates were just collapsed doesn't keep an average or a
--    report_count that counted them.
--
--    Both are JOIN-form updates, touching only flats that actually have rows
--    in the source table. The obvious correlated-subquery form
--    (SET rating = (SELECT AVG(...) WHERE flat_id = flats.id)) would write
--    NULL into every flat with no ratings — which is every seeded listing,
--    whose fixed placeholder rating is set once at seed time and is meant to
--    never change (see schema.sql's note on flats.rating). is_seed = false
--    keeps those rows out of reach for the same reason.
UPDATE flats f SET rating = r.avg
  FROM (SELECT flat_id, AVG((locality_stars + built_quality_stars) / 2.0) AS avg
          FROM flat_ratings
         WHERE locality_stars IS NOT NULL AND built_quality_stars IS NOT NULL
         GROUP BY flat_id) r
 WHERE f.id = r.flat_id AND f.is_seed = false;

UPDATE flats f SET report_count = r.n
  FROM (SELECT flat_id, COUNT(*)::int AS n FROM flat_reports GROUP BY flat_id) r
 WHERE f.id = r.flat_id;
`;

async function main() {
  await pool.query(SQL);
  console.log("flat_ratings/flat_reports per-user uniqueness is up to date.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
