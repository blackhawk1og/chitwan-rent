export function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Returns the closest point (plus its distance in km) to (lat, lng), or null if none given.
export function findNearest(lat, lng, points) {
  if (!points.length) return null;
  let closest = points[0];
  let closestDist = Infinity;
  for (const p of points) {
    const dist = haversineMeters(lat, lng, Number(p.lat), Number(p.lng));
    if (dist < closestDist) {
      closestDist = dist;
      closest = p;
    }
  }
  return { point: closest, distanceKm: closestDist / 1000 };
}
