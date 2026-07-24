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
import authRouter from "./routes/auth.js";
import rentReportsRouter from "./routes/rentReports.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
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
app.use("/api/auth", authRouter);
app.use("/api/rent-reports", rentReportsRouter);

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
