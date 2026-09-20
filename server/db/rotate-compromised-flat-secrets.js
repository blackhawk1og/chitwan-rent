// One-off remediation for the audit's CRITICAL finding: the public
// GET /api/flats (and /api/flats/:id) returned every listing's
// unsubscribe_token and delete_code_hash with `f.*`, so both of the
// "secret-gated" owner flows were effectively unprotected for any listing
// that had ever been fetched:
//   - unsubscribe_token is the whole credential for GET /unsubscribe, which
//     hard-deletes the listing
//   - delete_code_hash was an unsalted sha256 over a 10-digit code, i.e. a
//     10^10 keyspace that falls to an offline sweep in seconds — after which
//     /flatstatus accepts the recovered code on the first try, so the
//     flat_delete_attempts limiter never sees a failed guess
// routes/flats.js no longer exposes either column, but anything already
// scraped stays valid until the underlying secrets change. This script
// retires them: a fresh unsubscribe_token and a fresh 10-digit delete code
// (hashed under the new keyed HMAC — see lib/deleteCode.js) for every flat
// that currently holds either, then emails each owner their NEW code using
// the existing sendDeleteCodeEmail template.
//
// Deliberately NOT changed: email_verified_at (so the 24h eligibility window
// is not reset or extended), status, and the delete/mark-rented/unsubscribe
// route logic itself. Only the secrets rotate.
//
// The plaintext code is never logged, printed, or returned — it exists just
// long enough to be hashed and handed to the mailer, exactly as at
// verification time. Owner emails are masked in the output.
//
// Note: rotating unsubscribe_token invalidates the unsubscribe link in any
// digest email already sitting in an owner's inbox. Those links will render
// "Link invalid or already used" until the next weekly digest carries the new
// token. That is the intended trade — an old link is a live delete button for
// anyone who scraped its token.
//
// Usage:
//   node db/rotate-compromised-flat-secrets.js --dry-run   # report only, no writes/emails
//   node db/rotate-compromised-flat-secrets.js             # rotate + email
import crypto from "node:crypto";
import { pool } from "../src/db.js";
import {
  generateDeleteCode,
  hashDeleteCode,
  deleteCodeHashMatches,
  assertDeleteCodeSecret,
} from "../src/lib/deleteCode.js";
import { generateUnsubscribeToken } from "../src/lib/verification.js";
import { sendDeleteCodeEmail } from "../src/lib/email.js";

function maskEmail(email) {
  if (!email) return "(no owner email on file)";
  const [user, domain] = String(email).split("@");
  if (!domain) return "(malformed)";
  const shown = user.slice(0, 1);
  return `${shown}${"*".repeat(Math.max(user.length - 1, 1))}@${domain}`;
}

// Flats holding either secret. A flat with only one of the two (e.g. an older
// row that predates the unsubscribe migration) still gets both reissued, so
// the end state is uniform.
const SELECT_AFFECTED = `
  SELECT f.id, f.status, f.email_verified_at, u.email AS owner_email
  FROM flats f
  LEFT JOIN users u ON u.id = f.owner_id
  WHERE f.delete_code_hash IS NOT NULL OR f.unsubscribe_token IS NOT NULL
  ORDER BY f.id
`;

// sendEmail is injectable so the local test harness can capture the generated
// code and exercise a real verification against it without sending mail.
export async function rotateCompromisedFlatSecrets({ dryRun = false, sendEmail = sendDeleteCodeEmail } = {}) {
  assertDeleteCodeSecret();

  const { rows: affected } = await pool.query(SELECT_AFFECTED);
  const results = [];

  for (const flat of affected) {
    if (dryRun) {
      results.push({ flatId: flat.id, rotated: false, emailed: false, ownerEmail: flat.owner_email, dryRun: true });
      continue;
    }

    const code = generateDeleteCode();
    const codeHash = hashDeleteCode(code);
    const unsubscribeToken = generateUnsubscribeToken();

    const { rows } = await pool.query(
      `UPDATE flats SET delete_code_hash = $1, unsubscribe_token = $2
       WHERE id = $3
       RETURNING id, delete_code_hash, unsubscribe_token`,
      [codeHash, unsubscribeToken, flat.id]
    );
    const stored = rows[0];

    // Prove, against the value actually persisted, that (a) the new code
    // verifies through the same timing-safe comparison the live route uses,
    // and (b) the stored digest is NOT the legacy unsalted sha256 of the code
    // — i.e. this row really did move to the keyed scheme.
    const verifies = deleteCodeHashMatches(hashDeleteCode(code), stored.delete_code_hash);
    const legacySha256 = crypto.createHash("sha256").update(code).digest("hex");
    const isLegacyScheme = stored.delete_code_hash === legacySha256;
    if (!verifies || isLegacyScheme) {
      throw new Error(
        `Flat ${flat.id}: rotated hash failed self-check (verifies=${verifies}, legacyScheme=${isLegacyScheme}) — aborting before any further rows are touched.`
      );
    }

    let emailed = false;
    let emailError = null;
    if (flat.owner_email) {
      try {
        await sendEmail({ to: flat.owner_email, flatId: flat.id, code });
        emailed = true;
      } catch (err) {
        emailError = err.message;
      }
    }

    results.push({
      flatId: flat.id,
      rotated: true,
      emailed,
      emailError,
      ownerEmail: flat.owner_email,
      tokenChanged: stored.unsubscribe_token === unsubscribeToken,
    });
  }

  return results;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const results = await rotateCompromisedFlatSecrets({ dryRun });

  console.log(dryRun ? "DRY RUN — no rows written, no emails sent." : "Rotation complete.");
  console.log(`Flats holding a delete code and/or unsubscribe token: ${results.length}`);
  for (const r of results) {
    const who = maskEmail(r.ownerEmail);
    if (r.dryRun) console.log(`  flat ${r.flatId}: would rotate both secrets, would email ${who}`);
    else if (r.emailed) console.log(`  flat ${r.flatId}: rotated, new code emailed to ${who}`);
    else if (!r.ownerEmail) console.log(`  flat ${r.flatId}: rotated, NO EMAIL SENT — no owner email on file`);
    else console.log(`  flat ${r.flatId}: rotated, EMAIL FAILED to ${who} — ${r.emailError}`);
  }

  // Informational only: seeker pins were exposed by the same class of bug
  // (SELECT * on three public routes). None are rotated here — this pass is
  // scoped to the flats called out in the remediation brief.
  const pins = await pool.query("SELECT COUNT(*)::int AS c FROM seeker_pins WHERE unsubscribe_token IS NOT NULL");
  console.log(`\nFor reference: ${pins.rows[0].c} seeker pin(s) currently hold an unsubscribe_token (not rotated by this script).`);

  const failures = results.filter((r) => r.rotated && r.ownerEmail && !r.emailed);
  await pool.end();
  if (failures.length > 0) {
    console.error(`\n${failures.length} owner(s) did not receive their new code. Re-run to reissue for every flat.`);
    process.exit(1);
  }
}

// Only runs the CLI when invoked directly, so the test harness can import
// rotateCompromisedFlatSecrets without triggering a real run.
if (process.argv[1] && process.argv[1].endsWith("rotate-compromised-flat-secrets.js")) {
  main().catch((err) => {
    console.error("Rotation failed:", err.message);
    process.exit(1);
  });
}
