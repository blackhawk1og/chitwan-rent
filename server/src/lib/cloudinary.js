// Shared Cloudinary client, configured once from server-only env vars — no
// client-side/public key here (unlike some Cloudinary setups that allow
// unsigned browser uploads), since every upload goes through this server's
// own requireAuth'd endpoint instead (see routes/toletSpots.js's
// POST /upload-photo). Currently used only for To-Let spot photos; flat
// listing photos still go through the older base64-in-Postgres path (see
// hooks/useAddFlatPhotos.js / ListFlatSuccessModal.jsx client-side) — that
// wasn't touched by this migration.
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
