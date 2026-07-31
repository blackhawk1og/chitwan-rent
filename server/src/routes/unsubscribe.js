import { Router } from "express";
import { query } from "../db.js";

// Mounted directly at /unsubscribe (not under /api — see index.js), same
// reasoning as routes/verifyListing.js: this is the literal link clicked
// from a digest email (lib/email.js), not a JSON resource the SPA calls, so
// it renders its own standalone HTML page instead of returning JSON.
const router = Router();

function renderPage(title, message, isSuccess) {
  const accent = isSuccess ? "#22c55e" : "#ef4444";
  const symbol = isSuccess ? "&#10003;" : "&#10005;";
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title} — Chitwan Rent</title>
  </head>
  <body style="margin:0;padding:48px 20px;background:#0b0c17;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#f5f5f7;">
    <div style="max-width:420px;margin:0 auto;text-align:center;">
      <div style="width:56px;height:56px;margin:0 auto 20px;border-radius:9999px;background:${accent}33;color:${accent};font-size:26px;line-height:56px;">
        ${symbol}
      </div>
      <h1 style="font-size:20px;margin:0 0 10px;">${title}</h1>
      <p style="font-size:14px;color:#9ca3af;line-height:1.6;margin:0;">${message}</p>
    </div>
  </body>
</html>`;
}

// GET /unsubscribe?token=<token> — public, no auth. The token itself is the
// authorization (256-bit random, only ever reaches the real owner via their
// own digest email — same trust model as /verify-listing's token). Tries
// flats first, then seeker_pins, since a token only ever belongs to one row
// in one of the two tables.
//
// Hard-deletes the row, same pattern as POST /api/flats/:id/delete and the
// expired-listing cleanup sweep: flat_ratings/flat_comments/flat_reports/
// flat_interests/matches all FK to flats.id with ON DELETE CASCADE already
// (see schema.sql, db/add-flatmate-matching.js), and matches also FKs to
// seeker_pins.id the same way — no manual dependent-row cleanup needed
// either direction.
//
// Deliberately does NOT touch listing_attempts (see lib/listingRateLimit.js)
// in any way — unsubscribing removes the listing/pin, not the 24h
// rate-limit record tied to that email, so it can't be used to reset or
// bypass the rate limit and immediately re-list.
router.get("/", async (req, res) => {
  const { token } = req.query;
  if (typeof token !== "string" || !token) {
    return res.send(renderPage("Link invalid", "This unsubscribe link is missing its token.", false));
  }

  try {
    const flatResult = await query("DELETE FROM flats WHERE unsubscribe_token = $1 RETURNING id", [token]);
    if (flatResult.rows.length > 0) {
      console.log(`Unsubscribed via link: flat ${flatResult.rows[0].id}`);
      return res.send(
        renderPage(
          "You're unsubscribed",
          "Your flat listing has been removed from Chitwan Rent, and no further contact-sharing emails will be sent for it.",
          true
        )
      );
    }

    const seekerResult = await query(
      "DELETE FROM seeker_pins WHERE unsubscribe_token = $1 RETURNING id",
      [token]
    );
    if (seekerResult.rows.length > 0) {
      console.log(`Unsubscribed via link: seeker pin ${seekerResult.rows[0].id}`);
      return res.send(
        renderPage(
          "You're unsubscribed",
          "Your seeker pin has been removed from Chitwan Rent, and no further contact-sharing emails will be sent for it.",
          true
        )
      );
    }

    return res.send(
      renderPage(
        "Link invalid or already used",
        "This unsubscribe link isn't valid anymore — the listing or pin it belonged to may already be gone.",
        false
      )
    );
  } catch (err) {
    console.error("Unsubscribe failed:", err);
    return res.send(renderPage("Something went wrong", "We couldn't process this right now — please try again in a moment.", false));
  }
});

export default router;
