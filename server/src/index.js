import "dotenv/config";
import express from "express";
import cors from "cors";
import flatsRouter from "./routes/flats.js";
import seekerPinsRouter from "./routes/seekerPins.js";
import areasRouter from "./routes/areas.js";
import toletSpotsRouter from "./routes/toletSpots.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/flats", flatsRouter);
app.use("/api/seeker-pins", seekerPinsRouter);
app.use("/api/areas", areasRouter);
app.use("/api/tolet-spots", toletSpotsRouter);

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
