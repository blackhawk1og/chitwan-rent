// Dev-only manual trigger for the weekly match-digest job (src/lib/digestJob.js)
// — runs one pass of the exact same runDigestJob() the hourly setInterval in
// startDigestJob() calls, for local testing without waiting on the interval
// or restarting the server. Does not import/duplicate any of digestJob.js's
// query or matching logic — it only calls the function it already exports.
//
// Does not touch next_digest_at itself beyond what runDigestJob() already
// does on its own (advancing it 7 days for whatever it finds due this run) —
// there's no separate reset/bypass here. To re-test a specific row without
// waiting out its real schedule, set its next_digest_at back manually via SQL
// yourself; this script doesn't do that for you.
import { pool } from "../src/db.js";
import { runDigestJob } from "../src/lib/digestJob.js";

async function main() {
  console.log("Running one manual digest pass...\n");

  const result = await runDigestJob();

  // Every row runDigestJob() finds due is processed to exactly one of two
  // outcomes (sent or skipped-no-matches) — see digestJob.js's own per-row
  // console.log lines above, printed during the call above this summary.
  // Both counts are read directly from its return value, not recomputed.
  const dueFlats = result.flatDigestsSent + result.flatDigestsSkipped;
  const dueSeekers = result.seekerDigestsSent + result.seekerDigestsSkipped;
  const totalSent = result.flatDigestsSent + result.seekerDigestsSent;

  console.log("\n--- Manual digest run summary ---");
  console.log(`Flats due this run:        ${dueFlats}  (${result.flatDigestsSent} sent, ${result.flatDigestsSkipped} skipped — no current matches)`);
  console.log(`Seeker pins due this run:  ${dueSeekers}  (${result.seekerDigestsSent} sent, ${result.seekerDigestsSkipped} skipped — no current matches)`);
  console.log(`Total digest emails sent:  ${totalSent}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Manual digest run failed:", err.message);
  process.exit(1);
});
