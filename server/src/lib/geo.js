const EARTH_RADIUS_M = 6371000;

// Mirrors client/src/lib/mapConfig.js's CHITWAN_BOUNDS ([[27.45, 84.15],
// [27.8, 84.65]]) — that's the client's single source of truth for this
// district's extent; duplicated here in plain lat/lng min/max form since
// the server has no module path to the client's constant. Keep in sync if
// CHITWAN_BOUNDS ever changes.
const CHITWAN_LAT_MIN = 27.45;
const CHITWAN_LAT_MAX = 27.8;
const CHITWAN_LNG_MIN = 84.15;
const CHITWAN_LNG_MAX = 84.65;

export function isWithinChitwanBounds(lat, lng) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    lat >= CHITWAN_LAT_MIN &&
    lat <= CHITWAN_LAT_MAX &&
    lng >= CHITWAN_LNG_MIN &&
    lng <= CHITWAN_LNG_MAX
  );
}

export function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

// Local equirectangular projection around `lat` — accurate enough at district scale.
function toLocalMeters(lat, lng, originLat, originLng) {
  const x = (lng - originLng) * 111320 * Math.cos((originLat * Math.PI) / 180);
  const y = (lat - originLat) * 110540;
  return [x, y];
}

function pointToSegmentDistanceMeters(lat, lng, [lng1, lat1], [lng2, lat2]) {
  const [px, py] = toLocalMeters(lat, lng, lat, lng);
  const [ax, ay] = toLocalMeters(lat1, lng1, lat, lng);
  const [bx, by] = toLocalMeters(lat2, lng2, lat, lng);

  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;

  let t = lengthSq === 0 ? 0 : ((px - ax) * abx + (py - ay) * aby) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = ax + t * abx;
  const closestY = ay + t * aby;
  const dx = px - closestX;
  const dy = py - closestY;
  return Math.sqrt(dx * dx + dy * dy);
}

// routes: array of { geojson: { geometry: { coordinates: [[lng,lat], ...] } } }
export function isNearAnyRoute(lat, lng, routes, thresholdMeters = 600) {
  for (const route of routes) {
    const coords = route.geojson?.geometry?.coordinates ?? [];
    for (let i = 0; i < coords.length - 1; i++) {
      const dist = pointToSegmentDistanceMeters(lat, lng, coords[i], coords[i + 1]);
      if (dist <= thresholdMeters) return true;
    }
  }
  return false;
}
