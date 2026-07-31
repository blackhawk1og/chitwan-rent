import { Router } from "express";
import { verifyListingByToken } from "../lib/verification.js";
import { sendDeleteCodeEmail } from "../lib/email.js";

// Mounted directly at /verify-listing (not under /api — see index.js) since
// this is the literal link a user clicks from their email, not a JSON
// resource a client app calls. Returns a small standalone HTML page rather
// than JSON so the link works on its own with no client-side route needed.
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

const FAILURE_COPY = {
  invalid: {
    title: "Link invalid or already used",
    message:
      "This verification link isn't valid anymore — it may have already been used, or the listing it belonged to no longer exists.",
  },
  expired: {
    title: "Link expired",
    message: "This verification link expired 24 hours after the listing was created. Please list your flat again to get a new one.",
  },
};

// GET /verify-listing?token=<token>
router.get("/", async (req, res) => {
  const { token } = req.query;

  try {
    const result = await verifyListingByToken(typeof token === "string" ? token : null);

    if (result.ok) {
      console.log(`Listing verified: flat ${result.flatId}`);

      if (result.email) {
        try {
          await sendDeleteCodeEmail({ to: result.email, flatId: result.flatId, code: result.deleteCode });
          console.log(`Delete code generated & emailed: flat ${result.flatId}`);
        } catch (emailErr) {
          // Same contract as the verification email itself — the listing is
          // already live either way, so a failed send here never turns this
          // response into a failure page.
          console.error(`Delete code email failed: flat ${result.flatId}`, emailErr.message);
        }
      }

      return res.send(
        renderPage("Listing verified!", "Your flat is now live on the map. Thanks for confirming it's really you.", true)
      );
    }

    const copy = FAILURE_COPY[result.reason] ?? FAILURE_COPY.invalid;
    return res.send(renderPage(copy.title, copy.message, false));
  } catch (err) {
    console.error("Listing verification failed:", err);
    return res.send(renderPage("Something went wrong", "We couldn't verify this link right now — please try again in a moment.", false));
  }
});

export default router;
