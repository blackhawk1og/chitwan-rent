// Server-side limits for the base64 photo payloads that POST /api/flats and
// PATCH /api/flats/:id/photos accept (see routes/flats.js). Before this, the
// only cap on either was client-side — ListFlatSuccessModal.jsx's own
// remainingSlots arithmetic and an accept="image/*" file input — neither of
// which a request sent straight to the API has to respect. The PATCH route
// additionally did a silent `.slice(0, 6)`, so an over-limit submission was
// quietly truncated rather than refused.
//
// Only To-Let spot photos go to Cloudinary (routes/toletSpots.js, which has
// multer's own 10MB fileSize limit); flat photos still live as base64 text
// in Postgres, so these are the only limits standing between a scripted
// caller and an unbounded write into the flats table.

// Total photos a single listing may hold, counting what it already has.
export const MAX_PHOTOS = 6;

// Per-photo ceiling, measured on the DECODED bytes rather than the base64
// string, so the number means what it looks like it means.
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

// Per-request ceiling across all photos in one call. Lower than
// MAX_PHOTOS * MAX_PHOTO_BYTES on purpose: base64 inflates by 4/3, so six
// 2MB photos would be ~16MB of JSON body and express.json's 10mb limit
// (index.js) would abort the request mid-upload — the client would see a
// connection reset rather than any error message this module could produce.
// 7MB decoded is ~9.4MB encoded, which fits under that limit, so a request
// that passes validation can always physically arrive. Photos beyond this
// are added in a second call, which the client's incremental "+ Add photos"
// flow already does naturally.
export const MAX_REQUEST_PHOTO_BYTES = 7 * 1024 * 1024;

function toMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// Decoded byte count from the base64 payload alone, computed arithmetically
// rather than by allocating a Buffer — the whole point is to reject a huge
// string without first materializing it in memory.
//
// The data-URL prefix ("data:image/jpeg;base64,") is stripped first: counting
// it would both over-report the size and, worse, let a string that isn't
// base64 at all pass through the same arithmetic as though it were.
export function decodedBase64Bytes(dataUrl) {
  const comma = dataUrl.indexOf(",");
  const base64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(Math.floor((base64.length * 3) / 4) - padding, 0);
}

// Returns { ok: true } or { ok: false, error } with a message naming exactly
// which rule failed and which photo failed it — callers forward `error`
// straight into a 400 rather than truncating or partially accepting.
//
// `existingCount` is how many photos the listing already holds, so the total
// cap is enforced cumulatively across repeated calls instead of per request.
// A missing/null/empty photos value is valid: POST /api/flats always sends
// `photos: []` (see MapShell.jsx), and only the PATCH route requires a
// non-empty array — that check stays in the route, where the 400 message can
// stay specific to it.
export function validatePhotos(photos, { existingCount = 0 } = {}) {
  if (photos === undefined || photos === null) return { ok: true };
  if (!Array.isArray(photos)) {
    return { ok: false, error: "photos must be an array" };
  }
  if (existingCount + photos.length > MAX_PHOTOS) {
    const room = Math.max(MAX_PHOTOS - existingCount, 0);
    return {
      ok: false,
      error:
        room === 0
          ? `This listing already has the maximum of ${MAX_PHOTOS} photos.`
          : `A listing can have at most ${MAX_PHOTOS} photos — this one already has ${existingCount}, so you can add ${room} more.`,
    };
  }

  let totalBytes = 0;
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const label = `Photo ${i + 1}`;
    if (typeof photo !== "string" || photo.length === 0) {
      return { ok: false, error: `${label} is not a valid image.` };
    }
    // Required to locate the base64 payload for the size arithmetic above —
    // this is a shape check in service of the size limit, not a broader
    // content-type policy (an actual image-format check would mean decoding
    // and sniffing the bytes, which is a separate piece of work).
    if (!photo.startsWith("data:image/") || !photo.includes(",")) {
      return { ok: false, error: `${label} must be a base64 image data URL.` };
    }

    const bytes = decodedBase64Bytes(photo);
    if (bytes > MAX_PHOTO_BYTES) {
      return {
        ok: false,
        error: `${label} is ${toMb(bytes)} — each photo must be under ${toMb(MAX_PHOTO_BYTES)}.`,
      };
    }
    totalBytes += bytes;
  }

  if (totalBytes > MAX_REQUEST_PHOTO_BYTES) {
    return {
      ok: false,
      error: `Those photos total ${toMb(totalBytes)} — please add up to ${toMb(MAX_REQUEST_PHOTO_BYTES)} at a time.`,
    };
  }

  return { ok: true };
}
