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
import { startExpiredListingsCleanup } from "./lib/cleanupExpiredListings.js";
import { startDigestJob } from "./lib/digestJob.js";

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

app.use(cors({ origin: corsOrigin }));
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

// Not under /api — this is the literal link a browser navigates to from the
// verification email (see lib/email.js), not a JSON endpoint the SPA calls.
app.use("/verify-listing", verifyListingRouter);
// Same reasoning — the literal link clicked from a weekly digest email
// (see lib/email.js, lib/digestJob.js).
app.use("/unsubscribe", unsubscribeRouter);

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

startExpiredListingsCleanup();
startDigestJob();
