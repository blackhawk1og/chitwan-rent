// Runs a full fresh-database setup in one command: db:schema (schema.sql —
// destructive, drops and recreates every core table) followed by every
// add-*.js migration in this directory, in the exact order they need to
// run. Replaces doing this by hand, one `node db/add-*.js` at a time, per
// README.md's setup instructions.
//
// MIGRATIONS below is NOT alphabetical and NOT guessed — it's the order
// these files were actually added, verified against this repo's real commit
// history (`git log --reverse --diff-filter=A -- server/db/`), not assumed
// from filenames. Where two migrations were added in the very same commit,
// neither has an actual SQL dependency on the other (every migration here is
// an independent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` or `CREATE TABLE
// IF NOT EXISTS`, never an FK/CHECK constraint crossing between two
// same-commit files) — their relative order is preserved from git's own
// same-commit file listing, except for the interests pair at the very end,
// where this session has direct first-hand knowledge of the true authoring
// order within a later-squashed commit (preferences was written first, the
// parking-count follow-up came after) that git's commit-level granularity
// can't otherwise distinguish.
//
// Deliberately stops here — does NOT also run db:seed. Seeding real/dummy
// data is a separate, explicit choice (see package.json's own db:seed
// script), not something a schema-migration runner should do silently.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = join(__dirname, "..");

const MIGRATIONS = [
  "add-flat-social-tables.js",
  "add-rent-reports-table.js",
  "add-poi-tier-column.js",
  "add-flat-listing-details.js",
  "add-places-table.js",
  "add-flats-is-seed.js",
  "add-flats-society-name.js",
  "add-flat-reports-table.js",
  "add-flat-verification.js",
  "add-flat-ratings-dimensions.js",
  "add-listing-attempts-table.js",
  "add-delete-attempts-table.js",
  "add-flat-delete-code.js",
  "add-flats-description.js",
  "add-flatmate-matching.js",
  "add-digest-unsubscribe.js",
  "add-next-digest-at.js",
  "add-hero-nickname.js",
  "add-users-is-seed.js",
  "add-seeker-pins-archived-at.js",
  "add-rent-reports-furnishing-parking.js",
  "add-flats-rent-flagged.js",
  "add-dashboard-tables.js",
  "add-flats-report-removal-email-sent-at.js",
  "add-flat-interests-preferences.js",
  "add-flat-interests-parking-count.js",
  "add-tolet-spot-reports.js",
];

// Each script (run-schema.js and every migration) is already fully
// self-contained — its own DB connection, its own console output, its own
// process.exit(1) on failure — so this just runs each one as its own
// process in order, exactly as if a person had typed each command by hand,
// rather than importing/refactoring 26 independent scripts into one shared
// module.
function run(scriptPath, label) {
  console.log(`\n--- ${label} ---`);
  execFileSync(process.execPath, [scriptPath], { cwd: serverDir, stdio: "inherit" });
}

function main() {
  try {
    run(join(serverDir, "db", "run-schema.js"), "db:schema (schema.sql)");
    for (const file of MIGRATIONS) {
      run(join(serverDir, "db", file), file);
    }
  } catch (err) {
    // The failing script's own error already printed above (stdio:
    // "inherit") — this just makes clear the whole run stopped, rather than
    // continuing past a broken step.
    console.error(`\nMigration run stopped early — see the failure above. (${err.message})`);
    process.exit(1);
  }

  console.log(
    `\nSchema + all ${MIGRATIONS.length} migrations applied. Run \`npm run db:seed\` next if you want dummy data.`
  );
}

main();
