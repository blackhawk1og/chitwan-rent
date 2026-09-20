import "dotenv/config";
import express from "express";
import cors from "cors";
import flatsRouter from "./routes/flats.js";
import seekerPinsRouter from "./routes/seekerPins.js";
import areasRouter from "./routes/areas.js";
import toletSpotsRouter from "./routes/toletSpots.js";
import statsRouter from "./routes/stats.js";
import superheroesRouter from "./routes/superheroes.js";
import busRoutesRouter from "./routes/busRoutes.js";
import poisRouter from "./routes/pois.js";
import placesRouter from "./routes/places.js";
import authRouter from "./routes/auth.js";
import rentReportsRouter from "./routes/rentReports.js";
import verifyListingRouter from "./routes/verifyListing.js";
import unsubscribeRouter from "./routes/unsubscribe.js";
import dashboardRouter from "./routes/dashboard.js";
import { startExpiredListingsCleanup } from "./lib/cleanupExpiredListings.js";
import { startDigestJob } from "./lib/digestJob.js";
import { assertDeleteCodeSecret } from "./lib/deleteCode.js";

const app = express();
const PORT = process.env.PORT || 4000;

// In dev, Vite falls back to a different port than 5173 whenever that one's
// still occupied (e.g. by a not-yet-released socket from a just-restarted
// server) — a single hardcoded origin breaks the instant that happens, since
// every request gets CORS-blocked even though the API server is responding
// fine. Any http://localhost:<port> origin is trusted when CLIENT_ORIGIN
// isn't set; CLIENT_ORIGIN (for a real deployment) still locks this down to
// one exact origin, unchanged from before.
const corsOrigin = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN
  : (origin, callback) => callback(null, !origin || /^http:\/\/localhost:\d+$/.test(origin));

// credentials: true is required for the internal dashboard's signed session
// cookie (src/lib/dashboardAuth.js) to be sent/received on cross-origin
// requests from the client dev server (5173) to this API (4000) — every
// other route in this app uses a Bearer token instead, which doesn't need
// this. Safe to enable broadly: corsOrigin above is never the literal "*"
// (it's either one exact CLIENT_ORIGIN or a callback that reflects one
// specific localhost origin per request), which is required for
// credentialed CORS to work at all.
app.use(cors({ origin: corsOrigin, credentials: true }));
// Raised from Express's 100kb default — to-let board photos travel as base64 JSON.
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/flats", flatsRouter);
app.use("/api/seeker-pins", seekerPinsRouter);
app.use("/api/areas", areasRouter);
app.use("/api/tolet-spots", toletSpotsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/superheroes", superheroesRouter);
app.use("/api/bus-routes", busRoutesRouter);
app.use("/api/pois", poisRouter);
app.use("/api/places", placesRouter);
app.use("/api/auth", authRouter);
app.use("/api/rent-reports", rentReportsRouter);
// Deliberately still under /api/internal/dashboard, not just /api/dashboard —
// the route is unguessable-by-convention on top of being password-gated (see
// routes/dashboard.js); nothing links to it from any public page, nav, or
// sitemap.
app.use("/api/internal/dashboard", dashboardRouter);

// Not under /api — this is the literal link a browser navigates to from the
// verification email (see lib/email.js), not a JSON endpoint the SPA calls.
app.use("/verify-listing", verifyListingRouter);
// Same reasoning — the literal link clicked from a weekly digest email
// (see lib/email.js, lib/digestJob.js).
app.use("/unsubscribe", unsubscribeRouter);

// A body over express.json's 10mb limit is rejected by the body parser
// before any route handler runs, so the photo limits in lib/photoLimits.js
// never get a chance to produce their own message — and Express's default
// handler answers with an HTML error page, which every fetch() in this app
// tries to res.json(). Same reasoning as the explicit multer error handling
// in routes/toletSpots.js: every error response in this API is JSON.
// Narrowly matched on body-parser's own error type so nothing else is
// swallowed, and registered after the routes so it only sees what they threw.
app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Those photos are too large — please add fewer, or smaller ones." });
  }
  next(err);
});

// Fail at boot, not at the first owner who tries to use their delete code.
// hashDeleteCode (lib/deleteCode.js) is keyed by DELETE_CODE_HMAC_SECRET and
// has no fallback value on purpose, so without it both issuing a code (at
// verification time) and checking one would throw mid-request. Exiting here
// means a deploy that forgot the env var fails its health check and the
// previous deploy keeps serving, rather than this one running half-broken.
try {
  assertDeleteCodeSecret();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

startExpiredListingsCleanup();
startDigestJob();
