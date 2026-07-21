const EARTH_RADIUS_M = 6371000;

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
